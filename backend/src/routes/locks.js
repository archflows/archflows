import { Router } from "express";
import { query } from "../db.js";
import { asyncHandler } from "../middleware/async-handler.js";
import { created, ok } from "../lib/respond.js";
import { buildUpdate, getById, getByIdOrHash, listRows } from "../lib/query.js";
import { badRequest } from "../errors.js";
import {
  asAddress,
  asAmount,
  asEnum,
  asId,
  asJson,
  asOptionalAmount,
  asOptionalEnum,
  asTxHash,
  asUnix,
  requireFields,
  requireObject,
} from "../lib/validate.js";

export const locksRouter = Router();

locksRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const data = await listRows({
      table: "locks",
      query: req.query,
      filters: {
        creator: "creator",
        beneficiary: "beneficiary",
        token: "token",
        kind: "kind",
        txHash: "tx_hash",
      },
    });
    ok(res, data);
  }),
);

locksRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    ok(res, await getByIdOrHash("locks", req.params.id, ["tx_hash", "unlock_tx_hash"]));
  }),
);

locksRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const body = requireObject(req.body);
    requireFields(body, ["id", "token", "beneficiary", "creator", "amount", "start", "cliff", "end"]);

    const startAt = asUnix(body.start ?? body.startAt, "start");
    const cliffAt = asUnix(body.cliff ?? body.cliffAt, "cliff");
    const endAt = asUnix(body.end ?? body.endAt, "end");
    if (endAt < cliffAt || cliffAt < startAt) {
      throw badRequest("Invalid schedule: start <= cliff <= end");
    }

    const kind = body.kind
      ? asEnum(body.kind, "kind", ["lock", "vest"])
      : cliffAt === endAt
        ? "lock"
        : "vest";

    const { rows } = await query(
      `INSERT INTO locks (
         id, kind, token, beneficiary, creator, amount, claimed,
         start_at, cliff_at, end_at, fee_usdc, tx_hash, unlock_tx_hash, meta
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       ON CONFLICT (id) DO UPDATE SET
         kind = EXCLUDED.kind,
         token = EXCLUDED.token,
         beneficiary = EXCLUDED.beneficiary,
         creator = EXCLUDED.creator,
         amount = EXCLUDED.amount,
         claimed = EXCLUDED.claimed,
         start_at = EXCLUDED.start_at,
         cliff_at = EXCLUDED.cliff_at,
         end_at = EXCLUDED.end_at,
         fee_usdc = EXCLUDED.fee_usdc,
         tx_hash = COALESCE(EXCLUDED.tx_hash, locks.tx_hash),
         unlock_tx_hash = COALESCE(EXCLUDED.unlock_tx_hash, locks.unlock_tx_hash),
         meta = COALESCE(EXCLUDED.meta, locks.meta),
         updated_at = NOW()
       RETURNING *`,
      [
        asId(body.id),
        kind,
        asAddress(body.token, "token"),
        asAddress(body.beneficiary, "beneficiary"),
        asAddress(body.creator, "creator"),
        asAmount(body.amount, "amount"),
        asOptionalAmount(body.claimed, "claimed") ?? "0",
        startAt,
        cliffAt,
        endAt,
        asOptionalAmount(body.feeUsdc ?? body.fee_usdc, "feeUsdc") ?? "10000000",
        asTxHash(body.txHash ?? body.tx_hash, "txHash") ?? null,
        asTxHash(body.unlockTxHash ?? body.unlock_tx_hash, "unlockTxHash") ?? null,
        asJson(body.meta, "meta") ?? null,
      ],
    );
    created(res, rows[0]);
  }),
);

locksRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = asId(req.params.id);
    await getById("locks", id);
    const body = requireObject(req.body);
    const patch = buildUpdate("locks", id, {
      claimed: asOptionalAmount(body.claimed, "claimed"),
      kind: asOptionalEnum(body.kind, "kind", ["lock", "vest"]),
      tx_hash: asTxHash(body.txHash ?? body.tx_hash, "txHash"),
      unlock_tx_hash: asTxHash(body.unlockTxHash ?? body.unlock_tx_hash, "unlockTxHash"),
      meta: asJson(body.meta, "meta"),
    });
    if (!patch) throw badRequest("No updatable fields provided");
    const { rows } = await query(patch.text, patch.values);
    ok(res, rows[0]);
  }),
);
