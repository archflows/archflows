import { Router } from "express";
import { query } from "../db.js";
import { asyncHandler } from "../middleware/async-handler.js";
import { ok } from "../lib/respond.js";
import { cached } from "../lib/ttl-cache.js";
import { config } from "../config.js";

export const statsRouter = Router();

async function loadStats(wallet, days) {
  const [totals, featured, series, activity, walletStats] = await Promise.all([
    query({
      name: "stats_totals",
      text: `
        SELECT
          (SELECT COUNT(*)::int FROM locks) AS locks,
          (SELECT COUNT(*)::int FROM locks WHERE kind = 'lock') AS hard_locks,
          (SELECT COUNT(*)::int FROM locks WHERE kind = 'vest') AS vests,
          (SELECT COUNT(*)::int FROM streams) AS streams,
          (SELECT COUNT(*)::int FROM campaigns) AS campaigns,
          (SELECT COUNT(*)::int FROM campaign_claims) AS claims,
          (SELECT COUNT(*)::int FROM escrow_deals) AS escrow,
          (SELECT COUNT(*)::int FROM staking_pools) AS pools
      `,
    }),
    query({
      name: "stats_featured",
      text: `
        SELECT id, kind, token, beneficiary, creator, amount, claimed,
               start_at, cliff_at, end_at, created_at, tx_hash, unlock_tx_hash
        FROM locks
        ORDER BY created_at DESC
        LIMIT 1
      `,
    }),
    query({
      name: "stats_series",
      text: `
        SELECT d::date::text AS date,
               COALESCE(l.n, 0)::int AS locks,
               COALESCE(c.n, 0)::int AS claims
        FROM generate_series((CURRENT_DATE - ($1::int - 1)), CURRENT_DATE, interval '1 day') AS d
        LEFT JOIN (
          SELECT created_at::date AS day, COUNT(*)::int AS n
          FROM locks
          WHERE created_at >= CURRENT_DATE - ($1::int - 1)
          GROUP BY 1
        ) l ON l.day = d::date
        LEFT JOIN (
          SELECT created_at::date AS day, COUNT(*)::int AS n
          FROM campaign_claims
          WHERE created_at >= CURRENT_DATE - ($1::int - 1)
          GROUP BY 1
        ) c ON c.day = d::date
        ORDER BY d
      `,
      values: [days],
    }),
    query({
      name: "stats_activity_tx_v2",
      text: `
        SELECT * FROM (
          (SELECT 'lock' AS module, id, kind AS subtype, token,
                  beneficiary AS wallet, amount, end_at, created_at, tx_hash, unlock_tx_hash
           FROM locks ORDER BY created_at DESC LIMIT 40)
          UNION ALL
          (SELECT 'stream', id, 'stream', token, recipient, amount, end_at, created_at, tx_hash, NULL::text
           FROM streams ORDER BY created_at DESC LIMIT 40)
          UNION ALL
          (SELECT 'campaign', id, 'airdrop', token, funder, deposited, claim_end, created_at, tx_hash, NULL::text
           FROM campaigns ORDER BY created_at DESC LIMIT 40)
          UNION ALL
          (SELECT 'escrow', id, status, token, seller, amount, unlock_at, created_at, tx_hash, NULL::text
           FROM escrow_deals ORDER BY created_at DESC LIMIT 40)
          UNION ALL
          (SELECT 'pool', id, 'staking', stake_token, owner, total_staked, COALESCE(expires_at, 0), created_at, tx_hash, NULL::text
           FROM staking_pools ORDER BY created_at DESC LIMIT 40)
        ) events
        ORDER BY created_at DESC
        LIMIT 40
      `,
    }),
    wallet
      ? query({
          name: "stats_wallet",
          text: `
            SELECT
              (SELECT COUNT(*)::int FROM locks WHERE creator = $1) AS locks_created,
              (SELECT COUNT(*)::int FROM locks WHERE beneficiary = $1) AS locks_receiving,
              (SELECT COUNT(*)::int FROM streams WHERE sender = $1) AS streams_sent,
              (SELECT COUNT(*)::int FROM streams WHERE recipient = $1) AS streams_received,
              (SELECT COUNT(*)::int FROM campaigns WHERE funder = $1) AS campaigns,
              (SELECT COUNT(*)::int FROM escrow_deals WHERE buyer = $1 OR seller = $1) AS escrow,
              (SELECT COUNT(*)::int FROM staking_pools WHERE owner = $1) AS pools
          `,
          values: [wallet],
        })
      : Promise.resolve({ rows: [{}] }),
  ]);

  const t = totals.rows[0] ?? {};
  return {
    totals: {
      locks: t.locks ?? 0,
      hardLocks: t.hard_locks ?? 0,
      vests: t.vests ?? 0,
      streams: t.streams ?? 0,
      campaigns: t.campaigns ?? 0,
      claims: t.claims ?? 0,
      escrow: t.escrow ?? 0,
      pools: t.pools ?? 0,
    },
    wallet: wallet
      ? {
          locksCreated: walletStats.rows[0]?.locks_created ?? 0,
          locksReceiving: walletStats.rows[0]?.locks_receiving ?? 0,
          streamsSent: walletStats.rows[0]?.streams_sent ?? 0,
          streamsReceived: walletStats.rows[0]?.streams_received ?? 0,
          campaigns: walletStats.rows[0]?.campaigns ?? 0,
          escrow: walletStats.rows[0]?.escrow ?? 0,
          pools: walletStats.rows[0]?.pools ?? 0,
        }
      : null,
    featured: featured.rows[0] ?? null,
    series: series.rows,
    activity: activity.rows,
  };
}

statsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const wallet = typeof req.query.wallet === "string" ? req.query.wallet.trim().toLowerCase() : "";
    const days = Math.min(Math.max(Number.parseInt(String(req.query.days || "90"), 10) || 90, 7), 180);
    const data = await cached("stats", `${days}:${wallet}`, config.statsCacheMs, () => loadStats(wallet, days));
    res.setHeader("Cache-Control", "private, max-age=5, stale-while-revalidate=15");
    ok(res, data);
  }),
);
