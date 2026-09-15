import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const url = process.env.DATABASE_URL;

if (!url) {
  console.warn("[db] DATABASE_URL is not set — database features are disabled.");
}

const client = url
  ? postgres(url, {
      prepare: false,
      max: 5,
      idle_timeout: 20,
      connect_timeout: 30,
      ssl: "require",
    })
  : null;

export const db = client ? drizzle(client, { schema }) : null;

export function requireDb() {
  if (!db) {
    throw new Error("DATABASE_URL is not configured");
  }
  return db;
}
