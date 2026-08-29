/* 
⭐️ Kafka 브로커 ↔ AWS S3 : Kafka consumer를 통해 수신한 이벤트를 AWS S3에 저장하는 로직
- `s3Consumer.ts` : Kafka 브로커와 AWS S3 사이를 잇는 다리 역할
- 즉, Kafka 에서 받은 걸 그대로 S3로 옮겨 적재하는 ‘순수 파이프 역할’
*/

import { createKafkaClient } from "../client.js";
// import { Kafka } from "kafkajs";

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";

// 0.0 Kafka 클라이언트 생성
const kafka = createKafkaClient("clickflow-s3-consumer");
// export const kafka = new Kafka({
//   clientId: "clickflow-s3-consumer", // Kafka 브로커가 '이 요청이 어디서 온거지?'를 구분하기 위해 사용하는 이름표
//   brokers: ["localhost:9092"], // 실제 연결 - Kafka 브로커의 주소
// });

// 0.1 consumer(인스턴스) 생성
const consumer = kafka.consumer({ groupId: "s3-consumer-group" });

// ========== ✅ 통신 1: AWS S3와의 통신 (HTTPS API 호출) ==========
// Kafka consumer.ts -> AWS S3

// 1.1 AWS S3 클라이언트 생성
// 인터넷을 통해 AWS의 S3 REST API 서버에 HTTPS 요청을 보내는 클라이언트
const s3 = new S3Client({ region: process.env.AWS_REGION });
const BUCKET = process.env.S3_BUCKET_NAME!;

// 1.2 배치 버퍼링
// Kafka처럼 계속 연결을 유지하는 게 아니라,
// flush() 함수 가 호출될 때마다 그때그때 "이 파일 저장해줘"라는 요청 하나를 AWS S3로 보내고 응답을 받는 방식입니다(REST API 스타일)

// 1.2.1 배치 버퍼링 변수

// 배치 버퍼링 : 두 조건(개수 50개 또는 시간 5초) 중 먼저 도달하는 쪽으로 flush한다
const BATCH_SIZE = 50; // 버퍼링된 이벤트를 S3에 flush하는 조건(이벤트 개수)
const FLUSH_INTERVAL_MS = 5000; // 버퍼링된 이벤트를 S3에 flush하는 조건(시간 간격)

// Kafka에서 받은 메시지(문자열)를 임시로 쌓아두는 배열 : 메모리에만 존재하고, flush되면 비워짐
let buffer: string[] = [];

// 이벤트의 event_time을 기준으로 S3에 저장할 경로를 생성하는 함수
function datePrefix(eventTime: string) {
  return eventTime.slice(0, 10); // YYYY-MM-DD
}

// flush 함수 : 버퍼링된 이벤트를 S3에 flush하는 함수
async function flush() {
  // 🐞 5초가 지나고 나서도 버퍼가 비어있으면, flush할 필요 없음 -> S3에 빈 파일 생성시키지 않기 위해
  if (buffer.length === 0) return;

  // 🐞 동시성 버그 방지 패턴
  const batch = buffer;
  buffer = []; // flush 후 버퍼 초기화
  /* buffer를 바로 순회하면서 동시에 새 메시지가 push되면 레이스 컨디션이 생길 수 있어서, 
    현재 buffer 참조를 batch라는 별도 변수로 옮겨두고, buffer 자체는 즉시 새 빈 배열로 교체합니다. 
    이러면 flush 처리 중에 새로 들어오는 이벤트가 누락되지 않고, 다음 flush 때 처리됩니다. */

  // 이벤트를 날짜별로 그룹핑
  const grouped: Record<string, string[]> = {};
  for (const line of batch) {
    const event = JSON.parse(line); // buffer에 문자열로 저장해뒀던 걸 다시 객체로 변환
    const prefix = datePrefix(event.event_time); // 리턴값 : YYYY-MM-DD

    // 이 prefix(날짜)로 처음 들어온 이벤트면 빈 배열을 먼저 만들어 둔다
    if (grouped[prefix] === undefined) {
      grouped[prefix] = [];
    }
    grouped[prefix].push(line);
  }

  // 그룹핑 한 날짜별로 S3에 flush
  for (const [date, lines] of Object.entries(grouped)) {
    // {키, 값} 객체 -> [키, 값] 쌍의 배열 로 변환

    // S3에 저장될 파일 경로
    const key = `raw/events/${date}/${Date.now()}-${randomUUID()}.jsonl`;

    // AWS SDK의 S3Client.send() 메서드 사용 : AWS S3 REST API 서버에 HTTPS 요청을 보내서 파일을 저장
    await s3.send(
      new PutObjectCommand({
        // AWS SDK - S3 : 객체(파일) 하나 저장/업로드
        Bucket: BUCKET,
        Key: key,
        Body: lines.join("\n"), // 'JSON Lines 포맷'으로 설정 : 각 줄마다 JSON 객체가 들어있는 텍스트 파일
        ContentType: "application/x-ndjson", // 저장되는 파일의 MIME 타입 메타데이터
      }),
    );
    console.log(
      `[S3Consumer] flushed ${lines.length} events -> s3://${BUCKET}/${key}`,
    );
  }
}

// ========== ✅ 실행 : flush()를 주기적(5초)으로 호출 ==========
setInterval(() => {
  flush().catch(console.error);
}, FLUSH_INTERVAL_MS);

// ========== ✅ Consumer 실행 함수 - 통신 2: Kafka 브로커와의 통신 (TCP 연결) ==========
// Kafka 브로커 -> Kafka consumer.ts
export async function runS3Consumer() {
  // Kafka 브로커에 실제 TCP 연결
  await consumer.connect(); // await 설명 : 네트워크 작업이라 즉시 끝나지 않는 비동기 함수라서, 연결이 실제로 완료될 때까지 기다렸다가 다음 줄로 넘어가야 함

  // "이 Consumer는 user-events 토픽을 구독한다"고 브로커에 등록
  await consumer.subscribe({ topic: "user-events", fromBeginning: false });

  await consumer.run({
    // 에러가 나거나 명시적으로 멈추지 않는 한 내부의 'eachMessage 콜백(Kafka 브로커에서 메시지를 수신)'을 계속 호출
    eachMessage: async ({ message }) => {
      buffer.push(message.value!.toString());
      if (buffer.length >= BATCH_SIZE) await flush();
    },
  });
}

// ========== ✅ 프로세스 종료 핸들러 ==========
// process.on(신호명, 콜백): Node.js 프로세스가 특정 신호를 받을 때 실행할 핸들러를 등록

// SIGTERM, SIGINT 시 flush 후 consumer disconnect
process.on("SIGTERM", async () => {
  // SIGINT: 터미널에서 Ctrl+C를 눌렀을 때 보내지는 신호
  await flush();
  await consumer.disconnect();
});
process.on("SIGINT", async () => {
  // SIGTERM: OS나 Docker, pm2 같은 프로세스 매니저가 "정상 종료해줘"라고 보내는 신호(docker stop이 기본적으로 이걸 보냅니다)
  await flush();
  await consumer.disconnect();
});

/*
- 종료 핸들러에서 flush가 왜 필요한가? -> buffer에 아직 flush 안 된 이벤트가 남아있는데 프로세스가 그냥 죽어버리면 그 이벤트들은 S3에 못 가고 유실된다.
    종료 신호를 가로채서 "죽기 전에 마지막으로 flush 한 번 하고, Kafka 연결도 정리하고 죽자"는 것 (Graceful Shutdown 패턴)
- 🐞 다만 flush 자체가 실패하면(S3 네트워크 오류 등) 여전히 유실 가능성은 남는다.
    완전 무손실을 보장하려면 buffer를 로컬 디스크에도 백업(WAL, Write-Ahead Log)해야 하는데, 이건 이 프로젝트 스코프에서 오버엔지니어링이라 지금은 구현하지 않음.
*/
