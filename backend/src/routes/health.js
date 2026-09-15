import { Router } from "express";
import { pingDb } from "../db.js";
import { asyncHandler } from "../middleware/async-handler.js";
import { ok } from "../lib/respond.js";
import { config } from "../config.js";

export const healthRouter = Router();

let healthCache = { at: 0, ok: false, ms: 0 };

async function checkDb() {
  const now = Date.now();
  if (now - healthCache.at < config.healthCacheMs) {
    if (!healthCache.ok) throw new Error("database_down");
    return healthCache.ms;
  }
  try {
    const ms = await pingDb();
    healthCache = { at: Date.now(), ok: true, ms };
    return ms;
  } catch (error) {
    healthCache = { at: Date.now(), ok: false, ms: 0 };
    throw error;
  }
}

healthRouter.get(
  "/health",
  asyncHandler(async (_req, res) => {
    res.setHeader("Cache-Control", "no-store");
    try {
      const dbMs = await checkDb();
      ok(res, {
        status: "up",
        database: { status: "up", ms: dbMs },
      });
    } catch {
      res.status(503).json({
        ok: false,
        data: {
          status: "degraded",
          database: { status: "down", ms: null },
        },
        error: { code: "database_down", message: "Database is unreachable" },
      });
    }
  }),
);

healthRouter.get(
  "/ready",
  asyncHandler(async (_req, res) => {
    res.setHeader("Cache-Control", "no-store");
    const dbMs = await pingDb();
    ok(res, { status: "ready", dbMs });
  }),
);
