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

// --- POST /api/transaction ---
const transactionSchema = z.object({
  user_id: z.string().min(1),
  item_id: z.string().min(1),
});

router.post("/transaction", async (req, res, next) => {
  try {
    const { user_id, item_id } = transactionSchema.parse(req.body);

    await prisma.transaction.create({
      data: { user_id, item_id },
    });

    res.status(200).json({ success: true });
  } catch (err) {
    next(err);
  }
});

// --- POST /api/log (file-based event log, not stored in the DB) ---
const logEventSchema = z.looseObject({
  event_type: z.string(),
  user_id: z.string(),
  item_id: z.string().optional(),
});

router.post("/log", (req, res, next) => {
  try {
    const event = logEventSchema.parse(req.body);
    const logData = { ...event, event_time: new Date().toISOString() };

    fs.appendFileSync(LOG_FILE_PATH, JSON.stringify(logData) + "\n");

    res.status(200).json({ success: true });
  } catch (err) {
    next(err);
  }
});
