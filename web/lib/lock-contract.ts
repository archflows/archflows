import type { arcFlowAbi } from "@/lib/abi";

type LockArgs = readonly [
  `0x${string}`,
  `0x${string}`,
  bigint,
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

/** Prefer `lockWithReferral` when a referrer is known so the fee splits on-chain. */
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

export type ArcFlowWriteAbi = typeof arcFlowAbi;
