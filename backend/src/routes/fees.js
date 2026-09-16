import { Router } from "express";
import { query, withTransaction } from "../db.js";
import { config } from "../config.js";
import { asyncHandler } from "../middleware/async-handler.js";
import { created, ok } from "../lib/respond.js";
import { badRequest, conflict, notFound } from "../errors.js";
import { commission, feePolicy } from "../lib/referral.js";
import { notifyReferralEarning } from "../lib/notifications-store.js";
import { payoutAddress, sendUsdcPayout, verifyLockFee } from "../lib/chain.js";
import {
  asAddress,
  asEnum,
  asId,
  asToken,
  asTxHash,
  requireFields,
  requireObject,
} from "../lib/validate.js";

export const feesRouter = Router();

const MAX_LOCKS_PER_SETTLEMENT = 50;

async function hydrate(settlement) {
  const [locks, earning] = await Promise.all([
    query("SELECT lock_id, fee_usdc, tx_hash FROM fee_settlement_locks WHERE settlement_id = $1", [
      settlement.id,
    ]),
    query("SELECT * FROM referral_earnings WHERE settlement_id = $1", [settlement.id]),
  ]);
  return { ...settlement, locks: locks.rows, earning: earning.rows[0] ?? null };
}

/** Pays a rebate and records the outcome. A failure is recorded, never thrown away. */
async function payRebate(settlement) {
  if (BigInt(settlement.rebate_usdc) <= 0n) return settlement;
  try {
    const txHash = await sendUsdcPayout({ to: settlement.wallet, amount: settlement.rebate_usdc });
    const { rows } = await query(
      `UPDATE fee_settlements
       SET rebate_status = 'paid', rebate_tx_hash = $2, rebate_error = NULL, updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [settlement.id, txHash],
    );
    return rows[0];
  } catch (error) {
    // The user is still owed this. Leave it retryable rather than failing the whole create.
    const { rows } = await query(
      `UPDATE fee_settlements
       SET rebate_status = 'failed', rebate_error = $2, updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [settlement.id, String(error?.message ?? "payout failed").slice(0, 500)],
    );
    return rows[0];
  }
}

/**
 * Settle the fees for one create.
 *
 * Everything that matters is re-derived here rather than taken from the body: each lock's fee
 * is read from its on-chain `FeePaid` log, and a lock can only ever belong to one settlement.
 * That makes the rebate impossible to farm by replaying locks, and it means referral
 * commission is credited on the fee the platform actually kept.
 */
feesRouter.post(
  "/settle",
  asyncHandler(async (req, res) => {
    const body = requireObject(req.body);
    requireFields(body, ["batchId", "wallet", "locks"]);

    const batchId = asToken(body.batchId, "batchId");
    const wallet = asAddress(body.wallet, "wallet");
    const kind = body.kind ? asEnum(body.kind, "kind", ["lock", "vest"]) : "lock";

    if (!Array.isArray(body.locks) || body.locks.length === 0) {
      throw badRequest("locks must be a non-empty array");
    }
    if (body.locks.length > MAX_LOCKS_PER_SETTLEMENT) {
      throw badRequest(`A settlement cannot contain more than ${MAX_LOCKS_PER_SETTLEMENT} locks`);
    }

    const existing = await query("SELECT * FROM fee_settlements WHERE id = $1", [batchId]);
    if (existing.rows[0]) {
      // Replay of a create the browser already reported. Retry a stuck rebate, never re-credit.
      const settled =
        existing.rows[0].rebate_status === "failed"
          ? await payRebate(existing.rows[0])
          : existing.rows[0];
      ok(res, await hydrate(settled));
      return;
    }

    const entries = body.locks.map((entry, index) => {
      const item = requireObject(entry);
      const txHash = asTxHash(item.txHash ?? item.tx_hash, `locks[${index}].txHash`);
      if (!txHash) throw badRequest(`locks[${index}].txHash is required`);
      return { lockId: asId(item.lockId ?? item.id, `locks[${index}].lockId`), txHash };
    });

    const unique = new Set(entries.map((e) => e.lockId));
    if (unique.size !== entries.length) throw badRequest("locks contains duplicate lock ids");

    // Verified against Arc, one by one. A lock that did not really pay a fee never counts.
    const verified = [];
    for (const entry of entries) {
      const feeUsdc = await verifyLockFee({
        txHash: entry.txHash,
        lockId: entry.lockId,
        referee: wallet,
      });
      verified.push({ ...entry, feeUsdc });
    }

    const paidUsdc = verified.reduce((total, v) => total + BigInt(v.feeUsdc), 0n).toString();
    const { policy, rebate } = feePolicy({ paidUsdc, lockCount: verified.length });

    const signup = await query("SELECT referrer FROM referral_signups WHERE referee = $1", [wallet]);
    const referrer = signup.rows[0]?.referrer ?? null;
    const split = referrer ? commission(policy) : null;

    const settlement = await withTransaction(async (client) => {
      const { rows } = await client.query(
        `INSERT INTO fee_settlements (
           id, wallet, kind, lock_count, paid_usdc, policy_usdc, rebate_usdc, rebate_status
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         ON CONFLICT (id) DO NOTHING
         RETURNING *`,
        [
          batchId,
          wallet,
          kind,
          verified.length,
          paidUsdc,
          policy,
          rebate,
          BigInt(rebate) > 0n ? "pending" : "none",
        ],
      );
      if (!rows[0]) throw conflict("This create was already settled");

      for (const entry of verified) {
        const link = await client.query(
          `INSERT INTO fee_settlement_locks (lock_id, settlement_id, fee_usdc, tx_hash)
           VALUES ($1,$2,$3,$4)
           ON CONFLICT (lock_id) DO NOTHING
           RETURNING lock_id`,
          [entry.lockId, batchId, entry.feeUsdc, entry.txHash],
        );
        if (!link.rows[0]) {
          throw conflict(`Lock ${entry.lockId} was already settled in another batch`);
        }
      }

      if (referrer && split) {
        await client.query(
          `INSERT INTO referral_earnings (
             referrer, referee, settlement_id, source, fee_usdc,
             gross_usdc, platform_usdc, net_usdc, rate_bps, platform_bps
           ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
           ON CONFLICT (settlement_id) DO NOTHING`,
          [
            referrer,
            wallet,
            batchId,
            kind,
            policy,
            split.gross,
            split.platform,
            split.net,
            split.rateBps,
            split.platformBps,
          ],
        );
        await client.query(
          "UPDATE referral_signups SET activated_at = NOW() WHERE referee = $1 AND activated_at IS NULL",
          [wallet],
        );
      }

      return rows[0];
    });

    const hydrated = await hydrate(await payRebate(settlement));
    if (referrer && split && hydrated.earning) {
      void notifyReferralEarning(referrer, wallet, hydrated.earning.net_usdc).catch((error) => {
        console.warn("[notifications] referral earning", error);
      });
    }
    created(res, hydrated);
  }),
);

feesRouter.get(
  "/settlements",
  asyncHandler(async (req, res) => {
    const wallet = asAddress(req.query.wallet, "wallet");
    const { rows } = await query(
      `SELECT * FROM fee_settlements WHERE wallet = $1 ORDER BY created_at DESC LIMIT 50`,
      [wallet],
    );
    ok(res, {
      items: rows,
      owedUsdc: rows
        .filter((row) => row.rebate_status === "pending" || row.rebate_status === "failed")
        .reduce((total, row) => total + BigInt(row.rebate_usdc), 0n)
        .toString(),
      payoutsEnabled: Boolean(payoutAddress()),
      policy: { lockUnits: config.fees.lockUnits, splitUnits: config.fees.splitUnits },
    });
  }),
);

/** Lets a rebate that failed on the first attempt be retried without redoing the create. */
feesRouter.post(
  "/settlements/:id/retry",
  asyncHandler(async (req, res) => {
    const id = asToken(req.params.id, "id");
    const { rows } = await query("SELECT * FROM fee_settlements WHERE id = $1", [id]);
    if (!rows[0]) throw notFound("Settlement not found");
    if (rows[0].rebate_status === "paid") {
      ok(res, await hydrate(rows[0]));
      return;
    }
    if (BigInt(rows[0].rebate_usdc) <= 0n) throw badRequest("This settlement has no rebate owed");
    ok(res, await hydrate(await payRebate(rows[0])));
  }),
);
