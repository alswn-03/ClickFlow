/* 
⭐️ Express 서버 ↔ Kafka 브로커 : Kafka producer를 통해 발생한 이벤트를 Kafka 브로커에 publish하는 로직
*/

import { createKafkaClient } from "./client.js";
// import { Kafka } from "kafkajs";

// 0.0 Kafka 클라이언트 생성
const kafka = createKafkaClient("clickflow-producer");
// export const kafka = new Kafka({
//   clientId: "clickflow-producer", // Kafka 브로커가 '이 요청이 어디서 온거지?'를 구분하기 위해 사용하는 이름표
//   brokers: ["localhost:9092"], // 실제 연결 - Kafka 브로커의 주소
// });

// 0.1 producer(인스턴스) 생성
const producer = kafka.producer();

// 1. Express 서버(app.ts) -> producer.ts : connectProducer() 호출
//    producer(인스턴스) -> Kafka 브로커 : (TCP) 연결
export async function connectProducer() {
  await producer.connect(); // producer(인스턴스)를 실제 kafka 브로커와 (TCP) 연결
}

// 📩 2. Express 서버(routes.ts) -> producer.ts : publishEvent() 호출
//    producer(인스턴스) -> Kafka 브로커 : 메시지 발행(publish)
export async function publishEvent(event: Record<string, unknown>) {
  await producer.send({
    topic: "user-events",
    acks: -1,
    messages: [
      {
        key: String(event.user_id),
        value: JSON.stringify(event),
      },
    ],
  });
}
