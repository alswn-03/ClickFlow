# ClickFlow - 사용자 행동 로그 데이터 기반의 준실시간 추천 파이프라인

이커머스 환경에서 사용자 행동 이벤트(view, addtocart, transaction)를 실시간으로 수집하고, Kafka를 중심으로 데이터를 안정적으로 전달하여 ML 모델을 재학습하고 준실시간 추천을 제공하는 데이터 파이프라인입니다.

본 프로젝트는 추천 모델의 성능보다 **파이프라인의 안정성과 운영 가능성**에 집중합니다. 사용자가 상품을 클릭하는 순간 이벤트가 Kafka로 발행되고, 이 데이터는 S3(ML 학습용 데이터 레이크)와 추천 엔진 두 곳으로 독립적으로 전달됩니다. S3에 쌓인 데이터는 매일 새벽 배치 스케줄러를 통해 협업 필터링(ALS) 모델을 재학습하는 데 사용되며, 재학습된 모델은 성능 비교 후 Inference Server에 교체됩니다. 추천 결과는 Redis에 캐싱되어 준실시간으로 사용자에게 반환됩니다.

---

## Kafka 도입 근거

처리량이 아닌 **구조적 요구사항** 때문에 Kafka를 선택했습니다.

S3(ML 학습용)와 추천 엔진, 두 Consumer가 동일한 이벤트를 각자 다른 속도로 독립적으로 소비해야 합니다. 메시지 소비 후 삭제되는 RabbitMQ나 직접 구현 시 복잡도가 높아지는 Redis Streams보다 Kafka의 Consumer Group 모델이 이 요구사항에 가장 적합하다고 판단했습니다.

---

## 아키텍처

```
사용자 행동 이벤트 (view / addtocart / transaction)
        ↓
   Web Server (Express)
        ↓
      Kafka
    ↙       ↘
S3 Consumer   DB Consumer
    ↓               ↓
  S3 (Data Lake)   RDS (MySQL)
    ↓
재학습 (cron, 매일 새벽)
    ↓
Inference Server ↔ Redis
    ↓
추천 결과 반환
```

---

## 검증 시나리오

파이프라인 구축 이후 실제 운영 환경에서 발생할 수 있는 장애 상황을 직접 재현하고 방어하는 시나리오를 검증합니다.

| 시나리오   | 내용                                                                       |
| ---------- | -------------------------------------------------------------------------- |
| 시나리오 0 | ML 모델 재학습 및 성능 비교 후 수동 교체                                   |
| 시나리오 1 | Kafka 병렬 처리 중 Ordering Issue 재현 → user_id 기반 Partition Key로 해결 |
| 시나리오 2 | Consumer 장애 복구 (Kafka Offset 기반, 데이터 유실 0건 증명)               |
| 시나리오 3 | 트래픽 폭주 시 파이프라인 안정성 검증 (여유 시)                            |

---

## 기술 스택

| 구분          | 기술                        |
| ------------- | --------------------------- |
| API 서버      | Node.js (Express)           |
| 메시지 브로커 | Apache Kafka                |
| 데이터 레이크 | AWS S3                      |
| 운영 DB       | AWS RDS (MySQL)             |
| 캐시          | Redis                       |
| 추천 모델     | 협업 필터링 (ALS)           |
| 인프라        | AWS EC2                     |
| 학습 데이터   | Retail Rocket 공개 데이터셋 |

---

## 진행 계획

| 기간 | 내용                                       |
| ---- | ------------------------------------------ |
| 6월  | DB 정비 및 사전 작업                       |
| 7월  | Kafka 로컬 세팅, API 연결, 초기 모델 학습  |
| 8월  | Consumer 구현, AWS 배포                    |
| 9월  | Inference Server, 재학습 자동화, 모델 교체 |
| 10월 | 시나리오 1, 2 검증, 모니터링 세팅          |
| 11월 | 마무리, 발표 준비                          |

---

## 데이터

- **초기 학습용** : Retail Rocket 공개 데이터셋 (view / addtocart / transaction 이벤트 구조 동일)
- **재학습용** : nGrinder로 파이프라인에 쌓인 실제 이벤트 데이터
- 별도 데이터 생성기는 구현하지 않음

---

## Repository

- 프로젝트 기록: https://github.com/alswn-03/capstone-record
- Web 프로토타입: https://github.com/alswn-03/ClickFlow
- ERD: https://github.com/alswn-03/clickflow-data-erd
