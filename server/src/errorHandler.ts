import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";

export const errorHandler: ErrorRequestHandler = (err, _req, res, next) => {
  if (res.headersSent) {
    next(err);
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({ success: false, error: err.issues });
    return;
  }

  console.error(err);
  res.status(500).json({ success: false, error: "Internal server error" });
};
