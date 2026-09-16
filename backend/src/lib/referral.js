import { randomInt } from "node:crypto";
import { config } from "../config.js";
import { badRequest } from "../errors.js";

// No I, O, 0, 1 — codes get retyped off screenshots and read out loud.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 8;
const CODE_RE = /^[A-Z2-9]{6,16}$/;

export function generateCode() {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) code += ALPHABET[randomInt(ALPHABET.length)];
  return code;
}

export function asCode(value, field = "code") {
  const code = String(value ?? "").trim().toUpperCase();
  if (!CODE_RE.test(code)) throw badRequest(`${field} must be a 6-16 character referral code`);
  return code;
}

/**
 * Referrer earns `rateBps` of the fee the referee paid; the platform keeps `platformBps`
 * of that commission. Integer math throughout — USDC units are never fractional, and
 * the platform absorbs the rounding dust rather than the referrer.
 */
export function commission(feeUsdc, { rateBps = config.referral.rateBps, platformBps = config.referral.platformBps } = {}) {
  const fee = BigInt(feeUsdc);
  const gross = (fee * BigInt(rateBps)) / 10_000n;
  const platform = (gross * BigInt(platformBps)) / 10_000n;
  return {
    gross: gross.toString(),
    platform: platform.toString(),
    net: (gross - platform).toString(),
    rateBps,
    platformBps,
  };
}

/**
 * What one create should cost, and how much of what was paid on-chain to refund.
 * The contract charges its flat fee per lock() call, so splitting across N wallets pays
 * N x that fee; policy is a flat price per create regardless of N.
 */
export function feePolicy({ paidUsdc, lockCount }) {
  const paid = BigInt(paidUsdc);
  const target = BigInt(lockCount > 1 ? config.fees.splitUnits : config.fees.lockUnits);
  // Never keep more than was actually paid — that would invent a debt the user never owed.
  const policy = paid < target ? paid : target;
  return { policy: policy.toString(), rebate: (paid - policy).toString() };
}

export function sumUnits(rows, column) {
  return rows.reduce((total, row) => total + BigInt(row[column] ?? "0"), 0n);
}

/** 6-decimal USDC units -> a display string, without pulling in a formatting dependency. */
export function formatUsdc(units) {
  const value = BigInt(units ?? "0");
  const whole = value / 1_000_000n;
  const frac = (value % 1_000_000n).toString().padStart(6, "0").replace(/0+$/, "");
  return frac ? `${whole}.${frac}` : whole.toString();
}
