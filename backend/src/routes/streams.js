import { Router } from "express";
import { query, withClient } from "../db.js";
import { asyncHandler } from "../middleware/async-handler.js";
import { created, ok } from "../lib/respond.js";
import { buildUpdate, getById, getByIdOrHash, listRows } from "../lib/query.js";
import { badRequest } from "../errors.js";
import { notifyStreamUpserted } from "../lib/notifications-store.js";
import {
  asAddress,
  asAmount,
  asBool,
  asId,
  asJson,
  asOptionalAmount,
  asOptionalBool,
  asTxHash,
  asUnix,
  requireFields,
  requireObject,
} from "../lib/validate.js";

export const streamsRouter = Router();

function streamValues(body) {
  requireFields(body, ["id", "token", "sender", "recipient", "amount", "start", "cliff", "end"]);
  const startAt = asUnix(body.start ?? body.startAt, "start");
  const cliffAt = asUnix(body.cliff ?? body.cliffAt, "cliff");
  const endAt = asUnix(body.end ?? body.endAt, "end");
  if (endAt < cliffAt || cliffAt < startAt) {
    throw badRequest("Invalid schedule: start <= cliff <= end");
  }
  return [
    asId(body.id),
    asAddress(body.token, "token"),
    asAddress(body.sender, "sender"),
    asAddress(body.recipient, "recipient"),
    asAmount(body.amount, "amount"),
    asOptionalAmount(body.withdrawn, "withdrawn") ?? "0",
    startAt,
    cliffAt,
    endAt,
    Number.isInteger(Number(body.period)) ? Number(body.period) : 1,
    body.cancelable == null ? true : asBool(body.cancelable, "cancelable"),
    body.transferable == null ? true : asBool(body.transferable, "transferable"),
    body.canTopup == null && body.can_topup == null ? true : asBool(body.canTopup ?? body.can_topup, "canTopup"),
    body.canceled == null ? false : asBool(body.canceled, "canceled"),
    asTxHash(body.txHash ?? body.tx_hash, "txHash") ?? null,
    asJson(body.meta, "meta") ?? null,
  ];
}

const UPSERT_STREAM = `INSERT INTO streams (
  id, token, sender, recipient, amount, withdrawn,
  start_at, cliff_at, end_at, period, cancelable, transferable, can_topup, canceled, tx_hash, meta
) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
ON CONFLICT (id) DO UPDATE SET
  token = EXCLUDED.token,
  sender = EXCLUDED.sender,
  recipient = EXCLUDED.recipient,
  amount = EXCLUDED.amount,
  withdrawn = EXCLUDED.withdrawn,
  start_at = EXCLUDED.start_at,
  cliff_at = EXCLUDED.cliff_at,
  end_at = EXCLUDED.end_at,
  period = EXCLUDED.period,
  cancelable = EXCLUDED.cancelable,
  transferable = EXCLUDED.transferable,
  can_topup = EXCLUDED.can_topup,
  canceled = EXCLUDED.canceled,
  tx_hash = COALESCE(EXCLUDED.tx_hash, streams.tx_hash),
  meta = COALESCE(EXCLUDED.meta, streams.meta),
  updated_at = NOW()
RETURNING *`;

streamsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    ok(
      res,
      await listRows({
        table: "streams",
        query: req.query,
        filters: {
          sender: "sender",
          recipient: "recipient",
          token: "token",
          txHash: "tx_hash",
        },
      }),
    );
  }),
);

streamsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    ok(res, await getByIdOrHash("streams", req.params.id));
  }),
);

streamsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const { rows } = await query(UPSERT_STREAM, streamValues(requireObject(req.body)));
    void notifyStreamUpserted(rows[0]).catch((error) => {
      console.warn("[notifications] stream upsert", error);
    });
    created(res, rows[0]);
  }),
);

streamsRouter.post(
  "/batch",
  asyncHandler(async (req, res) => {
    const body = req.body;
    const items = Array.isArray(body) ? body : body?.items;
    if (!Array.isArray(items) || items.length === 0) {
      throw badRequest("Send a JSON array or { items: [...] }");
    }
    if (items.length > 200) throw badRequest("Batch cannot exceed 200 streams");

    const rows = await withClient(async (client) => {
      await client.query("BEGIN");
      try {
        const saved = [];
        for (const item of items) {
          const result = await client.query(UPSERT_STREAM, streamValues(requireObject(item)));
          saved.push(result.rows[0]);
        }
        await client.query("COMMIT");
        for (const row of saved) {
          void notifyStreamUpserted(row).catch((error) => {
            console.warn("[notifications] stream batch", error);
          });
        }
        return saved;
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    });
    created(res, { items: rows, count: rows.length });
  }),
);

streamsRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = asId(req.params.id);
    await getById("streams", id);
    const body = requireObject(req.body);
    const patch = buildUpdate("streams", id, {
      amount: asOptionalAmount(body.amount, "amount"),
      withdrawn: asOptionalAmount(body.withdrawn, "withdrawn"),
      recipient: body.recipient ? asAddress(body.recipient, "recipient") : undefined,
      canceled: asOptionalBool(body.canceled, "canceled"),
      tx_hash: asTxHash(body.txHash ?? body.tx_hash, "txHash"),
      meta: asJson(body.meta, "meta"),
    });
    if (!patch) throw badRequest("No updatable fields provided");
    const { rows } = await query(patch.text, patch.values);
    ok(res, rows[0]);
  }),
);
