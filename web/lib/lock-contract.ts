import type { arcFlowAbi } from "@/lib/abi";

type LockArgs = readonly [
  `0x${string}`,
  `0x${string}`,
  bigint,
  bigint,
  bigint,
  bigint,
];

type SplitArgs = readonly [
  `0x${string}`,
  readonly `0x${string}`[],
  readonly bigint[],
  bigint,
  bigint,
  bigint,
];

export type LockWriteCall =
  | {
      functionName: "lock";
      args: LockArgs;
    }
  | {
      functionName: "lockWithReferral";
      args: readonly [...LockArgs, `0x${string}`];
    };

export type SplitLockWriteCall =
  | {
      functionName: "lockSplit";
      args: SplitArgs;
    }
  | {
      functionName: "lockSplitWithReferral";
      args: readonly [...SplitArgs, `0x${string}`];
    };

/** Prefer `lockWithReferral` when a referrer is known so the $10 fee splits on-chain. */
export function buildLockWriteCall(
  referrer: `0x${string}` | null | undefined,
  args: {
    token: `0x${string}`;
    beneficiary: `0x${string}`;
    amount: bigint;
    start: bigint;
    cliff: bigint;
    end: bigint;
  },
): LockWriteCall {
  const base: LockArgs = [
    args.token,
    args.beneficiary,
    args.amount,
    args.start,
    args.cliff,
    args.end,
  ];

  if (referrer) {
    return {
      functionName: "lockWithReferral",
      args: [...base, referrer],
    };
  }

  return { functionName: "lock", args: base };
}

/** One tx, $15 fee. Referral is 15% of that $15 — same split as a $10 lock. */
export function buildSplitLockWriteCall(
  referrer: `0x${string}` | null | undefined,
  args: {
    token: `0x${string}`;
    beneficiaries: readonly `0x${string}`[];
    amounts: readonly bigint[];
    start: bigint;
    cliff: bigint;
    end: bigint;
  },
): SplitLockWriteCall {
  const base: SplitArgs = [
    args.token,
    args.beneficiaries,
    args.amounts,
    args.start,
    args.cliff,
    args.end,
  ];

  if (referrer) {
    return {
      functionName: "lockSplitWithReferral",
      args: [...base, referrer],
    };
  }

  return { functionName: "lockSplit", args: base };
}

export type ArcFlowWriteAbi = typeof arcFlowAbi;
