"use client";

import { use } from "react";
import { formatUnits } from "viem";
import { useReadContract } from "wagmi";
import { erc20Abi, stakingAbi } from "@/lib/abi";
import { ARCFLOW_STAKING_ADDRESS, EXPLORER_URL } from "@/lib/chain";
import { ProofFrame, ProofKv } from "@/components/proof-frame";
import { useCanonicalProofPath, useProofRecord } from "@/hooks/useProofRecord";
import { isTxHash } from "@/lib/proof";

const ZERO = "0x0000000000000000000000000000000000000000";

function short(value?: string) {
  return value ? `${value.slice(0, 6)}…${value.slice(-4)}` : "—";
}

export default function StakingProofPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: key } = use(params);
  const { data: proof, isLoading } = useProofRecord("staking", key);
  const recordId = isTxHash(key) ? proof?.id ?? null : (proof?.id ?? key);
  const poolId = recordId ? BigInt(recordId) : undefined;
  useCanonicalProofPath("staking", key, proof?.txHash);

  const { data: pool } = useReadContract({
    address: ARCFLOW_STAKING_ADDRESS,
    abi: stakingAbi,
    functionName: "pools",
    args: poolId !== undefined ? [poolId] : undefined,
    query: { enabled: poolId !== undefined },
  });
  const stakeToken = pool?.[0];
  const rewardToken = pool?.[1];
  const enabled = Boolean(stakeToken && stakeToken !== ZERO);
  const { data: stakeSymbol } = useReadContract({
    address: stakeToken,
    abi: erc20Abi,
    functionName: "symbol",
    query: { enabled },
  });
  const { data: rewardSymbol } = useReadContract({
    address: rewardToken,
    abi: erc20Abi,
    functionName: "symbol",
    query: { enabled: Boolean(rewardToken && rewardToken !== ZERO) },
  });
  const { data: decimals } = useReadContract({
    address: stakeToken,
    abi: erc20Abi,
    functionName: "decimals",
    query: { enabled },
  });

  const missing = isTxHash(key) ? !isLoading && !recordId : Boolean(pool && !enabled);
  const staked =
    pool?.[3] !== undefined
      ? Number(formatUnits(pool[3], decimals ?? 18)).toLocaleString("en-US", {
          maximumFractionDigits: 6,
        })
      : "—";

  return (
    <ProofFrame
      tag="// PROOF OF STAKING · ARC TESTNET"
      title={`${stakeSymbol ? `${stakeSymbol} ` : ""}Pool #${recordId ?? "…"}`}
      status={pool?.[13] ? "Paused" : "Live"}
      loading={isTxHash(key) && isLoading}
      missing={missing}
      missingLabel="Staking pool not found"
      createHref="/dashboard/staking"
      createLabel="Create pool"
      txHash={proof?.txHash ?? (isTxHash(key) ? key : null)}
    >
      <ProofKv
        rows={[
          {
            key: "Stake token",
            value: stakeToken ? (
              <a className="mono" href={`${EXPLORER_URL}/address/${stakeToken}`} target="_blank" rel="noreferrer">
                {stakeSymbol ? `${stakeSymbol} · ` : ""}
                {short(stakeToken)}
              </a>
            ) : (
              "—"
            ),
          },
          {
            key: "Reward token",
            value: rewardToken ? (
              <a className="mono" href={`${EXPLORER_URL}/address/${rewardToken}`} target="_blank" rel="noreferrer">
                {rewardSymbol ? `${rewardSymbol} · ` : ""}
                {short(rewardToken)}
              </a>
            ) : (
              "—"
            ),
          },
          { key: "Total staked", value: `${staked} ${stakeSymbol ?? ""}` },
          { key: "Owner", value: <span className="mono">{short(pool?.[2])}</span> },
          { key: "Transaction", value: <span className="mono">{short(proof?.txHash ?? key)}</span> },
        ]}
      />
    </ProofFrame>
  );
}
