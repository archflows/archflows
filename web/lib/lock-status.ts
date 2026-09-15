/** Share-card / OG status for a lock position. */
export type LockProofStatus = "Locked" | "Unlocked" | "Claimed";

export function lockProofStatus(opts: {
  amount: bigint;
  claimed: bigint;
  end: bigint | number;
  nowSec?: number;
}): LockProofStatus {
  const now = opts.nowSec ?? Math.floor(Date.now() / 1000);
  const end = typeof opts.end === "bigint" ? Number(opts.end) : opts.end;

  if (opts.amount > 0n && opts.claimed >= opts.amount) return "Claimed";
  if (Number.isFinite(end) && now >= end) return "Unlocked";
  return "Locked";
}

export function isLockOpen(status: LockProofStatus) {
  return status === "Unlocked" || status === "Claimed";
}
