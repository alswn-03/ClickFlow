// S3 Consumer 실행 스크립트 (실행 진입점)

import "dotenv/config"; // .env 로드 (S3Client가 module-load 시점에 env를 읽으므로 최상단에서)

import { runS3Consumer } from "../consumers/s3Consumer.js";

runS3Consumer().catch((err) => {
  console.error("S3 Consumer failed:", err);
  process.exit(1);
});
