// send-ordered-events.ts
import "dotenv/config";
import { Kafka, Partitioners } from "kafkajs";

export async function sendOrderedEvents({
  userId,
  useKey,
  count,
}: {
  userId: string;
  useKey: boolean;
  count: number;
}) {
  const kafka = new Kafka({
    clientId: "partition-order-test",
    brokers: [process.env.KAFKA_BROKER ?? "localhost:9092"], // 기존 producer.ts 설정에 맞추기
  });
  const producer = kafka.producer({
    createPartitioner: Partitioners.DefaultPartitioner,
  });
  await producer.connect();

  console.log(
    `\n[${useKey ? "WITH KEY" : "WITHOUT KEY"}] user_id=${userId}, count=${count}`,
  );
  const partitionCount: Record<number, number> = {};

  for (let seq = 1; seq <= count; seq++) {
    const event = {
      event_type: "view_detail",
      user_id: userId,
      item_id: `seq_${seq}`,
      seq,
      event_time: new Date().toISOString(),
    };
    const [meta] = await producer.send({
      topic: "user-events",
      acks: -1,
      messages: [
        { ...(useKey ? { key: userId } : {}), value: JSON.stringify(event) },
      ],
    });
    if (!meta) throw new Error("producer.send()가 메타데이터를 반환하지 않았습니다");
    partitionCount[meta.partition] = (partitionCount[meta.partition] ?? 0) + 1;
    if (count <= 10)
      console.log(
        `seq=${seq} → partition ${meta.partition}, offset ${meta.baseOffset}`,
      );
  }

  console.log("파티션별 건수:", partitionCount);
  await producer.disconnect();
}
