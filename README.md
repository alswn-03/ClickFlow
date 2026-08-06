# ClickFlow

실제 쇼핑몰 서비스가 아니라, 행동 로그 수집용 프로토타입

운영 DB 스키마

```bash
-- items 테이블 생성
CREATE TABLE IF NOT EXISTS items (
    id VARCHAR(255) PRIMARY KEY,
    item_name VARCHAR(255) NOT NULL,
    price INT NOT NULL,
    information TEXT,
    image_url VARCHAR(255)
);

-- users 테이블
CREATE TABLE IF NOT EXISTS users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    login_id VARCHAR(255) NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- transactions 테이블
CREATE TABLE IF NOT EXISTS transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    item_id VARCHAR(255) NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (item_id) REFERENCES items(id)
);
```

## Kafka (로컬)

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
