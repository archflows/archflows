"use client";

import { use } from "react";
import { formatUnits } from "viem";
import { useReadContract } from "wagmi";
import { erc20Abi, escrowAbi } from "@/lib/abi";
import { ARCFLOW_ESCROW_ADDRESS, EXPLORER_URL } from "@/lib/chain";
import { ProofFrame, ProofKv } from "@/components/proof-frame";
import { useCanonicalProofPath, useProofRecord } from "@/hooks/useProofRecord";
import { isTxHash } from "@/lib/proof";

const ZERO = "0x0000000000000000000000000000000000000000";
const dateFmt = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "UTC",
});

function short(value?: string) {
  return value ? `${value.slice(0, 6)}…${value.slice(-4)}` : "—";
}

const STATUS = ["Empty", "Funded", "Released", "Refunded"];

export default function EscrowProofPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: key } = use(params);
  const { data: proof, isLoading } = useProofRecord("escrow", key);
  const recordId = isTxHash(key) ? proof?.id ?? null : (proof?.id ?? key);
  const dealId = recordId ? BigInt(recordId) : undefined;
  useCanonicalProofPath("escrow", key, proof?.txHash);

  const { data: deal } = useReadContract({
    address: ARCFLOW_ESCROW_ADDRESS,
    abi: escrowAbi,
    functionName: "deals",
    args: dealId !== undefined ? [dealId] : undefined,
    query: { enabled: dealId !== undefined },
  });
  const token = deal?.[0];
  const enabled = Boolean(token && token !== ZERO);
  const { data: symbol } = useReadContract({
    address: token,
    abi: erc20Abi,
    functionName: "symbol",
    query: { enabled },
  });
  const { data: decimals } = useReadContract({
    address: token,
    abi: erc20Abi,
    functionName: "decimals",
    query: { enabled },
  });

  const missing = isTxHash(key) ? !isLoading && !recordId : Boolean(deal && !enabled);
  const amount =
    deal?.[3] !== undefined
      ? Number(formatUnits(deal[3], decimals ?? 18)).toLocaleString("en-US", {
          maximumFractionDigits: 6,
        })
      : "—";

  return (
    <ProofFrame
      tag="// PROOF OF ESCROW · ARC TESTNET"
      title={`${symbol ? `${symbol} ` : ""}Deal #${recordId ?? "…"}`}
      status={STATUS[deal?.[6] ?? 0] ?? "Open"}
      loading={isTxHash(key) && isLoading}
      missing={missing}
      missingLabel="Escrow deal not found"
      createHref="/dashboard/escrow"
      createLabel="Create escrow"
      txHash={proof?.txHash ?? (isTxHash(key) ? key : null)}
    >
      <ProofKv
        rows={[
          {
            key: "Token",
            value: token ? (
              <a className="mono" href={`${EXPLORER_URL}/address/${token}`} target="_blank" rel="noreferrer">
                {symbol ? `${symbol} · ` : ""}
                {short(token)}
              </a>
            ) : (
              "—"
            ),
          },
          { key: "Amount", value: `${amount} ${symbol ?? ""}` },
          { key: "Buyer", value: <span className="mono">{short(deal?.[1])}</span> },
          { key: "Seller", value: <span className="mono">{short(deal?.[2])}</span> },
          {
            key: "Buyer refund after",
            value: deal?.[4] ? dateFmt.format(new Date(Number(deal[4]) * 1000)) : "—",
          },
          { key: "Transaction", value: <span className="mono">{short(proof?.txHash ?? key)}</span> },
        ]}
      />
    </ProofFrame>
  );
}
