"use client";

import Link from "next/link";

export function LockVestDiff({ kind }: { kind: "lock" | "vest" }) {
  if (kind === "lock") {
    return (
      <p className="max-w-2xl text-sm leading-relaxed text-white/80">
        <strong className="font-medium text-white">Hard lock</strong> freezes the full amount until
        one date. Nothing is claimable early — not a fraction. Need a cliff, then tokens unlocking
        every second?{" "}
        <Link href="/dashboard/vesting" className="text-primary underline-offset-4 hover:underline">
          Create a vest
        </Link>
        .
      </p>
    );
  }

  return (
    <p className="max-w-2xl text-sm leading-relaxed text-white/80">
      <strong className="font-medium text-white">Linear vest</strong> can wait behind a cliff, then
      releases every second. The beneficiary claims what has accrued. Want the whole bag frozen
      until one date?{" "}
      <Link href="/dashboard/locks" className="text-primary underline-offset-4 hover:underline">
        Create a lock
      </Link>
      .
    </p>
  );
}
