"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import type { Hash, TransactionReceipt } from "viem";
import { usePublicClient } from "wagmi";
import { arcFlowAbi, distributorAbi, escrowAbi, stakingAbi, streamAbi } from "@/lib/abi";
import {
  getCampaign,
  getEscrow,
  getLock,
  getPool,
  getStream,
} from "@/lib/backend";
import { isTxHash, proofPath, type ProofModule } from "@/lib/proof";
import { eventArgs } from "@/lib/tx";

function readId(row: Record<string, unknown> | null) {
  return row?.id == null ? null : String(row.id);
}

function readHash(row: Record<string, unknown> | null, key: string) {
  const value = row?.[key];
  return typeof value === "string" && isTxHash(value) ? value.toLowerCase() : null;
}

function idFromReceipt(module: ProofModule, receipt: TransactionReceipt) {
  if (module === "lock") {
    return eventArgs<{ id: bigint }>(receipt, arcFlowAbi, "Locked")[0]?.id?.toString() ?? null;
  }
  if (module === "stream") {
    return eventArgs<{ id: bigint }>(receipt, streamAbi, "Created")[0]?.id?.toString() ?? null;
  }
  if (module === "airdrop") {
    return eventArgs<{ id: bigint }>(receipt, distributorAbi, "CampaignCreated")[0]?.id?.toString() ?? null;
  }
  if (module === "escrow") {
    return eventArgs<{ id: bigint }>(receipt, escrowAbi, "Created")[0]?.id?.toString() ?? null;
  }
  return eventArgs<{ id: bigint }>(receipt, stakingAbi, "PoolCreated")[0]?.id?.toString() ?? null;
}

async function lookupRow(module: ProofModule, key: string) {
  if (module === "lock") return getLock(key);
  if (module === "stream") return getStream(key);
  if (module === "airdrop") return getCampaign(key);
  if (module === "escrow") return getEscrow(key);
  return getPool(key);
}

export function useProofRecord(module: ProofModule, key: string) {
  const publicClient = usePublicClient();

  return useQuery({
    queryKey: ["arcflow-api", "proof", module, key.toLowerCase(), publicClient ? "rpc" : "api"],
    enabled: Boolean(key),
    staleTime: 15_000,
    queryFn: async () => {
      const row = await lookupRow(module, key);
      const id = readId(row);
      const txHash = readHash(row, "tx_hash") ?? (isTxHash(key) ? key.toLowerCase() : null);
      const unlockTxHash = readHash(row, "unlock_tx_hash");
      if (id) return { id, row, txHash, unlockTxHash };
      if (!isTxHash(key)) return { id: key, row: null, txHash: null, unlockTxHash: null };
      if (!publicClient) return { id: null, row: null, txHash: key.toLowerCase(), unlockTxHash: null };
      try {
        const receipt = await publicClient.getTransactionReceipt({ hash: key as Hash });
        return {
          id: idFromReceipt(module, receipt),
          row: null,
          txHash: key.toLowerCase(),
          unlockTxHash: null,
        };
      } catch {
        return { id: null, row: null, txHash: key.toLowerCase(), unlockTxHash: null };
      }
    },
  });
}

export function useCanonicalProofPath(module: ProofModule, key: string, txHash?: string | null) {
  const router = useRouter();
  useEffect(() => {
    if (isTxHash(key) || !isTxHash(txHash)) return;
    router.replace(proofPath(module, txHash));
  }, [module, key, txHash, router]);
}
