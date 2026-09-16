import { Router } from "express";
import { query, withTransaction } from "../db.js";
import { config } from "../config.js";
import { asyncHandler } from "../middleware/async-handler.js";
import { created, ok } from "../lib/respond.js";
import { badRequest, conflict, notFound } from "../errors.js";
import { asCode, generateCode } from "../lib/referral.js";
import { notifyReferralSignup } from "../lib/notifications-store.js";
import { assertWithdrawalSignature, payoutAddress, sendUsdcPayout } from "../lib/chain.js";
import {
  asAddress,
  asAmount,
  asOptionalAmount,
  requireFields,
  requireObject,
} from "../lib/validate.js";

export const referralsRouter = Router();

const MAX_CODE_ATTEMPTS = 5;

/** Every wallet that opens the referral page gets a code, created on first view. */
async function ensureAccount(wallet) {
  const existing = await query("SELECT * FROM referral_accounts WHERE wallet = $1", [wallet]);
  if (existing.rows[0]) return existing.rows[0];

  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
    const { rows } = await query(
      `INSERT INTO referral_accounts (wallet, code)
       VALUES ($1, $2)
       ON CONFLICT (code) DO NOTHING
       RETURNING *`,
      [wallet, generateCode()],
    );
    if (rows[0]) return rows[0];
    // Either the code collided or the wallet raced us in. Re-read before retrying.
    const raced = await query("SELECT * FROM referral_accounts WHERE wallet = $1", [wallet]);
    if (raced.rows[0]) return raced.rows[0];
  }
  throw conflict("Could not allocate a referral code, try again");
}

async function balanceOf(wallet, client = null) {
  const run = client ? (text, values) => client.query(text, values) : query;
  const { rows } = await run(
    `SELECT
       COALESCE((SELECT SUM(net_usdc::numeric) FROM referral_earnings WHERE referrer = $1), 0)::text AS earned,
       COALESCE((SELECT SUM(amount_usdc::numeric) FROM referral_withdrawals
                 WHERE referrer = $1 AND status IN ('pending', 'paid')), 0)::text AS reserved`,
    [wallet],
  );
  const earned = BigInt(rows[0].earned);
  const reserved = BigInt(rows[0].reserved);
  return { earned, reserved, available: earned - reserved };
}

referralsRouter.get(
  "/config",
  asyncHandler(async (_req, res) => {
    const { rateBps, platformBps, minWithdrawUsdc } = config.referral;
    ok(res, {
      rateBps,
      platformBps,
      // What the referrer actually keeps, per unit of fee the referee paid.
      effectiveBps: Math.round((rateBps * (10_000 - platformBps)) / 10_000),
      minWithdrawUsdc,
      lockFeeUsdc: config.lockFeeUsdc,
      payoutWallet: payoutAddress(),
      payoutsEnabled: Boolean(payoutAddress()),
    });
  }),
);

referralsRouter.post(
  "/code",
  asyncHandler(async (req, res) => {
    const body = requireObject(req.body);
    requireFields(body, ["wallet"]);
    const account = await ensureAccount(asAddress(body.wallet, "wallet"));
    created(res, account);
  }),
);

referralsRouter.get(
  "/resolve/:code",
  asyncHandler(async (req, res) => {
    const code = asCode(req.params.code);
    const { rows } = await query("SELECT wallet, code, tier FROM referral_accounts WHERE code = $1", [code]);
    if (!rows[0]) throw notFound(`Referral code ${code} not found`);
    ok(res, rows[0]);
  }),
);

/**
 * Bind a referee to a referrer. First code wins and the binding is permanent, so a later
 * link cannot steal an existing referral.
 */
referralsRouter.post(
  "/signup",
  asyncHandler(async (req, res) => {
    const body = requireObject(req.body);
    requireFields(body, ["wallet", "code"]);
    const referee = asAddress(body.wallet, "wallet");
    const code = asCode(body.code);

    const existing = await query("SELECT * FROM referral_signups WHERE referee = $1", [referee]);
    if (existing.rows[0]) {
      ok(res, { ...existing.rows[0], alreadyBound: true });
      return;
    }

    const owner = await query("SELECT wallet FROM referral_accounts WHERE code = $1", [code]);
    if (!owner.rows[0]) throw notFound(`Referral code ${code} not found`);
    const referrer = owner.rows[0].wallet;
    if (referrer === referee) throw badRequest("You cannot use your own referral code");

    const { rows } = await query(
      `INSERT INTO referral_signups (referee, referrer, code)
       VALUES ($1, $2, $3)
       ON CONFLICT (referee) DO NOTHING
       RETURNING *`,
      [referee, referrer, code],
    );
    if (!rows[0]) {
      const raced = await query("SELECT * FROM referral_signups WHERE referee = $1", [referee]);
      ok(res, { ...raced.rows[0], alreadyBound: true });
      return;
    }
    void notifyReferralSignup(referrer, referee).catch((error) => {
      console.warn("[notifications] referral signup", error);
    });
    created(res, rows[0]);
  }),
);

// Commission is credited by POST /v1/fees/settle, which is the only place that establishes
// how much fee the platform actually kept after any split rebate.

referralsRouter.get(
  "/me",
  asyncHandler(async (req, res) => {
    const wallet = asAddress(req.query.wallet, "wallet");
    const account = await ensureAccount(wallet);

    const [totals, referrer, earnings, withdrawals, referees, balance] = await Promise.all([
      query(
        `SELECT
           COUNT(*)::int AS signups,
           COUNT(activated_at)::int AS activated
         FROM referral_signups WHERE referrer = $1`,
        [wallet],
      ),
      query(
        `SELECT s.code, s.referrer AS wallet, s.created_at
         FROM referral_signups s WHERE s.referee = $1`,
        [wallet],
      ),
      query(
        `SELECT e.*, s.lock_count, s.paid_usdc, s.rebate_usdc
         FROM referral_earnings e
         JOIN fee_settlements s ON s.id = e.settlement_id
         WHERE e.referrer = $1
         ORDER BY e.created_at DESC LIMIT 25`,
        [wallet],
      ),
      query(
        `SELECT * FROM referral_withdrawals WHERE referrer = $1 ORDER BY created_at DESC LIMIT 25`,
        [wallet],
      ),
      query(
        `SELECT
           s.referee AS wallet,
           s.created_at,
           s.activated_at,
           COUNT(e.id)::int AS locks,
           COALESCE(SUM(e.net_usdc::numeric), 0)::text AS earned_usdc
         FROM referral_signups s
         LEFT JOIN referral_earnings e ON e.referee = s.referee AND e.referrer = s.referrer
         WHERE s.referrer = $1
         GROUP BY s.referee, s.created_at, s.activated_at
         ORDER BY s.created_at DESC
         LIMIT 50`,
        [wallet],
      ),
      balanceOf(wallet),
    ]);

    const volume = await query(
      `SELECT
         COALESCE(SUM(fee_usdc::numeric), 0)::text AS fee_volume,
         COALESCE(SUM(gross_usdc::numeric), 0)::text AS gross,
         COALESCE(SUM(platform_usdc::numeric), 0)::text AS platform,
         COALESCE(SUM(net_usdc::numeric), 0)::text AS net
       FROM referral_earnings WHERE referrer = $1`,
      [wallet],
    );

    const paid = await query(
      `SELECT
         COALESCE(SUM(amount_usdc::numeric) FILTER (WHERE status = 'paid'), 0)::text AS paid,
         COALESCE(SUM(amount_usdc::numeric) FILTER (WHERE status = 'pending'), 0)::text AS pending
       FROM referral_withdrawals WHERE referrer = $1`,
      [wallet],
    );

    ok(res, {
      account,
      rates: {
        rateBps: config.referral.rateBps,
        platformBps: config.referral.platformBps,
        effectiveBps: Math.round(
          (config.referral.rateBps * (10_000 - config.referral.platformBps)) / 10_000,
        ),
        minWithdrawUsdc: config.referral.minWithdrawUsdc,
        payoutsEnabled: Boolean(payoutAddress()),
      },
      referredBy: referrer.rows[0] ?? null,
      totals: {
        signups: totals.rows[0].signups,
        activated: totals.rows[0].activated,
        feeVolumeUsdc: volume.rows[0].fee_volume,
        grossUsdc: volume.rows[0].gross,
        platformUsdc: volume.rows[0].platform,
        netUsdc: volume.rows[0].net,
        paidUsdc: paid.rows[0].paid,
        pendingUsdc: paid.rows[0].pending,
        availableUsdc: balance.available.toString(),
      },
      referees: referees.rows,
      earnings: earnings.rows,
      withdrawals: withdrawals.rows,
    });
  }),
);

/**
 * Auto-approved withdrawal. The balance is reserved inside a transaction (so two parallel
 * requests cannot spend it twice), then USDC leaves the archFee wallet. A failed transfer
 * releases the reservation by moving the row to `failed`.
 */
referralsRouter.post(
  "/withdrawals",
  asyncHandler(async (req, res) => {
    const body = requireObject(req.body);
    requireFields(body, ["wallet", "nonce", "signature"]);
    const wallet = asAddress(body.wallet, "wallet");
    const requested = asOptionalAmount(body.amount, "amount");
    const min = BigInt(config.referral.minWithdrawUsdc);

    await ensureAccount(wallet);

    const pendingRow = await withTransaction(async (client) => {
      // Serializes withdrawals for this wallet against the balance read below.
      await client.query("SELECT 1 FROM referral_accounts WHERE wallet = $1 FOR UPDATE", [wallet]);
      const { available } = await balanceOf(wallet, client);
      const amount = requested === undefined ? available : BigInt(requested);

      if (amount <= 0n) throw badRequest("Nothing available to withdraw");
      if (amount < min) {
        throw badRequest(`Minimum withdrawal is ${min.toString()} USDC units`);
      }
      if (amount > available) {
        throw badRequest("Amount exceeds your available balance", {
          availableUsdc: available.toString(),
        });
      }

      await assertWithdrawalSignature({
        wallet,
        amount: amount.toString(),
        nonce: String(body.nonce),
        signature: body.signature,
      });

      const { rows } = await client.query(
        `INSERT INTO referral_withdrawals (referrer, amount_usdc, status)
         VALUES ($1, $2, 'pending') RETURNING *`,
        [wallet, amount.toString()],
      );
      return rows[0];
    });

    try {
      const txHash = await sendUsdcPayout({ to: wallet, amount: pendingRow.amount_usdc });
      const { rows } = await query(
        `UPDATE referral_withdrawals
         SET status = 'paid', tx_hash = $2, updated_at = NOW()
         WHERE id = $1 RETURNING *`,
        [pendingRow.id, txHash],
      );
      created(res, rows[0]);
    } catch (error) {
      await query(
        `UPDATE referral_withdrawals
         SET status = 'failed', failure_reason = $2, updated_at = NOW()
         WHERE id = $1`,
        [pendingRow.id, String(error?.message ?? "payout failed").slice(0, 500)],
      );
      throw error;
    }
  }),
);

referralsRouter.get(
  "/withdrawals/:id",
  asyncHandler(async (req, res) => {
    const { rows } = await query("SELECT * FROM referral_withdrawals WHERE id = $1", [
      asAmount(req.params.id, "id"),
    ]);
    if (!rows[0]) throw notFound("Withdrawal not found");
    ok(res, rows[0]);
  }),
);
