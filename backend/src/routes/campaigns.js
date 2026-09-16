import { Router } from "express";
import { query } from "../db.js";
import { asyncHandler } from "../middleware/async-handler.js";
import { created, ok } from "../lib/respond.js";
import { buildUpdate, getById, getByIdOrHash, listRows } from "../lib/query.js";
import { badRequest } from "../errors.js";
import { notifyCampaignUpserted } from "../lib/notifications-store.js";
import {
  asAddress,
  asAmount,
  asBytes32,
  asId,
  asJson,
  asOptionalAmount,
  asOptionalBool,
  asTxHash,
  asUnix,
  requireFields,
  requireObject,
} from "../lib/validate.js";

export const campaignsRouter = Router();

campaignsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    ok(
      res,
      await listRows({
        table: "campaigns",
        query: req.query,
        filters: { funder: "funder", token: "token", txHash: "tx_hash" },
      }),
    );
  }),
);

campaignsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    ok(res, await getByIdOrHash("campaigns", req.params.id));
  }),
);

campaignsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const body = requireObject(req.body);
    requireFields(body, [
      "id",
      "token",
      "funder",
      ["merkleRoot", "merkle_root"],
      "deposited",
      ["claimStart", "claim_start"],
      ["claimEnd", "claim_end"],
    ]);
    const claimStart = asUnix(body.claimStart ?? body.claim_start, "claimStart");
    const claimEnd = asUnix(body.claimEnd ?? body.claim_end, "claimEnd");
    if (claimEnd <= claimStart) throw badRequest("claimEnd must be after claimStart");

    const { rows } = await query(
      `INSERT INTO campaigns (
         id, token, funder, merkle_root, deposited, claimed,
         claim_start, claim_end, vest_duration, vest_cliff_delay, canceled, tx_hash, meta
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       ON CONFLICT (id) DO UPDATE SET
         token = EXCLUDED.token,
         funder = EXCLUDED.funder,
         merkle_root = EXCLUDED.merkle_root,
         deposited = EXCLUDED.deposited,
         claimed = EXCLUDED.claimed,
         claim_start = EXCLUDED.claim_start,
         claim_end = EXCLUDED.claim_end,
         vest_duration = EXCLUDED.vest_duration,
         vest_cliff_delay = EXCLUDED.vest_cliff_delay,
         canceled = EXCLUDED.canceled,
         tx_hash = COALESCE(EXCLUDED.tx_hash, campaigns.tx_hash),
         meta = COALESCE(EXCLUDED.meta, campaigns.meta),
         updated_at = NOW()
       RETURNING *`,
      [
        asId(body.id),
        asAddress(body.token, "token"),
        asAddress(body.funder, "funder"),
        asBytes32(body.merkleRoot ?? body.merkle_root, "merkleRoot"),
        asAmount(body.deposited, "deposited"),
        asOptionalAmount(body.claimed, "claimed") ?? "0",
        claimStart,
        claimEnd,
        Number(body.vestDuration ?? body.vest_duration ?? 0) || 0,
        Number(body.vestCliffDelay ?? body.vest_cliff_delay ?? 0) || 0,
        body.canceled == null ? false : Boolean(body.canceled),
        asTxHash(body.txHash ?? body.tx_hash, "txHash") ?? null,
        asJson(body.meta, "meta") ?? null,
      ],
    );
    void notifyCampaignUpserted(rows[0]).catch((error) => {
      console.warn("[notifications] campaign upsert", error);
    });
    created(res, rows[0]);
  }),
);

campaignsRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = asId(req.params.id);
    await getById("campaigns", id);
    const body = requireObject(req.body);
    const patch = buildUpdate("campaigns", id, {
      deposited: asOptionalAmount(body.deposited, "deposited"),
      claimed: asOptionalAmount(body.claimed, "claimed"),
      canceled: asOptionalBool(body.canceled, "canceled"),
      tx_hash: asTxHash(body.txHash ?? body.tx_hash, "txHash"),
      meta: asJson(body.meta, "meta"),
    });
    if (!patch) throw badRequest("No updatable fields provided");
    const { rows } = await query(patch.text, patch.values);
    ok(res, rows[0]);
  }),
);

campaignsRouter.get(
  "/:id/claims",
  asyncHandler(async (req, res) => {
    const id = asId(req.params.id);
    await getById("campaigns", id);
    ok(
      res,
      await listRows({
        table: "campaign_claims",
        query: { ...req.query, campaign_id: id },
        filters: { campaign_id: "campaign_id", account: "account" },
        orderBy: "created_at DESC",
      }),
    );
  }),
);

campaignsRouter.post(
  "/:id/claims",
  asyncHandler(async (req, res) => {
    const campaignId = asId(req.params.id);
    await getById("campaigns", campaignId);
    const body = requireObject(req.body);
    requireFields(body, ["index", "account", "amount"]);

    const { rows } = await query(
      `INSERT INTO campaign_claims (
         campaign_id, claim_index, account, receiver, amount, stream_id, tx_hash
       ) VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (campaign_id, claim_index) DO UPDATE SET
         account = EXCLUDED.account,
         receiver = EXCLUDED.receiver,
         amount = EXCLUDED.amount,
         stream_id = COALESCE(EXCLUDED.stream_id, campaign_claims.stream_id),
         tx_hash = COALESCE(EXCLUDED.tx_hash, campaign_claims.tx_hash)
       RETURNING *`,
      [
        campaignId,
        asId(body.index, "index"),
        asAddress(body.account, "account"),
        asAddress(body.receiver ?? body.account, "receiver"),
        asAmount(body.amount, "amount"),
        body.streamId != null && body.streamId !== ""
          ? asId(body.streamId, "streamId")
          : body.stream_id != null && body.stream_id !== ""
            ? asId(body.stream_id, "streamId")
            : null,
        asTxHash(body.txHash ?? body.tx_hash, "txHash") ?? null,
      ],
    );
    created(res, rows[0]);
  }),
);
