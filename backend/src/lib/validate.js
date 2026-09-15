import { badRequest } from "../errors.js";

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;
const BYTES32_RE = /^0x[a-fA-F0-9]{64}$/;
const UINT_RE = /^\d+$/;
const TX_HASH_RE = /^0x[a-fA-F0-9]{64}$/;

export function requireObject(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw badRequest("JSON body must be an object");
  }
  return body;
}

export function optionalString(value, field) {
  if (value == null || value === "") return undefined;
  if (typeof value !== "string") throw badRequest(`${field} must be a string`);
  return value;
}

export function pick(body, ...keys) {
  for (const key of keys) {
    if (body[key] != null && body[key] !== "") return body[key];
  }
  return undefined;
}

export function requireFields(body, fields) {
  const missing = fields.filter((field) => {
    if (Array.isArray(field)) return pick(body, ...field) == null;
    return body[field] == null || body[field] === "";
  });
  if (missing.length) {
    const names = missing.map((field) => (Array.isArray(field) ? field.join("|") : field));
    throw badRequest(`Missing required field(s): ${names.join(", ")}`, { missing: names });
  }
}

export function asAddress(value, field) {
  if (typeof value !== "string" || !ADDRESS_RE.test(value)) {
    throw badRequest(`${field} must be a 20-byte hex address`);
  }
  return value.toLowerCase();
}

export function asOptionalAddress(value, field) {
  if (value == null || value === "") return undefined;
  return asAddress(value, field);
}

export function asId(value, field = "id") {
  const text = String(value);
  if (!UINT_RE.test(text)) throw badRequest(`${field} must be a non-negative integer string`);
  return text;
}

export function asAmount(value, field) {
  const text = String(value);
  if (!UINT_RE.test(text) || text === "") throw badRequest(`${field} must be a non-negative integer string`);
  return text;
}

export function asOptionalAmount(value, field) {
  if (value == null || value === "") return undefined;
  return asAmount(value, field);
}

export function asUnix(value, field) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0) throw badRequest(`${field} must be a unix timestamp in seconds`);
  return n;
}

export function asOptionalUnix(value, field) {
  if (value == null || value === "") return undefined;
  return asUnix(value, field);
}

export function asBool(value, field) {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  throw badRequest(`${field} must be a boolean`);
}

export function asOptionalBool(value, field) {
  if (value == null || value === "") return undefined;
  return asBool(value, field);
}

export function asBytes32(value, field) {
  if (typeof value !== "string" || !BYTES32_RE.test(value)) {
    throw badRequest(`${field} must be a 32-byte hex string`);
  }
  return value.toLowerCase();
}

export function asOptionalBytes32(value, field) {
  if (value == null || value === "") return undefined;
  return asBytes32(value, field);
}

export function asTxHash(value, field) {
  if (value == null || value === "") return undefined;
  if (typeof value !== "string" || !TX_HASH_RE.test(value)) {
    throw badRequest(`${field} must be a transaction hash`);
  }
  return value.toLowerCase();
}

export function asEnum(value, field, allowed) {
  if (!allowed.includes(value)) {
    throw badRequest(`${field} must be one of: ${allowed.join(", ")}`);
  }
  return value;
}

export function asOptionalEnum(value, field, allowed) {
  if (value == null || value === "") return undefined;
  return asEnum(value, field, allowed);
}

export function asJson(value, field) {
  if (value == null) return undefined;
  if (typeof value !== "object") throw badRequest(`${field} must be a JSON object or array`);
  return value;
}

export function parsePaging(query) {
  const limit = Math.min(Math.max(Number.parseInt(query.limit, 10) || 50, 1), 200);
  const offset = Math.max(Number.parseInt(query.offset, 10) || 0, 0);
  return { limit, offset };
}
