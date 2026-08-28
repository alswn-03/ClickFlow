// import { Kafka } from "kafkajs";

// // Kafka 클라이언트 생성
// const kafka = new Kafka({
//   clientId: "clickflow-api", // Kafka 브로커가 '이 요청이 어디서 온거지?'를 구분하기 위해 사용하는 이름표
//   brokers: ["localhost:9092"], // 실제 연결 - Kafka 브로커의 주소
// });

import { kafka } from "./client.js";

// producer(인스턴스) 생성 + kafka 브로커와 연결
const producer = kafka.producer();

export async function connectProducer() {
  await producer.connect(); // producer(인스턴스)를 실제 kafka 브로커와 (TCP) 연결
}

// 메시지 발생 : 이벤트를 Kafka 브로커에 publish(전송)하는 함수
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
