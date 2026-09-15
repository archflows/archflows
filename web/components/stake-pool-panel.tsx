"use client";

import { useState } from "react";
import { formatUnits, parseUnits } from "viem";
import { useAccount, usePublicClient, useReadContract, useWriteContract } from "wagmi";
import { Loader2 } from "lucide-react";
import { erc20Abi, stakingAbi } from "@/lib/abi";
import { ARCFLOW_STAKING_ADDRESS } from "@/lib/chain";
import { ZERO, formatDuration, shorten } from "@/lib/form-time";
import { arcGas, txMessage } from "@/lib/tx";
import { WalletConnectButton } from "@/components/WalletConnectButton";

export function StakePoolPanel() {
  const publicClient = usePublicClient();
  const { address, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();

  const [poolId, setPoolId] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const id = poolId.trim() && /^\d+$/.test(poolId.trim()) ? BigInt(poolId.trim()) : undefined;
  const notDeployed = ARCFLOW_STAKING_ADDRESS === ZERO;

  const { data: pool, refetch: refetchPool } = useReadContract({
    address: ARCFLOW_STAKING_ADDRESS,
    abi: stakingAbi,
    functionName: "pools",
    args: id !== undefined ? [id] : undefined,
    query: { enabled: id !== undefined && !notDeployed },
  });
  const { data: stake, refetch: refetchStake } = useReadContract({
    address: ARCFLOW_STAKING_ADDRESS,
    abi: stakingAbi,
    functionName: "stakes",
    args: id !== undefined && address ? [id, address] : undefined,
    query: { enabled: id !== undefined && Boolean(address) },
  });
  const { data: earned, refetch: refetchEarned } = useReadContract({
    address: ARCFLOW_STAKING_ADDRESS,
    abi: stakingAbi,
    functionName: "earned",
    args: id !== undefined && address ? [id, address] : undefined,
    query: { enabled: id !== undefined && Boolean(address) },
  });
  const { data: unlocked, refetch: refetchUnlocked } = useReadContract({
    address: ARCFLOW_STAKING_ADDRESS,
    abi: stakingAbi,
    functionName: "unlockedOf",
    args: id !== undefined && address ? [id, address] : undefined,
    query: { enabled: id !== undefined && Boolean(address) },
  });

  const stakeToken = pool?.[0];
  const rewardToken = pool?.[1];
  const minLock = pool?.[9];
  const totalStaked = pool?.[3];

  const { data: stakeSymbol } = useReadContract({
    address: stakeToken,
    abi: erc20Abi,
    functionName: "symbol",
    query: { enabled: Boolean(stakeToken && stakeToken !== ZERO) },
  });
  const { data: rewardSymbol } = useReadContract({
    address: rewardToken,
    abi: erc20Abi,
    functionName: "symbol",
    query: { enabled: Boolean(rewardToken && rewardToken !== ZERO) },
  });
  const { data: stakeDecimals } = useReadContract({
    address: stakeToken,
    abi: erc20Abi,
    functionName: "decimals",
    query: { enabled: Boolean(stakeToken && stakeToken !== ZERO) },
  });
  const { data: rewardDecimals } = useReadContract({
    address: rewardToken,
    abi: erc20Abi,
    functionName: "decimals",
    query: { enabled: Boolean(rewardToken && rewardToken !== ZERO) },
  });
  const { data: allowance } = useReadContract({
    address: stakeToken,
    abi: erc20Abi,
    functionName: "allowance",
    args: address && stakeToken ? [address, ARCFLOW_STAKING_ADDRESS] : undefined,
    query: { enabled: Boolean(address && stakeToken) },
  });

  async function refresh() {
    await Promise.all([refetchPool(), refetchStake(), refetchEarned(), refetchUnlocked()]);
  }

  async function doStake() {
    if (!publicClient || !address || id === undefined || !stakeToken || stakeDecimals === undefined) return;
    setBusy(true);
    setError("");
    try {
      const value = parseUnits(amount, stakeDecimals);
      if (value <= 0n) throw new Error("Enter an amount.");
      if (allowance === undefined || allowance < value) {
        const a = await writeContractAsync({
          address: stakeToken,
          abi: erc20Abi,
          functionName: "approve",
          args: [ARCFLOW_STAKING_ADDRESS, value],
          ...arcGas,
        });
        await publicClient.waitForTransactionReceipt({ hash: a });
      }
      const hash = await writeContractAsync({
        address: ARCFLOW_STAKING_ADDRESS,
        abi: stakingAbi,
        functionName: "stake",
        args: [id, value],
        ...arcGas,
      });
      await publicClient.waitForTransactionReceipt({ hash });
      setAmount("");
      await refresh();
    } catch (e) {
      setError(txMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function doUnstake() {
    if (!publicClient || id === undefined || stakeDecimals === undefined) return;
    setBusy(true);
    setError("");
    try {
      const value = parseUnits(amount, stakeDecimals);
      const hash = await writeContractAsync({
        address: ARCFLOW_STAKING_ADDRESS,
        abi: stakingAbi,
        functionName: "unstake",
        args: [id, value],
        ...arcGas,
      });
      await publicClient.waitForTransactionReceipt({ hash });
      setAmount("");
      await refresh();
    } catch (e) {
      setError(txMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function doClaim() {
    if (!publicClient || id === undefined) return;
    setBusy(true);
    setError("");
    try {
      const hash = await writeContractAsync({
        address: ARCFLOW_STAKING_ADDRESS,
        abi: stakingAbi,
        functionName: "getReward",
        args: [id],
        ...arcGas,
      });
      await publicClient.waitForTransactionReceipt({ hash });
      await refresh();
    } catch (e) {
      setError(txMessage(e));
    } finally {
      setBusy(false);
    }
  }

  if (!isConnected) {
    return (
      <div className="panel">
        <div className="panel-body">
          <WalletConnectButton label="Connect to stake" />
        </div>
      </div>
    );
  }

  const sDec = stakeDecimals ?? 18;
  const rDec = rewardDecimals ?? 18;

  return (
    <div className="panel">
      <div className="panel-head">
        <span>Stake / unstake / claim</span>
        <span className="live live-accent">Pool</span>
      </div>
      <div className="panel-body space-y-3">
        <div className="field">
          <label className="field-label" htmlFor="stake-pool">
            Pool id
          </label>
          <input
            id="stake-pool"
            className="af-input"
            inputMode="numeric"
            placeholder="0"
            value={poolId}
            onChange={(e) => setPoolId(e.target.value.trim())}
          />
        </div>
        {pool && stakeToken !== ZERO ? (
          <div className="mono dim" style={{ fontSize: "0.78rem", lineHeight: 1.55 }}>
            Stake {stakeSymbol ?? shorten(stakeToken)} · reward {rewardSymbol ?? shorten(rewardToken)}
            <br />
            TVL{" "}
            {totalStaked !== undefined
              ? Number(formatUnits(totalStaked, sDec)).toLocaleString("en-US", {
                  maximumFractionDigits: 4,
                })
              : "—"}
            {minLock ? ` · min lock ${formatDuration(Number(minLock))}` : " · no min lock"}
            <br />
            Your stake{" "}
            {stake?.[0] !== undefined
              ? Number(formatUnits(stake[0], sDec)).toLocaleString("en-US", {
                  maximumFractionDigits: 4,
                })
              : "0"}
            {unlocked !== undefined
              ? ` · unlocked ${Number(formatUnits(unlocked, sDec)).toLocaleString("en-US", {
                  maximumFractionDigits: 4,
                })}`
              : ""}
            <br />
            Earned{" "}
            {earned !== undefined
              ? Number(formatUnits(earned, rDec)).toLocaleString("en-US", {
                  maximumFractionDigits: 6,
                })
              : "0"}
            {rewardSymbol ? ` ${rewardSymbol}` : ""}
          </div>
        ) : null}
        <div className="field">
          <label className="field-label" htmlFor="stake-amt">
            Amount
          </label>
          <input
            id="stake-amt"
            className="af-input"
            inputMode="decimal"
            placeholder="0.0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        {error ? <div className="alert alert-error">{error}</div> : null}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
          <button type="button" className="btn sm" disabled={busy || id === undefined || !amount} onClick={doStake}>
            {busy ? <Loader2 className="size-3.5 animate-spin" /> : null}
            Stake
          </button>
          <button type="button" className="btn sm" disabled={busy || id === undefined || !amount} onClick={doUnstake}>
            Unstake
          </button>
          <button
            type="button"
            className="btn sm"
            disabled={busy || id === undefined || !earned || earned === 0n}
            onClick={doClaim}
          >
            Claim rewards
          </button>
        </div>
      </div>
    </div>
  );
}
