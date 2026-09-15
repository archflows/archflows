import { unauthorized } from "../errors.js";
import { findActiveKey, touchKey } from "../lib/api-keys.js";

export function readKey(req) {
  const header = req.get("x-api-key");
  if (header?.trim()) return header.trim();
  const auth = req.get("authorization");
  if (auth?.toLowerCase().startsWith("bearer ")) return auth.slice(7).trim();
  return "";
}

/** Public/client key — looked up in `api_keys`, not only env. */
export async function requireApiKey(req, _res, next) {
  try {
    const provided = readKey(req);
    if (!provided) return next(unauthorized());
    const row = await findActiveKey(provided);
    if (!row) return next(unauthorized());
    req.apiKey = { id: row.id, name: row.name, role: row.role, prefix: row.key_prefix };
    touchKey(row.id);
    next();
  } catch (error) {
    next(error);
  }
}

export function requireAdmin(req, _res, next) {
  if (req.apiKey?.role !== "admin") {
    return next(unauthorized("Admin API key required"));
  }
  next();
}
