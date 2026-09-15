import { createHmac, timingSafeEqual } from "node:crypto";
import { config } from "../config.js";
import { docsUsersReady, findDocsUser, getActiveDocsUser, touchDocsUser } from "../lib/docs-users.js";

export const DOCS_COOKIE = "af_docs";
const SESSION_MS = 7 * 24 * 60 * 60 * 1000;

function safeEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

function sessionSecret() {
  return (
    config.swagger.sessionSecret ||
    config.swagger.password ||
    config.databaseUrl ||
    "arcflow-docs"
  );
}

export function signDocsSession(userId) {
  const exp = Date.now() + SESSION_MS;
  const payload = `v2.${userId}.${exp}`;
  const sig = createHmac("sha256", sessionSecret()).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export async function verifyDocsSession(token) {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 4 || parts[0] !== "v2") return null;
  const exp = Number(parts[2]);
  if (!Number.isFinite(exp) || exp < Date.now()) return null;
  const payload = `v2.${parts[1]}.${parts[2]}`;
  const expected = createHmac("sha256", sessionSecret()).update(payload).digest("base64url");
  if (!safeEqual(parts[3], expected)) return null;
  const row = await getActiveDocsUser(parts[1]);
  return row ?? null;
}

export function readCookie(req, name) {
  const raw = req.get("cookie") || "";
  for (const part of raw.split(";")) {
    const sep = part.indexOf("=");
    if (sep === -1) continue;
    if (part.slice(0, sep).trim() !== name) continue;
    try {
      return decodeURIComponent(part.slice(sep + 1).trim());
    } catch {
      return "";
    }
  }
  return "";
}

function cookieFlags(req) {
  const proto = req.get("x-forwarded-proto") || req.protocol;
  const secure = proto === "https" || config.env === "production";
  return `HttpOnly; SameSite=Lax; Path=/; Max-Age=${Math.floor(SESSION_MS / 1000)}${secure ? "; Secure" : ""}`;
}

export function setDocsCookie(req, res, user) {
  res.append("Set-Cookie", `${DOCS_COOKIE}=${signDocsSession(user.id)}; ${cookieFlags(req)}`);
}

export function clearDocsCookie(res) {
  res.append("Set-Cookie", `${DOCS_COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`);
}

function credentialsFromBasic(req) {
  const header = req.get("authorization") || "";
  if (!header.toLowerCase().startsWith("basic ")) return null;
  let decoded = "";
  try {
    decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
  } catch {
    return null;
  }
  const sep = decoded.indexOf(":");
  return {
    user: sep === -1 ? decoded : decoded.slice(0, sep),
    password: sep === -1 ? "" : decoded.slice(sep + 1),
  };
}

export async function swaggerConfigured() {
  return docsUsersReady();
}

export async function getSwaggerAuth(req) {
  const fromCookie = await verifyDocsSession(readCookie(req, DOCS_COOKIE));
  if (fromCookie) {
    touchDocsUser(fromCookie.id);
    return fromCookie;
  }
  const basic = credentialsFromBasic(req);
  if (!basic) return null;
  const row = await findDocsUser(basic.user, basic.password);
  if (!row) return null;
  touchDocsUser(row.id);
  return row;
}

export async function requireSwaggerAuth(req, res, next) {
  try {
    if (!(await swaggerConfigured())) {
      res.status(503).json({
        ok: false,
        error: { code: "swagger_disabled", message: "No active docs users. Seed SWAGGER_USER or add one via /v1/docs-users" },
      });
      return;
    }
    const user = await getSwaggerAuth(req);
    if (user) {
      req.docsUser = user;
      return next();
    }
    res.status(401).json({
      ok: false,
      error: { code: "unauthorized", message: "Swagger login required" },
    });
  } catch (error) {
    next(error);
  }
}
