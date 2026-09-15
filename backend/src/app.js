import compression from "compression";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { config } from "./config.js";
import { requireApiKey } from "./middleware/auth.js";
import { errorHandler, notFoundHandler } from "./middleware/error.js";
import { rateLimit } from "./middleware/rate-limit.js";
import { healthRouter } from "./routes/health.js";
import { configRouter } from "./routes/config.js";
import { locksRouter } from "./routes/locks.js";
import { streamsRouter } from "./routes/streams.js";
import { campaignsRouter } from "./routes/campaigns.js";
import { escrowRouter } from "./routes/escrow.js";
import { poolsRouter } from "./routes/pools.js";
import { keysRouter } from "./routes/keys.js";
import { docsUsersRouter } from "./routes/docs-users.js";
import { statsRouter } from "./routes/stats.js";
import { mountSwagger } from "./swagger.js";
import { invalidateCache } from "./lib/ttl-cache.js";

function requestHosts(req) {
  const hosts = new Set();
  for (const raw of [req.get("x-forwarded-host"), req.get("host")]) {
    if (!raw) continue;
    hosts.add(raw.split(",")[0].trim().toLowerCase());
  }
  return hosts;
}

function isOwnOrigin(req, origin) {
  try {
    return requestHosts(req).has(new URL(origin).host.toLowerCase());
  } catch {
    return false;
  }
}

function corsOrigin(req, callback) {
  const origin = req.get("origin");
  if (!origin) return callback(null, true);
  const path = req.path || "";
  if (path === "/health" || path === "/ready" || path.startsWith("/docs")) {
    return callback(null, true);
  }
  const allowed = config.corsOrigins;
  if (allowed.includes("*") || allowed.includes(origin) || isOwnOrigin(req, origin)) {
    return callback(null, true);
  }
  callback(new Error("Not allowed by CORS"));
}

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.set("etag", "weak");

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: "cross-origin" },
    }),
  );
  app.use(
    compression({
      threshold: 1024,
      filter(req, res) {
        if (req.path === "/health" || req.path === "/ready") return false;
        return compression.filter(req, res);
      },
    }),
  );
  const corsOptions = {
    credentials: true,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-API-Key"],
    maxAge: 86400,
  };
  app.use((req, res, next) => {
    cors({ ...corsOptions, origin: (_origin, callback) => corsOrigin(req, callback) })(req, res, next);
  });
  app.use((req, res, next) => {
    if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") return next();
    return express.json({ limit: "1mb" })(req, res, next);
  });

  app.use(healthRouter);
  mountSwagger(app);

  const v1 = express.Router();
  v1.use(rateLimit);
  v1.use(requireApiKey);
  v1.use((req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.on("finish", () => {
        if (res.statusCode < 400) invalidateCache("stats");
      });
    }
    next();
  });
  v1.use("/config", configRouter);
  v1.use("/stats", statsRouter);
  v1.use("/locks", locksRouter);
  v1.use("/streams", streamsRouter);
  v1.use("/campaigns", campaignsRouter);
  v1.use("/escrow", escrowRouter);
  v1.use("/pools", poolsRouter);
  v1.use("/keys", keysRouter);
  v1.use("/docs-users", docsUsersRouter);
  app.use("/v1", v1);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
