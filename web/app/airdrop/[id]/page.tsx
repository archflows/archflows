"use client";

import { use } from "react";
import { formatUnits } from "viem";
import { useReadContract } from "wagmi";
import { distributorAbi, erc20Abi } from "@/lib/abi";
import { ARCFLOW_DISTRIBUTOR_ADDRESS, EXPLORER_URL } from "@/lib/chain";
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

export default function AirdropProofPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: key } = use(params);
  const { data: proof, isLoading } = useProofRecord("airdrop", key);
  const recordId = isTxHash(key) ? proof?.id ?? null : (proof?.id ?? key);
  const campaignId = recordId ? BigInt(recordId) : undefined;
  useCanonicalProofPath("airdrop", key, proof?.txHash);

  const { data: campaign } = useReadContract({
    address: ARCFLOW_DISTRIBUTOR_ADDRESS,
    abi: distributorAbi,
    functionName: "campaigns",
    args: campaignId !== undefined ? [campaignId] : undefined,
    query: { enabled: campaignId !== undefined },
  });
  const token = campaign?.[0];
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

  const missing = isTxHash(key) ? !isLoading && !recordId : Boolean(campaign && !enabled);
  const deposited =
    campaign?.[3] !== undefined
      ? Number(formatUnits(campaign[3], decimals ?? 18)).toLocaleString("en-US", {
          maximumFractionDigits: 6,
        })
      : "—";

  return (
    <ProofFrame
      tag="// PROOF OF AIRDROP · ARC TESTNET"
      title={`${symbol ? `${symbol} ` : ""}Campaign #${recordId ?? "…"}`}
      status={campaign?.[9] ? "Canceled" : "Live"}
      loading={isTxHash(key) && isLoading}
      missing={missing}
      missingLabel="Airdrop not found"
      createHref="/dashboard/airdrops"
      createLabel="Create airdrop"
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
          { key: "Deposited", value: `${deposited} ${symbol ?? ""}` },
          { key: "Funder", value: <span className="mono">{short(campaign?.[1])}</span> },
          {
            key: "Claim window",
            value:
              campaign?.[5] && campaign?.[6]
                ? `${dateFmt.format(new Date(Number(campaign[5]) * 1000))} → ${dateFmt.format(
                    new Date(Number(campaign[6]) * 1000),
                  )}`
                : "—",
          },
          { key: "Transaction", value: <span className="mono">{short(proof?.txHash ?? key)}</span> },
        ]}
      />
    </ProofFrame>
  );
}
