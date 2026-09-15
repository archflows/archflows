"use client";

import { useMemo } from "react";
import { useAccount, useReadContract, useReadContracts } from "wagmi";
import { arcFlowAbi, erc20Abi } from "@/lib/abi";
import { ARCFLOW_ADDRESS } from "@/lib/chain";
import { ZERO } from "@/lib/form-time";

const MAX_ROWS = 50;

export type PositionStatus = "Locked" | "Vesting" | "Ready" | "Unlocked" | "Claimed";

export type WalletPositionRow = {
  id: bigint;
  token: `0x${string}`;
  beneficiary: `0x${string}`;
  creator: `0x${string}`;
  amount: bigint;
  claimed: bigint;
  start: bigint;
  cliff: bigint;
  end: bigint;
  claimable: bigint;
  symbol: string;
  decimals: number;
  isHardLock: boolean;
  status: PositionStatus;
};

type PositionTuple = readonly [
  `0x${string}`,
  `0x${string}`,
  `0x${string}`,
  bigint,
  bigint,
  bigint,
  bigint,
  bigint,
];

function statusOf(row: {
  amount: bigint;
  claimed: bigint;
  claimable: bigint;
  start: bigint;
  cliff: bigint;
  end: bigint;
}): { isHardLock: boolean; status: PositionStatus } {
  const now = BigInt(Math.floor(Date.now() / 1000));
  const isHardLock = row.cliff === row.end;
  const isDone = now >= row.end;
  const fullyClaimed = isDone && row.claimed >= row.amount && row.claimable === 0n;

  if (fullyClaimed) return { isHardLock, status: "Claimed" };
  if (row.claimable > 0n) return { isHardLock, status: "Ready" };
  if (isDone) return { isHardLock, status: "Unlocked" };
  if (isHardLock) return { isHardLock, status: "Locked" };
  return { isHardLock, status: "Vesting" };
}

export function useWalletPositions() {
  const { address } = useAccount();
  const enabled = Boolean(address) && ARCFLOW_ADDRESS !== ZERO;

  const { data: createdCount, isPending: createdPending } = useReadContract({
    address: ARCFLOW_ADDRESS,
    abi: arcFlowAbi,
    functionName: "creatorLockCount",
    args: address ? [address] : undefined,
    query: { enabled },
  });
  const { data: receivedCount, isPending: receivedPending } = useReadContract({
    address: ARCFLOW_ADDRESS,
    abi: arcFlowAbi,
    functionName: "beneficiaryLockCount",
    args: address ? [address] : undefined,
    query: { enabled },
  });

  const created = Math.min(Number(createdCount ?? 0n), MAX_ROWS);
  const received = Math.min(Number(receivedCount ?? 0n), MAX_ROWS);

  const idContracts = useMemo(
    () =>
      address
        ? [
            ...Array.from({ length: created }, (_, i) => ({
              address: ARCFLOW_ADDRESS,
              abi: arcFlowAbi,
              functionName: "locksByCreator" as const,
              args: [address, BigInt(i)] as const,
            })),
            ...Array.from({ length: received }, (_, i) => ({
              address: ARCFLOW_ADDRESS,
              abi: arcFlowAbi,
              functionName: "locksByBeneficiary" as const,
              args: [address, BigInt(i)] as const,
            })),
          ]
        : [],
    [address, created, received],
  );

  const { data: idResults, isPending: idsPending } = useReadContracts({
    contracts: idContracts,
    query: { enabled: enabled && idContracts.length > 0 },
  });

  const ids = useMemo(() => {
    const seen = new Set<string>();
    const out: bigint[] = [];
    for (const row of idResults ?? []) {
      if (row.status !== "success" || row.result === undefined) continue;
      const id = row.result as bigint;
      const key = id.toString();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(id);
    }
    return out;
  }, [idResults]);

  const detailContracts = useMemo(
    () =>
      ids.flatMap((id) => [
        {
          address: ARCFLOW_ADDRESS,
          abi: arcFlowAbi,
          functionName: "positions" as const,
          args: [id] as const,
        },
        {
          address: ARCFLOW_ADDRESS,
          abi: arcFlowAbi,
          functionName: "claimable" as const,
          args: [id] as const,
        },
      ]),
    [ids],
  );

  const { data: detailResults, isPending: detailsPending } = useReadContracts({
    contracts: detailContracts,
    query: { enabled: enabled && detailContracts.length > 0 },
  });

  const rawRows = useMemo(() => {
    return ids.flatMap((id, i) => {
      const posRow = detailResults?.[i * 2];
      const claimRow = detailResults?.[i * 2 + 1];
      if (!posRow || posRow.status !== "success" || !posRow.result) return [];
      const pos = posRow.result as PositionTuple;
      if (!pos[0] || pos[0] === ZERO) return [];
      const claimable = claimRow?.status === "success" ? (claimRow.result as bigint) : 0n;
      return [
        {
          id,
          token: pos[0],
          beneficiary: pos[1],
          creator: pos[2],
          amount: pos[3],
          claimed: pos[4],
          start: pos[5],
          cliff: pos[6],
          end: pos[7],
          claimable,
        },
      ];
    });
  }, [detailResults, ids]);

  const tokenAddresses = useMemo(() => {
    const seen = new Set<string>();
    const out: `0x${string}`[] = [];
    for (const row of rawRows) {
      const key = row.token.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(row.token);
    }
    return out;
  }, [rawRows]);

  const tokenContracts = useMemo(
    () =>
      tokenAddresses.flatMap((token) => [
        { address: token, abi: erc20Abi, functionName: "symbol" as const },
        { address: token, abi: erc20Abi, functionName: "decimals" as const },
      ]),
    [tokenAddresses],
  );

  const { data: tokenResults } = useReadContracts({
    contracts: tokenContracts,
    query: { enabled: enabled && tokenContracts.length > 0 },
  });

  const tokenMeta = useMemo(() => {
    const map = new Map<string, { symbol: string; decimals: number }>();
    tokenAddresses.forEach((token, i) => {
      const symbolRow = tokenResults?.[i * 2];
      const decimalsRow = tokenResults?.[i * 2 + 1];
      map.set(token.toLowerCase(), {
        symbol: symbolRow?.status === "success" ? String(symbolRow.result) : "Token",
        decimals: decimalsRow?.status === "success" ? Number(decimalsRow.result) : 18,
      });
    });
    return map;
  }, [tokenAddresses, tokenResults]);

  const rows = useMemo<WalletPositionRow[]>(() => {
    return rawRows
      .map((row) => {
        const meta = tokenMeta.get(row.token.toLowerCase()) ?? { symbol: "Token", decimals: 18 };
        const { isHardLock, status } = statusOf(row);
        return { ...row, ...meta, isHardLock, status };
      })
      .sort((a, b) => Number(b.id - a.id));
  }, [rawRows, tokenMeta]);

  const pending =
    enabled &&
    (createdPending ||
      receivedPending ||
      (idContracts.length > 0 && idsPending) ||
      (ids.length > 0 && detailsPending));

  return { rows, pending, address };
}
