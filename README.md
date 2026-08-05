# ClickFlow
실제 쇼핑몰 서비스가 아니라,  행동 로그 수집용 프로토타입

운영 DB 스키마
``` bash
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