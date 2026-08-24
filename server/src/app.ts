import "dotenv/config";

import cors from "cors";
import express from "express";

import { errorHandler } from "./errorHandler.js";
import { router } from "./routes.js";

import { connectProducer } from "./kafka/producer.js";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.use("/api", router);

app.use(errorHandler);

await connectProducer(); // producer(인스턴스)와 Kafka 브로커를 (TCP) 연결

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
