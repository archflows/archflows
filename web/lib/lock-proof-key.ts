import { cache } from "react";
import { createPublicClient, http, type Hash } from "viem";
import { arcFlowAbi } from "@/lib/abi";
import { ARC_TESTNET } from "@/lib/chain";
import { isTxHash } from "@/lib/proof";
import { eventArgs } from "@/lib/tx";

export type ResolvedLockProofKey = {
  lockId: string | null;
  /** Prefer tx hash for share / OG URLs when available. */
  canonicalKey: string;
  txHash: string | null;
};

async function serverGetLock(key: string): Promise<Record<string, unknown> | null> {
  const base = (process.env.ARCFLOW_API_URL || "http://localhost:4000").replace(/\/$/, "");
  const apiKey = process.env.ARCFLOW_API_KEY || "";
  if (!apiKey) return null;

  try {
    const res = await fetch(`${base}/v1/locks/${encodeURIComponent(key)}`, {
      headers: { accept: "application/json", "x-api-key": apiKey },
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
    const body = (await res.json()) as { ok?: boolean; data?: Record<string, unknown> };
    if (!res.ok || !body.ok || !body.data) return null;
    return body.data;
  } catch {
    return null;
  }
}

async function lockIdFromTxReceipt(txHash: string): Promise<string | null> {
  try {
    const client = createPublicClient({
      chain: ARC_TESTNET,
      transport: http(ARC_TESTNET.rpcUrls.default.http[0]),
    });
    const receipt = await client.getTransactionReceipt({ hash: txHash as Hash });
    return eventArgs<{ id: bigint }>(receipt, arcFlowAbi, "Locked")[0]?.id?.toString() ?? null;
  } catch {
    return null;
  }
}

function readRowTx(row: Record<string, unknown> | null) {
  const tx = row?.tx_hash;
  return typeof tx === "string" && isTxHash(tx) ? tx.toLowerCase() : null;
}

function readRowId(row: Record<string, unknown> | null) {
  return row?.id == null ? null : String(row.id);
}

export async function resolveLockProofKey(key: string): Promise<ResolvedLockProofKey> {
  const normalized = key.trim();
  if (!normalized) {
    return { lockId: null, canonicalKey: normalized, txHash: null };
  }

  const row = await serverGetLock(normalized);
  const rowId = readRowId(row);
  const rowTx = readRowTx(row);

  if (isTxHash(normalized)) {
    const txHash = normalized.toLowerCase();
    const lockId = rowId ?? (await lockIdFromTxReceipt(txHash));
    return { lockId, canonicalKey: txHash, txHash };
  }

  if (/^\d+$/.test(normalized)) {
    const lockId = rowId ?? normalized;
    const txHash = rowTx;
    return {
      lockId,
      canonicalKey: txHash ?? normalized,
      txHash,
    };
  }

  return { lockId: rowId, canonicalKey: normalized, txHash: rowTx };
}

/** Dedupe backend/RPC lookups within one server request. */
export const resolveLockProofKeyCached = cache(resolveLockProofKey);
