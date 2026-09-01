// 추천 엔진 Consumer 실행 스크립트 (실행 진입점)

import "dotenv/config"; // .env 로드 (필요 시 REDIS_URL 등 환경변수 사용 대비, 최상단에서)

import { runRecsysConsumer } from "../consumers/recsysConsumer.js";

runRecsysConsumer().catch((err) => {
  console.error("Recsys Consumer failed:", err);
  process.exit(1);
});
