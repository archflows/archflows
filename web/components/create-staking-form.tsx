"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { formatUnits, isAddress, parseUnits } from "viem";
import { useAccount, usePublicClient, useReadContract, useWriteContract } from "wagmi";
import { Loader2 } from "lucide-react";
import { erc20Abi, stakingAbi } from "@/lib/abi";
import { ARCFLOW_STAKING_ADDRESS, MIN_MAX_FEE_PER_GAS } from "@/lib/chain";
import {
  DAY,
  HOUR,
  MINUTE,
  ZERO,
  formatDuration,
  parseCount,
  shorten,
} from "@/lib/form-time";
import { WalletConnectButton } from "@/components/WalletConnectButton";
import { TokenSelect } from "@/components/TokenSelect";
import { DurationTriple, FormShell, PreviewPanel } from "@/components/forms/form-shell";
import { upsertPool } from "@/lib/backend";
import { confirmTx, eventArgs } from "@/lib/tx";
import { clickOrExplain } from "@/lib/guard-click";
import { goToExplorerTx } from "@/lib/explorer-nav";
import { proofPath } from "@/lib/proof";

const gas = { maxFeePerGas: MIN_MAX_FEE_PER_GAS, maxPriorityFeePerGas: 1n };
const MAX_MIN_LOCK = 730 * DAY;

export function CreateStakingForm() {
  const router = useRouter();
  const publicClient = usePublicClient();
  const { address, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();

  const [stakeToken, setStakeToken] = useState("");
  const [rewardToken, setRewardToken] = useState("");
  const [lockDays, setLockDays] = useState("0");
  const [lockHours, setLockHours] = useState("0");
  const [lockMinutes, setLockMinutes] = useState("0");
  const [fundAmount, setFundAmount] = useState("");
  const [fundDays, setFundDays] = useState("30");
  const [fundHours, setFundHours] = useState("0");
  const [fundMinutes, setFundMinutes] = useState("0");
  const [autoFund, setAutoFund] = useState(true);
  const [createdId, setCreatedId] = useState("");
  const [createdTx, setCreatedTx] = useState("");
  const [error, setError] = useState("");
  const [step, setStep] = useState<"idle" | "approving" | "creating" | "funding">("idle");

  const stakeAddress = isAddress(stakeToken) ? (stakeToken as `0x${string}`) : undefined;
  const rewardAddress = isAddress(rewardToken) ? (rewardToken as `0x${string}`) : undefined;
  const notDeployed = ARCFLOW_STAKING_ADDRESS === ZERO;

  const minLock =
    parseCount(lockDays) * DAY + parseCount(lockHours) * HOUR + parseCount(lockMinutes) * MINUTE;
  const fundDuration =
    parseCount(fundDays) * DAY + parseCount(fundHours) * HOUR + parseCount(fundMinutes) * MINUTE;
  const badLock = minLock > MAX_MIN_LOCK;

  const { data: stakeSymbol } = useReadContract({
    address: stakeAddress,
    abi: erc20Abi,
    functionName: "symbol",
    query: { enabled: Boolean(stakeAddress) },
  });
  const { data: rewardSymbol } = useReadContract({
    address: rewardAddress,
    abi: erc20Abi,
    functionName: "symbol",
    query: { enabled: Boolean(rewardAddress) },
  });
  const { data: rewardDecimals } = useReadContract({
    address: rewardAddress,
    abi: erc20Abi,
    functionName: "decimals",
    query: { enabled: Boolean(rewardAddress) },
  });
  const { data: rewardBalance } = useReadContract({
    address: rewardAddress,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(rewardAddress && address && autoFund) },
  });
  const { data: rewardAllowance } = useReadContract({
    address: rewardAddress,
    abi: erc20Abi,
    functionName: "allowance",
    args: address ? [address, ARCFLOW_STAKING_ADDRESS] : undefined,
    query: { enabled: Boolean(rewardAddress && address && autoFund && !notDeployed) },
  });

  const parsedFund = useMemo(() => {
    if (!autoFund || !fundAmount || rewardDecimals === undefined) return undefined;
    try {
      const value = parseUnits(fundAmount, rewardDecimals);
      return value > 0n ? value : undefined;
    } catch {
      return undefined;
    }
  }, [autoFund, fundAmount, rewardDecimals]);

  const needsFundApprove =
    autoFund &&
    parsedFund !== undefined &&
    (rewardAllowance === undefined || rewardAllowance < parsedFund);
  const overFund =
    autoFund && parsedFund !== undefined && rewardBalance !== undefined && parsedFund > rewardBalance;
  const badFund = autoFund && (parsedFund === undefined || fundDuration < MINUTE);
  const busy = step !== "idle";
  const ready = Boolean(
    isConnected && stakeAddress && rewardAddress && !badLock && !overFund && (!autoFund || !badFund),
  );

  async function submit() {
    setError("");
    setCreatedId("");
    if (!address || !publicClient || !stakeAddress || !rewardAddress) {
      setError("Set stake token, reward token, and connect a wallet.");
      return;
    }
    if (badLock) {
      setError("Min lock cannot exceed 730 days.");
      return;
    }
    if (autoFund && (parsedFund === undefined || fundDuration < MINUTE)) {
      setError("Fund amount and duration are required when auto-fund is on.");
      return;
    }
    if (notDeployed) {
      setError("Staking contract is not configured.");
      return;
    }

    try {
      if (autoFund && needsFundApprove && parsedFund !== undefined) {
        setStep("approving");
        const hash = await writeContractAsync({
          address: rewardAddress,
          abi: erc20Abi,
          functionName: "approve",
          args: [ARCFLOW_STAKING_ADDRESS, parsedFund],
          ...gas,
        });
        await confirmTx(publicClient, hash);
      }

      setStep("creating");
      const createTx = await writeContractAsync({
        address: ARCFLOW_STAKING_ADDRESS,
        abi: stakingAbi,
        functionName: "createPool",
        args: [stakeAddress, rewardAddress, BigInt(minLock)],
        ...gas,
      });
      const receipt = await confirmTx(publicClient, createTx);

      const created = eventArgs<{ id: bigint }>(receipt, stakingAbi, "PoolCreated");
      const poolId = created[0]?.id;
      if (poolId === undefined) {
        setError("Pool created, but id could not be read from the receipt.");
        return;
      }
      setCreatedId(poolId.toString());
      setCreatedTx(createTx);
      await upsertPool({
        id: poolId.toString(),
        stakeToken: stakeAddress,
        rewardToken: rewardAddress,
        owner: address,
        minLock,
        txHash: createTx,
      });

      let resultTx = createTx;
      if (autoFund && parsedFund !== undefined) {
        setStep("funding");
        const fundTx = await writeContractAsync({
          address: ARCFLOW_STAKING_ADDRESS,
          abi: stakingAbi,
          functionName: "fund",
          args: [poolId, parsedFund, BigInt(fundDuration)],
          ...gas,
        });
        await confirmTx(publicClient, fundTx);
        resultTx = fundTx;
      }
      goToExplorerTx(router, resultTx);
    } catch (err) {
      setError(err instanceof Error ? err.message.split("\n")[0] : "Transaction failed.");
    } finally {
      setStep("idle");
    }
  }

  return (
    <div className="space-y-5">
      {notDeployed ? (
        <div className="alert alert-warn">
          Staking contract address is not configured.
        </div>
      ) : null}

      <FormShell
        title="Create staking pool"
        badge="Stake, earn"
        aside={
          <PreviewPanel
            title="Pool preview"
            rows={[
              {
                label: "Stake token",
                value: stakeSymbol || (stakeAddress ? <span className="mono">{shorten(stakeAddress)}</span> : "—"),
              },
              {
                label: "Reward token",
                value:
                  rewardSymbol || (rewardAddress ? <span className="mono">{shorten(rewardAddress)}</span> : "—"),
              },
              { label: "Min stake lock", value: badLock ? "—" : formatDuration(minLock) || "None" },
              {
                label: "Initial rewards",
                value: autoFund
                  ? `${fundAmount || "—"}${rewardSymbol ? ` ${rewardSymbol}` : ""}`
                  : "Fund later",
              },
              {
                label: "Emission window",
                value: autoFund ? (fundDuration < MINUTE ? "—" : formatDuration(fundDuration)) : "—",
              },
              { label: "Owner", value: <span className="mono">{shorten(address)}</span> },
            ]}
          />
        }
      >
        <TokenSelect
          id="stake-token"
          label="Stake token"
          value={stakeToken}
          onChange={setStakeToken}
          hint={stakeSymbol ? stakeSymbol : "Token users deposit into the pool."}
        />

        <TokenSelect
          id="reward-token"
          label="Reward token"
          value={rewardToken}
          onChange={setRewardToken}
          preferUsdc
          hint={
            rewardSymbol
              ? rewardBalance !== undefined && rewardDecimals !== undefined
                ? `${rewardSymbol}, balance ${Number(
                    formatUnits(rewardBalance, rewardDecimals),
                  ).toLocaleString("en-US", { maximumFractionDigits: 4 })}`
                : rewardSymbol
              : "Token earned by stakers."
          }
        />

        <div className="field">
          <span className="field-label">Minimum stake lock</span>
          <DurationTriple
            days={lockDays}
            hours={lockHours}
            minutes={lockMinutes}
            onDays={setLockDays}
            onHours={setLockHours}
            onMinutes={setLockMinutes}
          />
          <p className="field-hint">0 = stakers can withdraw anytime. Max 730 days.</p>
          {badLock ? <p className="field-error">Min lock too long.</p> : null}
        </div>

        <div className="field">
          <span className="field-label">Seed rewards after create</span>
          <div className="seg seg-2">
            <button
              type="button"
              className={autoFund ? "seg-btn on" : "seg-btn"}
              onClick={() => setAutoFund(true)}
            >
              Fund now
            </button>
            <button
              type="button"
              className={!autoFund ? "seg-btn on" : "seg-btn"}
              onClick={() => setAutoFund(false)}
            >
              Create empty
            </button>
          </div>
        </div>

        {autoFund ? (
          <>
            <div className="field">
              <label className="field-label" htmlFor="fund-amount">
                Reward amount
              </label>
              <input
                id="fund-amount"
                className="af-input"
                placeholder="0.0"
                inputMode="decimal"
                value={fundAmount}
                onChange={(e) => setFundAmount(e.target.value)}
              />
              {overFund ? <p className="field-error">Exceeds reward token balance.</p> : null}
            </div>
            <div className="field">
              <span className="field-label">Emission duration</span>
              <DurationTriple
                days={fundDays}
                hours={fundHours}
                minutes={fundMinutes}
                onDays={setFundDays}
                onHours={setFundHours}
                onMinutes={setFundMinutes}
              />
              <p className="field-hint">Rewards drip linearly over this window.</p>
            </div>
          </>
        ) : null}

        {error ? <div className="alert alert-error">{error}</div> : null}
        {createdId ? (
          <div className="alert alert-warn">
            Pool #{createdId} ready{autoFund && parsedFund ? " and funded" : ""}.{" "}
            <Link href={proofPath("staking", createdTx, createdId)}>Open proof</Link>
          </div>
        ) : null}

        <div style={{ marginTop: "0.5rem" }}>
          {!isConnected ? (
            <WalletConnectButton label="Connect to continue" />
          ) : (
            <button
              type="button"
              className="btn lg block"
              disabled={busy}
              onClick={() =>
                clickOrExplain(
                  ready
                    ? null
                    : notDeployed
                    ? "Staking contract is not configured."
                    : !stakeAddress
                      ? "Select the stake token."
                      : !rewardAddress
                        ? "Select the reward token."
                        : badLock
                          ? "Min lock cannot exceed 730 days."
                          : overFund
                            ? "Fund amount exceeds reward balance."
                            : autoFund && badFund
                              ? "Fund amount and duration are required."
                              : null,
                  () => void submit(),
                )
              }
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              {step === "approving"
                ? "Approving rewards…"
                : step === "creating"
                  ? "Creating pool…"
                  : step === "funding"
                    ? "Funding rewards…"
                    : autoFund
                      ? needsFundApprove
                        ? "Approve & create + fund"
                        : "Create pool & fund"
                      : "Create staking pool"}
            </button>
          )}
        </div>
      </FormShell>
    </div>
  );
}
