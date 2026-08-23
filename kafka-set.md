# Event Schema

이벤트는 두 개의 라우트로 분리되어 처리된다.

`/api/transaction`은 MySQL INSERT가 필요한 핵심 비즈니스 로직(구매)을 다루고, `/api/log`는 DB 저장 없이 파일 로그로 적재되는 범용 분석 이벤트(view, addtocart)를 다룬다.

두 라우트 모두 `event_time`은 서버가 요청을 받아 핸들러를 실행하는 시점에 `new Date().toISOString()`으로 직접 채운다. (현재는 Kafka 연동 전 단계로, `fs.appendFileSync`를 통해 로컬 로그 파일에 적재하고 있다.)

#### 1. /api/log — 공용 분석 이벤트 (view, addtocart)

```json
{
  "event_type": "view | addtocart",
  "user_id": "string",
  "item_id": "string",
  "event_time": "ISO 8601 string, 서버 생성"
}
```

#### 2. /api/transaction — 구매 이벤트 (MySQL INSERT + 로그 append, 단일 요청)

```json
{
  "event_type": "transaction",
  "user_id": "string",
  "item_id": "string",
  "transaction_id": "string (MySQL Transaction.id)",
  "event_time": "string (ISO 8601, 서버 생성)"
}
```

### Future Work

이중쓰기 정합성(dual-write consistency) 문제:
/api/transaction에서 MySQL INSERT와 이벤트 로그 append가 하나의 트랜잭션으로 묶여있지 않음
둘 중 하나만 성공할 경우(예: DB는 커밋됐는데 로그 파일 쓰기 실패) 데이터 불일치 발생 가능.

---

# Kafka (로컬)

`kafka-clickflow-local/docker-compose.yml` 기준 KRaft 단일 브로커 구성.

1. 브로커 기동

   ```bash
   cd kafka-clickflow-local
   docker compose up -d
   ```

2. `user-events` 토픽 생성 (최초 1회, 브로커가 완전히 뜬 뒤에 실행)
   ```bash
   docker exec -it kafka kafka-topics \
     --create \
     --topic user-events \
     --bootstrap-server localhost:9092 \
     --partitions 3 \
     --replication-factor 1
   ```

### 파티션 수를 3개로 정한 이유

- 컨슈머 그룹이 S3 적재용 1개, 추천 엔진용 1개로 각 그룹의 인스턴스가 1대씩이라 병렬 처리 필요성은 아직 낮음
- 대신 파티션 키로 순서 보장 여부를 실험해볼 목적이 큼 → 파티션이 1개면 항상 순서가 보장되는지 확인 불가
- 파티션은 늘리는 것만 가능하고 줄이는 건 불가능해서, 나중에 nGrinder 부하 테스트로 파티션 수 늘려가며 처리량을 비교할 여지를 남겨두고 우선 3개로 시작

### 파티션 키 설계 (예정)

- Kafka는 파티션 내부에서만 메시지 순서를 보장하므로, 한 유저의 `view → cart → purchase` 이벤트 순서를 지키려면 `user_id`를 파티션 키로 사용해야 함
- 지금(브로커 세팅) 단계에서는 파티션 개수만 확정하고, 실제 키 적용은 Express API의 Kafka 프로듀서 코드 작성 시 구현 예정
  ```js
  producer.send({
    topic: "user-events",
    messages: [
      { key: userId, value: JSON.stringify(eventData) }, // key가 파티션 결정
    ],
  });
  ```

### Kafka UI (메시지/클러스터 상태 확인용)

토픽·파티션·컨슈머 그룹 상태를 GUI로 확인하기 위해 `docker-compose.yml`에 `kafka-ui`(provectuslabs/kafka-ui) 서비스를 추가로 구성.

```bash
docker compose up -d kafka-ui
```

`http://localhost:8080` 접속 후 `clickflow-local` 클러스터에서 토픽/파티션/컨슈머 상태 확인 가능.

#### 리스너를 3개로 분리한 이유

최초 구성에서는 `PLAINTEXT` 리스너 하나로 `localhost:9092`만 광고(advertise)하도록 했는데, 이 경우 `kafka-ui`처럼 **별도 컨테이너에서 브로커에 접속하는 상황**에서 연결이 계속 실패했다. `localhost`가 브로커 자신이 아니라 접속을 시도하는 컨테이너(kafka-ui) 자기 자신을 가리키기 때문. 이를 해결하기 위해 리스너를 용도별로 분리함.

```yaml
KAFKA_LISTENERS: PLAINTEXT://0.0.0.0:29092,PLAINTEXT_HOST://0.0.0.0:9092,CONTROLLER://0.0.0.0:9093
KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka:29092,PLAINTEXT_HOST://localhost:9092
```

| 리스너 이름    | 포트  | 용도                           | 광고 주소        |
| -------------- | ----- | ------------------------------ | ---------------- |
| PLAINTEXT      | 29092 | 컨테이너 간 통신 (kafka-ui 등) | `kafka:29092`    |
| PLAINTEXT_HOST | 9092  | 호스트(로컬 PC)에서 접속       | `localhost:9092` |
| CONTROLLER     | 9093  | KRaft 내부 통신 전용           | 광고 안 함       |

`kafka-ui`의 `KAFKA_CLUSTERS_0_BOOTSTRAPSERVERS`는 컨테이너 간 통신이므로 `kafka:29092`를 사용.

> 리스너 등 브로커 환경변수를 변경한 경우, 기존 데이터 볼륨에 남은 메타데이터와 충돌(`DuplicateBrokerRegistrationException`)이 발생할 수 있어 `docker compose down -v`로 볼륨까지 초기화 후 재기동해야 함.

### 현재 상태

| 항목                                                  | 상태                                             |
| ----------------------------------------------------- | ------------------------------------------------ |
| Kafka 브로커 (KRaft, combined mode)                   | 실행 중 (버전 3.6-IV2, 브로커 1대)               |
| 리스너 구성 (PLAINTEXT / PLAINTEXT_HOST / CONTROLLER) | 분리 적용 완료                                   |
| Kafka UI ↔ 브로커 연결                                | 정상 (Online, `clickflow-local` 클러스터 인식됨) |
| `user-events` 토픽                                    | 재생성 완료 (파티션 3, replication factor 1)     |
| 파티션 키(user_id) 적용                               | 미착수 — Express 프로듀서 구현 시 적용 예정      |

다음 단계: Express API에 Kafka 프로듀서 연동, S3 적재용 컨슈머 및 추천 엔진용 컨슈머 구현.
