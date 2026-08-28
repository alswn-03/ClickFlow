// Kafka 인스턴스 자체만 export하고, producer/consumer는 거기서 가져다 쓰는 구조로 리팩토링

import { Kafka } from "kafkajs";

// Kafka 클라이언트 생성
export const kafka = new Kafka({
  clientId: "clickflow-api", // Kafka 브로커가 '이 요청이 어디서 온거지?'를 구분하기 위해 사용하는 이름표
  brokers: ["localhost:9092"], // 실제 연결 - Kafka 브로커의 주소
});
