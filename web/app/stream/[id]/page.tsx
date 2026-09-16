"use client";

import { use } from "react";
import { formatUnits } from "viem";
import { useReadContract } from "wagmi";
import { erc20Abi, streamAbi } from "@/lib/abi";
import { ARCFLOW_STREAM_ADDRESS, EXPLORER_URL, NETWORK_BADGE } from "@/lib/chain";
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

export default function StreamProofPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: key } = use(params);
  const { data: proof, isLoading } = useProofRecord("stream", key);
  const recordId = isTxHash(key) ? proof?.id ?? null : (proof?.id ?? key);
  const streamId = recordId ? BigInt(recordId) : undefined;
  useCanonicalProofPath("stream", key, proof?.txHash);

  const { data: stream } = useReadContract({
    address: ARCFLOW_STREAM_ADDRESS,
    abi: streamAbi,
    functionName: "streams",
    args: streamId !== undefined ? [streamId] : undefined,
    query: { enabled: streamId !== undefined },
  });
  const token = stream?.[0];
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

  const missing = isTxHash(key) ? !isLoading && !recordId : Boolean(stream && !enabled);
  const amount =
    stream?.[3] !== undefined
      ? Number(formatUnits(stream[3], decimals ?? 18)).toLocaleString("en-US", {
          maximumFractionDigits: 6,
        })
      : "—";

  return (
    <ProofFrame
      tag={`// PROOF OF STREAM · ARC ${NETWORK_BADGE.toUpperCase()}`}
      title={`${symbol ? `${symbol} ` : ""}Stream #${recordId ?? "…"}`}
      status={stream?.[13] ? "Canceled" : "Streaming"}
      loading={isTxHash(key) && isLoading}
      missing={missing}
      missingLabel="Stream not found"
      createHref="/dashboard"
      createLabel="Go to dashboard"
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
          { key: "Sender", value: <span className="mono">{short(stream?.[1])}</span> },
          { key: "Recipient", value: <span className="mono">{short(stream?.[2])}</span> },
          {
            key: "Ends",
            value: stream?.[8] ? dateFmt.format(new Date(Number(stream[8]) * 1000)) : "—",
          },
          { key: "Transaction", value: <span className="mono">{short(proof?.txHash ?? key)}</span> },
        ]}
      />
    </ProofFrame>
  );
}
