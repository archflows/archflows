import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { query } from "../db.js";
import { config } from "../config.js";

const CACHE_MS = 30_000;
const TOUCH_MS = 30_000;
const lastTouch = new Map();

let cache = { at: 0, byId: new Map(), count: 0 };

const USERNAME_RE = /^[a-z0-9][a-z0-9._-]{1,31}$/;

export function normalizeUsername(value) {
  return String(value || "").trim().toLowerCase();
}

export function assertUsername(value) {
  const username = normalizeUsername(value);
  if (!USERNAME_RE.test(username)) {
    throw new Error("Username must be 2–32 chars: lowercase letters, numbers, . _ -");
  }
  return username;
}

function safeEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(password, stored) {
  if (!password || !stored) return false;
  const parts = String(stored).split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const next = scryptSync(password, parts[1], 64).toString("hex");
  return safeEqual(next, parts[2]);
}

function publicRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    name: row.name,
    role: row.role,
    active: row.active,
    created_at: row.created_at,
    last_used_at: row.last_used_at,
  };
}

export function invalidateDocsUserCache() {
  cache = { at: 0, byId: new Map(), count: 0 };
}

async function loadActive() {
  if (Date.now() - cache.at < CACHE_MS && cache.byId.size) return cache;
  const { rows } = await query(
    `SELECT id, username, password_hash, name, role, active, created_at, last_used_at
     FROM docs_users
     WHERE active = TRUE`,
  );
  const byId = new Map(rows.map((row) => [String(row.id), row]));
  cache = { at: Date.now(), byId, count: rows.length };
  return cache;
}

export async function docsUsersReady() {
  const { rows } = await query(`SELECT COUNT(*)::int AS n FROM docs_users WHERE active = TRUE`);
  return (rows[0]?.n ?? 0) > 0;
}

export async function getActiveDocsUser(id) {
  if (id == null) return null;
  const box = await loadActive();
  return box.byId.get(String(id)) ?? null;
}

export async function findDocsUser(username, password) {
  const name = normalizeUsername(username);
  if (!name || !password) return null;
  const { rows } = await query(
    `SELECT id, username, password_hash, name, role, active, created_at, last_used_at
     FROM docs_users
     WHERE username = $1 AND active = TRUE`,
    [name],
  );
  const row = rows[0];
  if (!row || !verifyPassword(password, row.password_hash)) return null;
  return row;
}

export function touchDocsUser(id) {
  const now = Date.now();
  if ((lastTouch.get(id) ?? 0) + TOUCH_MS > now) return;
  lastTouch.set(id, now);
  query(`UPDATE docs_users SET last_used_at = NOW() WHERE id = $1`, [id]).catch((error) => {
    console.warn("[docs-users] last_used_at", error.message);
  });
}

export async function listDocsUsers() {
  const { rows } = await query(
    `SELECT id, username, name, role, active, created_at, last_used_at
     FROM docs_users
     ORDER BY id ASC`,
  );
  return rows;
}

export async function createDocsUser({ username, password, name, role = "viewer" }) {
  const user = assertUsername(username);
  if (!password || String(password).length < 8) {
    throw new Error("Password must be at least 8 characters");
  }
  const { rows } = await query(
    `INSERT INTO docs_users (username, password_hash, name, role)
     VALUES ($1, $2, $3, $4)
     RETURNING id, username, name, role, active, created_at, last_used_at`,
    [user, hashPassword(password), name || user, role],
  );
  invalidateDocsUserCache();
  return rows[0];
}

export async function updateDocsUser(id, { active, password, name, role }) {
  const sets = [];
  const values = [];
  if (typeof active === "boolean") {
    values.push(active);
    sets.push(`active = $${values.length}`);
  }
  if (password) {
    if (String(password).length < 8) throw new Error("Password must be at least 8 characters");
    values.push(hashPassword(password));
    sets.push(`password_hash = $${values.length}`);
  }
  if (name != null) {
    values.push(name);
    sets.push(`name = $${values.length}`);
  }
  if (role) {
    values.push(role);
    sets.push(`role = $${values.length}`);
  }
  if (!sets.length) return publicRow(await getActiveDocsUser(id));
  values.push(id);
  const { rows } = await query(
    `UPDATE docs_users SET ${sets.join(", ")} WHERE id = $${values.length}
     RETURNING id, username, name, role, active, created_at, last_used_at`,
    values,
  );
  invalidateDocsUserCache();
  return rows[0] ?? null;
}

async function upsertSeed({ username, password, name, role }) {
  if (!username || !password) return;
  const user = assertUsername(username);
  await query(
    `INSERT INTO docs_users (username, password_hash, name, role)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (username) DO UPDATE SET
       password_hash = EXCLUDED.password_hash,
       name = EXCLUDED.name,
       role = EXCLUDED.role,
       active = TRUE`,
    [user, hashPassword(password), name, role],
  );
}

export async function seedDocsUsersFromEnv() {
  await upsertSeed({
    username: config.swagger.user,
    password: config.swagger.password,
    name: "admin",
    role: "admin",
  });
  await upsertSeed({
    username: config.swagger.partnerUser,
    password: config.swagger.partnerPassword,
    name: "partner",
    role: "partner",
  });
  invalidateDocsUserCache();
}
