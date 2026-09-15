import { Router } from "express";
import { query } from "../db.js";
import { asyncHandler } from "../middleware/async-handler.js";
import { created, ok } from "../lib/respond.js";
import { buildUpdate, getById, getByIdOrHash, listRows } from "../lib/query.js";
import { badRequest } from "../errors.js";
import {
  asAddress,
  asAmount,
  asId,
  asJson,
  asOptionalAmount,
  asOptionalBool,
  asOptionalUnix,
  asTxHash,
  requireFields,
  requireObject,
} from "../lib/validate.js";

export const poolsRouter = Router();

poolsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    ok(
      res,
      await listRows({
        table: "staking_pools",
        query: req.query,
        filters: {
          owner: "owner",
          stakeToken: "stake_token",
          rewardToken: "reward_token",
          txHash: "tx_hash",
        },
      }),
    );
  }),
);

poolsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    ok(res, await getByIdOrHash("staking_pools", req.params.id));
  }),
);

poolsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const body = requireObject(req.body);
    requireFields(body, [
      "id",
      ["stakeToken", "stake_token"],
      ["rewardToken", "reward_token"],
      "owner",
    ]);

    const { rows } = await query(
      `INSERT INTO staking_pools (
         id, stake_token, reward_token, owner, min_lock, total_staked, cap, expires_at, paused, tx_hash, meta
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT (id) DO UPDATE SET
         stake_token = EXCLUDED.stake_token,
         reward_token = EXCLUDED.reward_token,
         owner = EXCLUDED.owner,
         min_lock = EXCLUDED.min_lock,
         total_staked = EXCLUDED.total_staked,
         cap = EXCLUDED.cap,
         expires_at = EXCLUDED.expires_at,
         paused = EXCLUDED.paused,
         tx_hash = COALESCE(EXCLUDED.tx_hash, staking_pools.tx_hash),
         meta = COALESCE(EXCLUDED.meta, staking_pools.meta),
         updated_at = NOW()
       RETURNING *`,
      [
        asId(body.id),
        asAddress(body.stakeToken ?? body.stake_token, "stakeToken"),
        asAddress(body.rewardToken ?? body.reward_token, "rewardToken"),
        asAddress(body.owner, "owner"),
        Number(body.minLock ?? body.min_lock ?? 0) || 0,
        asOptionalAmount(body.totalStaked ?? body.total_staked, "totalStaked") ?? "0",
        asOptionalAmount(body.cap, "cap") ?? null,
        asOptionalUnix(body.expiresAt ?? body.expires_at, "expiresAt") ?? null,
        body.paused == null ? false : Boolean(body.paused),
        asTxHash(body.txHash ?? body.tx_hash, "txHash") ?? null,
        asJson(body.meta, "meta") ?? null,
      ],
    );
    created(res, rows[0]);
  }),
);

poolsRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = asId(req.params.id);
    await getById("staking_pools", id);
    const body = requireObject(req.body);
    const patch = buildUpdate("staking_pools", id, {
      total_staked: asOptionalAmount(body.totalStaked ?? body.total_staked, "totalStaked"),
      cap: asOptionalAmount(body.cap, "cap"),
      expires_at: asOptionalUnix(body.expiresAt ?? body.expires_at, "expiresAt"),
      paused: asOptionalBool(body.paused, "paused"),
      tx_hash: asTxHash(body.txHash ?? body.tx_hash, "txHash"),
      meta: asJson(body.meta, "meta"),
    });
    if (!patch) throw badRequest("No updatable fields provided");
    const { rows } = await query(patch.text, patch.values);
    ok(res, rows[0]);
  }),
);

poolsRouter.get(
  "/:id/stakes",
  asyncHandler(async (req, res) => {
    const id = asId(req.params.id);
    await getById("staking_pools", id);
    ok(
      res,
      await listRows({
        table: "stakes",
        query: { ...req.query, pool_id: id },
        filters: { pool_id: "pool_id", account: "account" },
        orderBy: "updated_at DESC",
      }),
    );
  }),
);

poolsRouter.post(
  "/:id/stakes",
  asyncHandler(async (req, res) => {
    const poolId = asId(req.params.id);
    await getById("staking_pools", poolId);
    const body = requireObject(req.body);
    requireFields(body, ["account", "amount"]);

    const { rows } = await query(
      `INSERT INTO stakes (pool_id, account, amount, unlock_at, rewards, tx_hash)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (pool_id, account) DO UPDATE SET
         amount = EXCLUDED.amount,
         unlock_at = EXCLUDED.unlock_at,
         rewards = EXCLUDED.rewards,
         tx_hash = COALESCE(EXCLUDED.tx_hash, stakes.tx_hash),
         updated_at = NOW()
       RETURNING *`,
      [
        poolId,
        asAddress(body.account, "account"),
        asAmount(body.amount, "amount"),
        Number(body.unlockAt ?? body.unlock_at ?? 0) || 0,
        asOptionalAmount(body.rewards, "rewards") ?? "0",
        asTxHash(body.txHash ?? body.tx_hash, "txHash") ?? null,
      ],
    );
    created(res, rows[0]);
  }),
);
