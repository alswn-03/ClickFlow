# ClickFlow - 시스템 아키텍처

## 전체 구조

```
사용자 행동 이벤트 (view / addtocart / transaction)
        ↓
   Web Server (Express)
        ↓
      Kafka (user-events 토픽)
    ↙                              ↘
S3 Consumer                 추천 엔진 Consumer
    ↓                                    ↓
S3 (Data Lake)              Redis (recent_activity:{user_id})
    ↓
재학습 (cron, 매일 새벽)
    ↓
Inference Server ↔ Redis (recommendation:{user_id})
    ↓
추천 결과 반환
```

---

## Kafka 도입 근거

처리량이 아닌 **구조적 요구사항** 때문에 Kafka를 선택했다.

S3(ML 학습용)와 추천 엔진, 두 Consumer가 동일한 이벤트를 각자 다른 속도로 독립적으로 소비해야 한다. RabbitMQ는 Offset이 없어 장애 복구가 복잡하고, Redis Streams는 직접 구현 시 복잡도가 높아진다. Kafka의 Consumer Group 모델이 이 요구사항에 가장 적합하다고 판단했다.

---

## 컴포넌트 상세

### 1. Web Server (Express)

- view / addtocart / transaction 이벤트를 받아 Kafka로 발행 (Producer)
- `user_id`를 파티션 키로 사용 (시나리오 1 - Ordering Issue 대응)
- `transaction` 이벤트의 경우 구매 이력을 RDS에 직접 INSERT (Kafka를 거치지 않음, 운영 DB 성격)

### 2. Kafka

- 토픽: `user-events`
- KRaft 모드 (Zookeeper 미사용)
- 파티션 3개

### 3. S3 Consumer

- Consumer Group: `s3-consumer-group`
- `user-events` 토픽 구독
- 원본 이벤트를 S3(Data Lake)에 영구 저장
- 용도: ML 재학습용 원본 데이터 보존

### 4. 추천 엔진 Consumer (Speed Layer)

- Consumer Group: `recsys-consumer-group`
- `user-events` 토픽 구독 (S3 Consumer와 독립적으로 소비)
- 유저의 최근 행동을 Redis에 실시간 기록 (`recent_activity:{user_id}`)
- 1단계에서는 데이터 적재까지만 구현, 실제 재랭킹 반영은 2단계(개인 목표)에서 진행

### 5. 재학습 파이프라인 (Batch Layer)

- cron 기반, 매일 새벽 실행
- S3에 쌓인 데이터로 협업 필터링(ALS) 모델 재학습
- 재학습 전/후 성능 비교 → 개선 확인 시 Inference Server에 수동 교체
- 유저별 추천 후보(Top-N)를 미리 계산해 Redis에 저장 (`recommendation:{user_id}`)

### 6. Redis

| Key 패턴                    | 생성 주체                        | 용도                                   |
| --------------------------- | -------------------------------- | -------------------------------------- |
| `recommendation:{user_id}`  | 배치 재학습 (Batch Layer)        | 서빙 시 즉시 조회되는 완성된 추천 결과 |
| `recent_activity:{user_id}` | 추천 엔진 Consumer (Speed Layer) | 최근 행동 이력 (향후 재랭킹 입력값)    |

### 7. Inference Server

- 사용자 요청 시 Redis에서 `recommendation:{user_id}` 조회 후 즉시 반환
- 요청마다 모델을 다시 계산하지 않음 (무거운 연산은 배치 단계에서 완료)

### 8. RDS (MySQL)

- 운영 DB. 구매 이력(transaction) 등 비즈니스 데이터를 API 서버가 직접 저장
- Kafka를 거치지 않음 (이벤트 스트리밍과 별개의 목적)

---

## 준실시간 추천 전략 (Lambda Architecture)

무거운 연산(모델 재학습, 후보 생성)은 배치로 미리 계산하고, 가벼운 연산(최근 행동 기록)만 실시간으로 처리하는 구조를 채택했다.

```
[Batch Layer] 무겁고 정확함, 느림 (최대 24시간 반영)
  - 협업 필터링(ALS) 재학습
  - Top-N 추천 후보 계산

[Speed Layer] 가볍고 즉시 반영됨 (1단계: 적재만 / 2단계: 재랭킹 반영)
  - 최근 행동 기록
  - (2단계) 배치 결과 + 최근 행동을 조합한 경량 재랭킹
```

이는 Netflix, 쿠팡 등 실제 서비스에서 사용하는 패턴으로, 완전 실시간 처리(이벤트마다 전체 재계산)가 요구하는 분산 시스템 복잡도(순서 보장, 상태 관리, race condition 등)를 피하면서도 반영 지연을 개선할 수 있는 구조다.

---

## 채택하지 않은 컴포넌트와 이유

| 컴포넌트            | 제외 이유                                                                                                   |
| ------------------- | ----------------------------------------------------------------------------------------------------------- |
| DW (Data Warehouse) | ML 재학습 용도로만 데이터를 활용하므로 S3에서 바로 학습. 비즈니스 분석 요구사항이 생기면 그때 추가          |
| Flink               | 협업 필터링은 실시간 피처 계산이 불필요. Speed Layer는 Kafka Consumer + Redis로 충분                        |
| Feature Store       | 현재 모델(ALS)이 실시간 피처를 소비하는 구조가 아님. 세션 기반/딥러닝 모델로 교체하는 시점에 함께 도입 검토 |
| Model Registry      | 단일 모델을 재학습 후 성능 비교하여 수동 교체하는 구조라 불필요                                             |
| Spark               | 데이터 규모가 작아 당장 불필요 (명확한 오버엔지니어링으로 판단)                                             |
