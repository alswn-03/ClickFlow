/* 
⭐️ Kafka 브로커 ↔ Redis : Kafka consumer를 통해 수신한 이벤트를 Redis에 기록하는 로직
- `recsysConsumer.ts` : Kafka 브로커와 Redis 사이를 잇는 다리 역할 (Speed Layer)
- 유저의 최근 행동(item_id 최근 5개)을 recent_activity:{user_id}에 실시간 기록
*/

import { createKafkaClient } from "../client.js";
// import { Kafka } from "kafkajs";

import { Redis } from "ioredis";

// 0.0 Kafka 클라이언트 생성
const kafka = createKafkaClient("clickflow-recsys-consumer");

// 0.1 consumer(인스턴스) 생성
const consumer = kafka.consumer({ groupId: "recsys-consumer-group" });

// ========== ✅ 통신 1: Redis와의 통신 ==========
const redis = new Redis(); // localhost:6379

const MAX_RECENT = 5; // recent_activity에 유지할 최근 item_id 개수

// ========== ✅ Consumer 실행 함수 - 통신 2: Kafka 브로커와의 통신 (TCP 연결) ==========
export async function runRecsysConsumer() {
  await consumer.connect();
  await consumer.subscribe({ topic: "user-events", fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ message }) => {
      const event = JSON.parse(message.value!.toString());
      const key = `recent_activity:${event.user_id}`;

      // LPUSH로 최신 item_id를 리스트 맨 앞에 추가, LTRIM으로 5개까지만 유지 (원자적 실행)
      await redis
        .multi()
        .lpush(key, event.item_id)
        .ltrim(key, 0, MAX_RECENT - 1)
        .exec();

      console.log(
        `[RecsysConsumer] ${event.user_id} <- ${event.event_type}:${event.item_id}`,
      );
    },
  });
}

// ========== ✅ 프로세스 종료 핸들러 ==========
process.on("SIGTERM", async () => {
  await consumer.disconnect();
  redis.disconnect();
});
process.on("SIGINT", async () => {
  await consumer.disconnect();
  redis.disconnect();
});
