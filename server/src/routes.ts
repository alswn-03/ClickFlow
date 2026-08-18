import fs from "node:fs";
import { Router } from "express";
import { z } from "zod";
import { LOG_FILE_PATH } from "./paths.js";
import { prisma } from "./prismaClient.js";

export const router: Router = Router();

// --- GET /api/items ---
router.get("/items", async (_req, res) => {
  const items = await prisma.item.findMany();
  res.status(200).json(items);
});

// --- POST /api/login ---
const loginSchema = z.object({
  user_id: z.string().min(1, "User ID is required"),
});

router.post("/login", async (req, res, next) => {
  try {
    const { user_id } = loginSchema.parse(req.body);

    await prisma.user.upsert({
      where: { id: user_id },
      create: { id: user_id },
      update: {},
    });

    res.status(200).json({ success: true, user_id });
  } catch (err) {
    next(err);
  }
});

// --- POST /api/transaction (core purchase write; also emits the corresponding event log entry) ---
const transactionSchema = z.object({
  user_id: z.string().min(1),
  item_id: z.string().min(1),
});

router.post("/transaction", async (req, res, next) => {
  try {
    const { user_id, item_id } = transactionSchema.parse(req.body);

    const transaction = await prisma.transaction.create({
      data: { user_id, item_id },
    });
    const transactionId = String(transaction.id);

    const logData = {
      event_type: "transaction",
      user_id,
      item_id,
      transaction_id: transactionId,
      event_time: new Date().toISOString(), //✍️ 이벤트의 timestamp : 서버가 요청을 받아 핸들러를 실행하는 시점
    };
    fs.appendFileSync(LOG_FILE_PATH, JSON.stringify(logData) + "\n");

    res.status(200).json({ success: true, transaction_id: transactionId });
  } catch (err) {
    next(err);
  }
});

// --- POST /api/log (generic, best-effort analytics event log; not stored in the DB) ---
const logEventSchema = z.looseObject({
  event_type: z.string(),
  user_id: z.string(),
  item_id: z.string(),
});

router.post("/log", (req, res, next) => {
  try {
    const event = logEventSchema.parse(req.body);
    const logData = { ...event, event_time: new Date().toISOString() }; //✍️ 이벤트의 timestamp : 서버가 요청을 받아 핸들러를 실행하는 시점

    fs.appendFileSync(LOG_FILE_PATH, JSON.stringify(logData) + "\n");

    res.status(200).json({ success: true });
  } catch (err) {
    next(err);
  }
});
