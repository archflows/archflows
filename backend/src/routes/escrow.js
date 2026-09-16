import { Router } from "express";
import { query } from "../db.js";
import { asyncHandler } from "../middleware/async-handler.js";
import { created, ok } from "../lib/respond.js";
import { buildUpdate, getById, getByIdOrHash, listRows } from "../lib/query.js";
import { badRequest } from "../errors.js";
import { notifyEscrowUpserted } from "../lib/notifications-store.js";
import {
  asAddress,
  asAmount,
  asEnum,
  asId,
  asJson,
  asOptionalBytes32,
  asOptionalEnum,
  asTxHash,
  asUnix,
  requireFields,
  requireObject,
} from "../lib/validate.js";

export const escrowRouter = Router();

escrowRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    ok(
      res,
      await listRows({
        table: "escrow_deals",
        query: req.query,
        filters: {
          buyer: "buyer",
          seller: "seller",
          token: "token",
          status: "status",
          txHash: "tx_hash",
        },
      }),
    );
  }),
);

escrowRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    ok(res, await getByIdOrHash("escrow_deals", req.params.id));
  }),
);

escrowRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const body = requireObject(req.body);
    requireFields(body, ["id", "token", "buyer", "seller", "amount", ["unlockAt", "unlock_at"]]);

    const { rows } = await query(
      `INSERT INTO escrow_deals (
         id, token, buyer, seller, amount, unlock_at, terms_hash, status, tx_hash, meta
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT (id) DO UPDATE SET
         token = EXCLUDED.token,
         buyer = EXCLUDED.buyer,
         seller = EXCLUDED.seller,
         amount = EXCLUDED.amount,
         unlock_at = EXCLUDED.unlock_at,
         terms_hash = EXCLUDED.terms_hash,
         status = EXCLUDED.status,
         tx_hash = COALESCE(EXCLUDED.tx_hash, escrow_deals.tx_hash),
         meta = COALESCE(EXCLUDED.meta, escrow_deals.meta),
         updated_at = NOW()
       RETURNING *`,
      [
        asId(body.id),
        asAddress(body.token, "token"),
        asAddress(body.buyer, "buyer"),
        asAddress(body.seller, "seller"),
        asAmount(body.amount, "amount"),
        asUnix(body.unlockAt ?? body.unlock_at, "unlockAt"),
        asOptionalBytes32(body.termsHash ?? body.terms_hash, "termsHash") ?? null,
        body.status ? asEnum(body.status, "status", ["open", "released", "refunded"]) : "open",
        asTxHash(body.txHash ?? body.tx_hash, "txHash") ?? null,
        asJson(body.meta, "meta") ?? null,
      ],
    );
    void notifyEscrowUpserted(rows[0]).catch((error) => {
      console.warn("[notifications] escrow upsert", error);
    });
    created(res, rows[0]);
  }),
);

escrowRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = asId(req.params.id);
    await getById("escrow_deals", id);
    const body = requireObject(req.body);
    const patch = buildUpdate("escrow_deals", id, {
      status: asOptionalEnum(body.status, "status", ["open", "released", "refunded"]),
      tx_hash: asTxHash(body.txHash ?? body.tx_hash, "txHash"),
      meta: asJson(body.meta, "meta"),
    });
    if (!patch) throw badRequest("No updatable fields provided");
    const { rows } = await query(patch.text, patch.values);
    ok(res, rows[0]);
  }),
);
