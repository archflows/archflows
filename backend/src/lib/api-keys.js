import { createHash, randomBytes } from "node:crypto";
import { query } from "../db.js";
import { config } from "../config.js";

const CACHE_MS = 60_000;
const TOUCH_MS = 30_000;
const lastTouch = new Map();

let cache = { at: 0, byHash: new Map() };

export function hashKey(secret) {
  return createHash("sha256").update(secret).digest("hex");
}

export function keyPrefix(secret) {
  return secret.slice(0, 12);
}

export function generateSecret() {
  return `arcflow_${randomBytes(24).toString("hex")}`;
}

export function invalidateKeyCache() {
  cache = { at: 0, byHash: new Map() };
}

async function loadActive() {
  if (Date.now() - cache.at < CACHE_MS && cache.byHash.size) return cache.byHash;
  const { rows } = await query(
    `SELECT id, name, role, key_hash, key_prefix
     FROM api_keys
     WHERE active = TRUE`,
  );
  const byHash = new Map(rows.map((row) => [row.key_hash, row]));
  cache = { at: Date.now(), byHash };
  return byHash;
}

export async function findActiveKey(secret) {
  if (!secret) return null;
  const digest = hashKey(secret);
  const byHash = await loadActive();
  return byHash.get(digest) ?? null;
}

export function touchKey(id) {
  const now = Date.now();
  if ((lastTouch.get(id) ?? 0) + TOUCH_MS > now) return;
  lastTouch.set(id, now);
  query(`UPDATE api_keys SET last_used_at = NOW() WHERE id = $1`, [id]).catch((error) => {
    console.warn("[api-keys] last_used_at", error.message);
  });
}

export async function seedApiKeysFromEnv() {
  const seeds = [];
  for (const [index, secret] of config.apiKeys.entries()) {
    seeds.push({
      name: config.apiKeys.length === 1 ? "web" : `web-${index + 1}`,
      secret,
      role: "client",
    });
  }
  for (const secret of config.adminApiKeys) {
    seeds.push({ name: "admin", secret, role: "admin" });
  }

  for (const seed of seeds) {
    await query(
      `INSERT INTO api_keys (name, secret, key_hash, key_prefix, role)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (secret) DO UPDATE SET
         name = EXCLUDED.name,
         key_hash = EXCLUDED.key_hash,
         key_prefix = EXCLUDED.key_prefix,
         role = EXCLUDED.role,
         active = TRUE`,
      [seed.name, seed.secret, hashKey(seed.secret), keyPrefix(seed.secret), seed.role],
    );
  }
  invalidateKeyCache();
}

export async function assertKeysReady() {
  const { rows } = await query(`SELECT COUNT(*)::int AS n FROM api_keys WHERE active = TRUE`);
  if (!rows[0]?.n) {
    throw new Error("No active API keys in database. Set API_KEY and restart to seed one.");
  }
}

export async function listKeys() {
  const { rows } = await query(
    `SELECT id, name, secret, key_prefix, role, active, created_at, last_used_at
     FROM api_keys
     ORDER BY id ASC`,
  );
  return rows;
}

export async function createKey({ name, role = "client", secret }) {
  const value = secret || generateSecret();
  const { rows } = await query(
    `INSERT INTO api_keys (name, secret, key_hash, key_prefix, role)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, name, secret, key_prefix, role, active, created_at, last_used_at`,
    [name, value, hashKey(value), keyPrefix(value), role],
  );
  invalidateKeyCache();
  return rows[0];
}

export async function setKeyActive(id, active) {
  const { rows } = await query(
    `UPDATE api_keys SET active = $2 WHERE id = $1
     RETURNING id, name, secret, key_prefix, role, active, created_at, last_used_at`,
    [id, active],
  );
  invalidateKeyCache();
  return rows[0] ?? null;
}
