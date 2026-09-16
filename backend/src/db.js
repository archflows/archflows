import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { config } from "./config.js";
import { AppError } from "./errors.js";

const { Pool } = pg;

pg.types.setTypeParser(20, (value) => value);
pg.types.setTypeParser(1700, (value) => value);

// Railway / PgBouncer reject startup params like `-c statement_timeout=…` in `options`.
// Timeouts are enforced in `withStatementTimeout()` instead.
export const pool = new Pool({
  connectionString: config.databaseUrl,
  max: config.poolMax,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  keepAlive: true,
  allowExitOnIdle: false,
  application_name: "arcflow-api",
});

pool.on("error", (error) => {
  console.error("[pg] idle client error", error);
});

function withStatementTimeout(promise, timeoutMs = config.statementTimeoutMs) {
  if (!timeoutMs || timeoutMs <= 0) return promise;
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => {
        reject(Object.assign(new Error(`query timeout after ${timeoutMs}ms`), { code: "QUERY_TIMEOUT" }));
      }, timeoutMs);
    }),
  ]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

export async function query(text, params) {
  try {
    return await withStatementTimeout(pool.query(text, params));
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

export async function withTransaction(fn) {
  return withClient(async (client) => {
    try {
      await client.query("BEGIN");
      const result = await fn(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK").catch(() => {});
      throw error;
    }
  });
}

export async function migrate() {
  const schemaPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "sql", "schema.sql");
  const sql = await readFile(schemaPath, "utf8");
  await withStatementTimeout(pool.query(sql), Math.max(config.statementTimeoutMs, 60_000));
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
