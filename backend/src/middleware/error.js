import { AppError } from "../errors.js";
import { config } from "../config.js";

export function notFoundHandler(req, res) {
  res.status(404).json({
    ok: false,
    error: {
      code: "not_found",
      message: `No route for ${req.method} ${req.path}`,
    },
  });
}

export function errorHandler(err, req, res, _next) {
  if (res.headersSent) return;

  if (err?.type === "entity.parse.failed") {
    res.status(400).json({
      ok: false,
      error: { code: "bad_request", message: "Invalid JSON body" },
    });
    return;
  }

  if (err?.message === "Not allowed by CORS") {
    res.status(403).json({
      ok: false,
      error: { code: "cors_blocked", message: "Origin is not allowed" },
    });
    return;
  }

  const isApp = err instanceof AppError;
  const status = isApp ? err.status : 500;
  const payload = {
    ok: false,
    error: {
      code: isApp ? err.code : "internal_error",
      message: isApp ? err.message : "Internal server error",
    },
  };
  if (isApp && err.details) payload.error.details = err.details;
  if (status === 429 && err?.details?.retryAfterSec) {
    res.setHeader("Retry-After", String(err.details.retryAfterSec));
  }
  if (!isApp && config.env !== "production") {
    payload.error.debug = err?.message;
  }

  if (!isApp) {
    console.error(`[error] ${req.method} ${req.originalUrl}`, err);
  }

  res.status(status).json(payload);
}
