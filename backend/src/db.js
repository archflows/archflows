import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { config } from "./config.js";
import { AppError } from "./errors.js";

const { Pool } = pg;

pg.types.setTypeParser(20, (value) => value);
pg.types.setTypeParser(1700, (value) => value);

export const pool = new Pool({
  connectionString: config.databaseUrl,
  max: config.poolMax,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  keepAlive: true,
  allowExitOnIdle: false,
  application_name: "arcflow-api",
  options: `-c statement_timeout=${config.statementTimeoutMs}`,
});

pool.on("error", (error) => {
  console.error("[pg] idle client error", error);
});

export async function query(text, params) {
  try {
    return await pool.query(text, params);
  } catch (error) {
    throw wrapPgError(error);
  }
}

export async function withClient(fn) {
  const client = await pool.connect();
  try {
    return await fn(client);
  } catch (error) {
    throw wrapPgError(error);
  } finally {
    client.release();
  }
}

export async function migrate() {
  const schemaPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "sql", "schema.sql");
  const sql = await readFile(schemaPath, "utf8");
  await pool.query(sql);
}

export async function pingDb(timeoutMs = 3_000) {
  const started = Date.now();
  let timer;
  try {
    await Promise.race([
      pool.query({ name: "health_ping", text: "SELECT 1" }),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error("db ping timeout")), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
  return Date.now() - started;
}

export async function closePool() {
  await pool.end();
}

function wrapPgError(error) {
  if (error instanceof AppError) return error;
  if (error?.code === "23505") {
    return new AppError(409, "conflict", "Record already exists", { constraint: error.constraint });
  }
  if (error?.code === "23503") {
    return new AppError(400, "bad_request", "Related record is missing", { constraint: error.constraint });
  }
  if (error?.code === "22P02") {
    return new AppError(400, "bad_request", "Invalid value for a database field");
  }
  return error;
}
