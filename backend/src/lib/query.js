import { query } from "../db.js";
import { notFound } from "../errors.js";
import { asId, parsePaging } from "./validate.js";

const IDENT = /^[a-z_][a-z0-9_]*$/;
const TX_HASH_RE = /^0x[a-fA-F0-9]{64}$/i;

function assertIdent(name) {
  if (!IDENT.test(name)) throw new Error(`Unsafe SQL identifier: ${name}`);
  return name;
}

export function isTxHashParam(value) {
  return typeof value === "string" && TX_HASH_RE.test(value);
}

export async function getById(table, id) {
  const { rows } = await query(`SELECT * FROM ${assertIdent(table)} WHERE id = $1`, [id]);
  if (!rows[0]) throw notFound(`${table} ${id} not found`);
  return rows[0];
}

export async function getByIdOrHash(table, key, hashColumns = ["tx_hash"]) {
  if (isTxHashParam(key)) {
    const hash = key.toLowerCase();
    const cols = hashColumns.map(assertIdent);
    const { rows } = await query(
      `SELECT * FROM ${assertIdent(table)}
       WHERE ${cols.map((column) => `${column} = $1`).join(" OR ")}
       ORDER BY updated_at DESC
       LIMIT 1`,
      [hash],
    );
    if (!rows[0]) throw notFound(`${table} ${hash} not found`);
    return rows[0];
  }
  return getById(table, asId(key));
}

export async function listRows({ table, query: qs, filters, orderBy = "id DESC" }) {
  const { limit, offset } = parsePaging(qs);
  const clauses = [];
  const values = [];

  for (const [param, column] of Object.entries(filters)) {
    const raw = qs[param];
    if (raw == null || raw === "") continue;
    assertIdent(column);
    values.push(typeof raw === "string" && raw.startsWith("0x") ? raw.toLowerCase() : raw);
    clauses.push(`${column} = $${values.length}`);
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const safeOrder = orderBy
    .split(",")
    .map((part) => part.trim())
    .every((part) => /^[a-z_][a-z0-9_]*(\s+(ASC|DESC))?$/i.test(part));
  if (!safeOrder) throw new Error("Unsafe ORDER BY");

  const countSql = `SELECT COUNT(*)::int AS total FROM ${assertIdent(table)} ${where}`;
  const listSql = `SELECT * FROM ${assertIdent(table)} ${where} ORDER BY ${orderBy} LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;

  const listRes = await query(listSql, [...values, limit, offset]);
  if (offset === 0 && listRes.rows.length < limit) {
    return {
      items: listRes.rows,
      page: { total: listRes.rows.length, limit, offset },
    };
  }

  const countRes = await query(countSql, values);
  return {
    items: listRes.rows,
    page: { total: countRes.rows[0].total, limit, offset },
  };
}

export function pickDefined(record) {
  return Object.fromEntries(Object.entries(record).filter(([, value]) => value !== undefined));
}

export function buildUpdate(table, id, fields) {
  const defined = pickDefined(fields);
  const keys = Object.keys(defined);
  if (!keys.length) return null;
  const sets = keys.map((key, index) => `${assertIdent(key)} = $${index + 1}`);
  sets.push("updated_at = NOW()");
  return {
    text: `UPDATE ${assertIdent(table)} SET ${sets.join(", ")} WHERE id = $${keys.length + 1} RETURNING *`,
    values: [...keys.map((key) => defined[key]), id],
  };
}
