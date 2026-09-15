import { config } from "../config.js";
import { tooManyRequests } from "../errors.js";

const buckets = new Map();
let lastSweep = Date.now();

function clientIp(req) {
  return req.ip || req.socket?.remoteAddress || "unknown";
}

function sweep(now) {
  if (now - lastSweep < config.rateLimitWindowMs) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export function rateLimit(req, res, next) {
  if (!config.rateLimitMax || req.method === "OPTIONS") return next();

  const now = Date.now();
  sweep(now);

  const key = clientIp(req);
  let bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + config.rateLimitWindowMs };
    buckets.set(key, bucket);
  }

  bucket.count += 1;
  const remaining = Math.max(0, config.rateLimitMax - bucket.count);
  const retryAfterSec = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));

  res.setHeader("X-RateLimit-Limit", String(config.rateLimitMax));
  res.setHeader("X-RateLimit-Remaining", String(remaining));
  res.setHeader("X-RateLimit-Reset", String(Math.ceil(bucket.resetAt / 1000)));

  if (bucket.count > config.rateLimitMax) {
    res.setHeader("Retry-After", String(retryAfterSec));
    return next(tooManyRequests(retryAfterSec));
  }

  next();
}
