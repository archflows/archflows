export class AppError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function badRequest(message, details) {
  return new AppError(400, "bad_request", message, details);
}

export function unauthorized(message = "Invalid or missing API key") {
  return new AppError(401, "unauthorized", message);
}

export function tooManyRequests(retryAfterSec) {
  return new AppError(429, "rate_limited", "Too many requests, try again shortly", { retryAfterSec });
}

export function notFound(message = "Not found") {
  return new AppError(404, "not_found", message);
}

export function conflict(message, details) {
  return new AppError(409, "conflict", message, details);
}
