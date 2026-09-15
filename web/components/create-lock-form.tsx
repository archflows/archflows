"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { decodeEventLog, formatUnits, isAddress, parseUnits } from "viem";
import { useAccount, usePublicClient, useReadContract, useWriteContract } from "wagmi";
import { Loader2 } from "lucide-react";
import { arcFlowAbi, erc20Abi } from "@/lib/abi";
import {
  ARCFLOW_ADDRESS,
  LOCK_FEE_UNITS,
  MIN_MAX_FEE_PER_GAS,
  USDC_ADDRESS,
} from "@/lib/chain";
import {
  DAY,
  HOUR,
  MINUTE,
  MIN_DURATION_SEC,
  ZERO,
  dateFmt,
  formatDuration,
  nowSec,
  parseCount,
  sameAddress,
  shorten,
  toLocalInput,
} from "@/lib/form-time";
import { useMounted } from "@/hooks/useMounted";
import { WalletConnectButton } from "@/components/WalletConnectButton";
import { TokenSelect } from "@/components/TokenSelect";
import { AmountPercentField } from "@/components/AmountPercentField";
import {
  UnlockTargetField,
  validateSplits,
  type SplitRow,
  type UnlockTarget,
} from "@/components/UnlockTargetField";
import { FormShell, PreviewPanel, UnlockAfterField } from "@/components/forms/form-shell";
import { LockOgPreview } from "@/components/LockOgPreview";

const gas = { maxFeePerGas: MIN_MAX_FEE_PER_GAS, maxPriorityFeePerGas: 1n };

function shareAmount(total: bigint, percent: number, isLast: boolean, allocated: bigint) {
  if (isLast) return total - allocated;
  return (total * BigInt(Math.round(percent * 100))) / 10000n;
}

/** Hard lock only — nothing claimable until the unlock timestamp. */
export function CreateLockForm() {
  const router = useRouter();
  const publicClient = usePublicClient();
  const mounted = useMounted();
  const { address, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();

  const [token, setToken] = useState("");
  const [amount, setAmount] = useState("");
  const [unlockMode, setUnlockMode] = useState<UnlockTarget>("self");
  const [otherWallet, setOtherWallet] = useState("");
  const [splits, setSplits] = useState<SplitRow[]>([]);
  const [daysInput, setDaysInput] = useState("30");
  const [hoursInput, setHoursInput] = useState("0");
  const [minutesInput, setMinutesInput] = useState("0");
  const [unlockAt, setUnlockAt] = useState(() => nowSec() + 30 * DAY);
  const [error, setError] = useState("");
  const [step, setStep] = useState<"idle" | "approving" | "locking">("idle");

  const tokenAddress = isAddress(token) ? (token as `0x${string}`) : undefined;
  const notDeployed = ARCFLOW_ADDRESS === ZERO;
  const lockingUsdc = sameAddress(tokenAddress, USDC_ADDRESS);
  const durationSec = Math.max(0, unlockAt - nowSec());
  const tooShort = durationSec < MIN_DURATION_SEC;

  const lockTargets = useMemo(() => {
    if (unlockMode === "self") {
      return address ? [{ address, percent: 100 }] : [];
    }
    if (unlockMode === "other") {
      return isAddress(otherWallet) ? [{ address: otherWallet as `0x${string}`, percent: 100 }] : [];
    }
    return splits
      .filter((row) => isAddress(row.address) && Number(row.percent) > 0)
      .map((row) => ({
        address: row.address as `0x${string}`,
        percent: Number(row.percent),
      }));
  }, [unlockMode, address, otherWallet, splits]);

  const lockCount = Math.max(1, unlockMode === "split" ? splits.length : 1);
  const feeTotal = LOCK_FEE_UNITS * BigInt(unlockMode === "split" ? Math.max(splits.length, 1) : 1);

  const { data: symbol } = useReadContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: "symbol",
    query: { enabled: Boolean(tokenAddress) },
  });
  const { data: decimals } = useReadContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: "decimals",
    query: { enabled: Boolean(tokenAddress) },
  });
  const { data: totalSupply } = useReadContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: "totalSupply",
    query: { enabled: Boolean(tokenAddress) },
  });
  const { data: balance } = useReadContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(tokenAddress && address) },
  });
  const { data: allowance } = useReadContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: "allowance",
    args: address ? [address, ARCFLOW_ADDRESS] : undefined,
    query: { enabled: Boolean(tokenAddress && address && !notDeployed) },
  });
  const { data: usdcBalance } = useReadContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) },
  });
  const { data: usdcAllowance } = useReadContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: "allowance",
    args: address ? [address, ARCFLOW_ADDRESS] : undefined,
    query: { enabled: Boolean(address && !notDeployed && !lockingUsdc) },
  });

  const parsedAmount = useMemo(() => {
    if (!amount || decimals === undefined) return undefined;
    try {
      const value = parseUnits(amount, decimals);
      return value > 0n ? value : undefined;
    } catch {
      return undefined;
    }
  }, [amount, decimals]);

  const supplyShare = useMemo(() => {
    if (parsedAmount === undefined || totalSupply === undefined || totalSupply === 0n) return undefined;
    const scaled = (parsedAmount * 10000n) / totalSupply; // percent × 100
    if (scaled === 0n && parsedAmount > 0n) return "<0.01%";
    const pct = Number(scaled) / 100;
    return `${pct.toLocaleString("en-US", {
      maximumFractionDigits: 2,
      minimumFractionDigits: 0,
    })}%`;
  }, [parsedAmount, totalSupply]);

  const tokenSpend =
    parsedAmount === undefined
      ? undefined
      : lockingUsdc
        ? parsedAmount + feeTotal
        : parsedAmount;
  const needsTokenApprove =
    tokenSpend !== undefined && (allowance === undefined || allowance < tokenSpend);
  const needsFeeApprove =
    !lockingUsdc && (usdcAllowance === undefined || usdcAllowance < feeTotal);
  const needsApprove = needsTokenApprove || needsFeeApprove;
  const overBalance = tokenSpend !== undefined && balance !== undefined && tokenSpend > balance;
  const shortFee =
    !lockingUsdc && usdcBalance !== undefined && usdcBalance < feeTotal
      ? true
      : lockingUsdc &&
        parsedAmount !== undefined &&
        balance !== undefined &&
        parsedAmount + feeTotal > balance;
  const busy = step !== "idle";

  const splitError = unlockMode === "split" ? validateSplits(splits) : null;
  const otherError =
    unlockMode === "other" && otherWallet && !isAddress(otherWallet)
      ? "Invalid beneficiary address."
      : unlockMode === "other" && !otherWallet
        ? "Enter the beneficiary wallet."
        : null;

  const ready = Boolean(
    isConnected &&
      tokenAddress &&
      lockTargets.length > 0 &&
      parsedAmount !== undefined &&
      !overBalance &&
      !tooShort &&
      !shortFee &&
      !splitError &&
      !otherError,
  );

  const maxLockable = useMemo(() => {
    if (balance === undefined || decimals === undefined) return undefined;
    if (lockingUsdc) {
      if (balance <= feeTotal) return 0n;
      return balance - feeTotal;
    }
    return balance;
  }, [balance, decimals, lockingUsdc, feeTotal]);

  const beneficiaryPreview =
    unlockMode === "self"
      ? shorten(address)
      : unlockMode === "other"
        ? shorten(isAddress(otherWallet) ? otherWallet : undefined)
        : `${lockTargets.length || splits.length || 0} wallets`;

  function applyParts(days: string, hours: string, minutes: string) {
    const total = parseCount(days) * DAY + parseCount(hours) * HOUR + parseCount(minutes) * MINUTE;
    setUnlockAt(nowSec() + total);
  }

  function onDateChange(value: string) {
    const ms = new Date(value).getTime();
    if (Number.isNaN(ms)) return;
    const unix = Math.floor(ms / 1000);
    setUnlockAt(unix);
    const delta = Math.max(0, unix - nowSec());
    setDaysInput(String(Math.floor(delta / DAY)));
    setHoursInput(String(Math.floor((delta % DAY) / HOUR)));
    setMinutesInput(String(Math.floor((delta % HOUR) / MINUTE)));
  }

  async function submit() {
    setError("");
    if (!address || !publicClient || !tokenAddress || parsedAmount === undefined) {
      setError("Fill token, amount, and connect a wallet on Arc Testnet.");
      return;
    }
    if (tooShort) {
      setError("Unlock must be at least 1 minute from now.");
      return;
    }
    if (unlockMode === "split") {
      const invalid = validateSplits(splits);
      if (invalid) {
        setError(invalid);
        return;
      }
    }
    if (unlockMode === "other" && !isAddress(otherWallet)) {
      setError("Enter a valid beneficiary wallet.");
      return;
    }
    if (shortFee) {
      setError(
        unlockMode === "split"
          ? `Split needs $${10 * lockTargets.length} USDC in fees ($10 each).`
          : "Lock fee is $10 USDC. Fund the wallet from faucet.circle.com.",
      );
      return;
    }
    if (notDeployed) {
      setError("Set NEXT_PUBLIC_ARCFLOW_ADDRESS after deploying the contract.");
      return;
    }

    const end = BigInt(unlockAt);
    const targets =
      unlockMode === "self"
        ? [{ address, percent: 100 }]
        : unlockMode === "other"
          ? [{ address: otherWallet as `0x${string}`, percent: 100 }]
          : splits.map((row) => ({
              address: row.address as `0x${string}`,
              percent: Number(row.percent),
            }));

    try {
      setStep("approving");
      if (needsTokenApprove && tokenSpend !== undefined) {
        const approveHash = await writeContractAsync({
          address: tokenAddress,
          abi: erc20Abi,
          functionName: "approve",
          args: [ARCFLOW_ADDRESS, tokenSpend],
          ...gas,
        });
        await publicClient.waitForTransactionReceipt({ hash: approveHash });
      }
      if (needsFeeApprove) {
        const feeHash = await writeContractAsync({
          address: USDC_ADDRESS,
          abi: erc20Abi,
          functionName: "approve",
          args: [ARCFLOW_ADDRESS, feeTotal],
          ...gas,
        });
        await publicClient.waitForTransactionReceipt({ hash: feeHash });
      }

      setStep("locking");
      let allocated = 0n;
      let lastLockId: bigint | undefined;

      for (let i = 0; i < targets.length; i++) {
        const target = targets[i];
        const piece = shareAmount(parsedAmount, target.percent, i === targets.length - 1, allocated);
        allocated += piece;
        if (piece <= 0n) continue;

        const lockHash = await writeContractAsync({
          address: ARCFLOW_ADDRESS,
          abi: arcFlowAbi,
          functionName: "lock",
          args: [tokenAddress, target.address, piece, 0n, end, end],
          ...gas,
        });
        const receipt = await publicClient.waitForTransactionReceipt({ hash: lockHash });
        for (const log of receipt.logs) {
          try {
            const parsed = decodeEventLog({ abi: arcFlowAbi, data: log.data, topics: log.topics });
            if (parsed.eventName === "Locked") {
              lastLockId = parsed.args.id;
              break;
            }
          } catch {
            // skip
          }
        }
      }

      if (targets.length > 1 || lastLockId === undefined) {
        router.push("/dashboard/locks?tab=positions");
      } else {
        router.push(`/lock/${lastLockId.toString()}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message.split("\n")[0] : "Transaction failed.");
    } finally {
      setStep("idle");
    }
  }

  return (
    <div className="space-y-5">
      {notDeployed ? (
        <div className="form-notice form-notice-warn" role="status">
          <div className="form-notice-body">
            <strong>Contract not configured</strong>
            <p>
              Set <code className="mono">NEXT_PUBLIC_ARCFLOW_ADDRESS</code> after deploying.
            </p>
          </div>
        </div>
      ) : null}

      <FormShell
        title="Hard lock"
        badge="Time-based"
        aside={
          <>
            <PreviewPanel
              title="Lock preview"
              rows={[
                { label: "Type", value: "Hard lock" },
                {
                  label: "Unlocks",
                  value: mounted ? `${dateFmt.format(new Date(unlockAt * 1000))} UTC` : "—",
                },
                { label: "Duration", value: tooShort ? "—" : formatDuration(durationSec) },
                {
                  label: "Unlock to",
                  value:
                    unlockMode === "split" ? (
                      beneficiaryPreview
                    ) : (
                      <span className="mono">{beneficiaryPreview}</span>
                    ),
                },
                {
                  label: "Amount",
                  value: `${amount || "—"}${symbol ? ` ${symbol}` : ""}`,
                },
                {
                  label: "Fee",
                  value:
                    unlockMode === "split"
                      ? `$${10 * Math.max(splits.length, 1)} USDC (${Math.max(splits.length, 1)} × $10)`
                      : "$10 USDC",
                },
              ]}
            />
            <LockOgPreview
              amount={amount}
              symbol={symbol}
              duration={tooShort ? undefined : formatDuration(durationSec)}
              unlockLabel={mounted ? `${dateFmt.format(new Date(unlockAt * 1000))} UTC` : undefined}
              supplyShare={supplyShare}
              lockType="Hard lock"
            />
          </>
        }
      >
        <TokenSelect
          id="lock-token"
          label="Token"
          value={token}
          onChange={setToken}
          hint={
            symbol
              ? balance !== undefined && decimals !== undefined
                ? `${symbol} · balance ${Number(formatUnits(balance, decimals)).toLocaleString(
                    "en-US",
                    { maximumFractionDigits: 4 },
                  )}`
                : symbol
              : "Pick a token with balance in your wallet."
          }
        />

        <AmountPercentField
          id="lock-amount"
          label="Amount to lock"
          amount={amount}
          onChange={setAmount}
          max={maxLockable}
          decimals={decimals}
          symbol={symbol}
          error={
            overBalance
              ? lockingUsdc
                ? "Exceeds balance after lock fees."
                : "Exceeds wallet balance."
              : undefined
          }
          hint={
            lockingUsdc
              ? unlockMode === "split"
                ? `MAX leaves $${10 * Math.max(splits.length, 1)} USDC for fees.`
                : "MAX leaves $10 USDC for the lock fee."
              : undefined
          }
        />

        <UnlockTargetField
          mode={unlockMode}
          onModeChange={setUnlockMode}
          selfAddress={address}
          otherAddress={otherWallet}
          onOtherAddressChange={setOtherWallet}
          splits={splits}
          onSplitsChange={setSplits}
        />

        <UnlockAfterField
          days={daysInput}
          hours={hoursInput}
          minutes={minutesInput}
          onDays={(v) => {
            setDaysInput(v);
            applyParts(v, hoursInput, minutesInput);
          }}
          onHours={(v) => {
            setHoursInput(v);
            applyParts(daysInput, v, minutesInput);
          }}
          onMinutes={(v) => {
            setMinutesInput(v);
            applyParts(daysInput, hoursInput, v);
          }}
          datetimeMin={mounted ? toLocalInput(nowSec() + MINUTE) : undefined}
          datetimeValue={mounted ? toLocalInput(unlockAt) : ""}
          onDatetimeChange={onDateChange}
          error={tooShort ? "Must be at least 1 minute from now." : undefined}
        />

        {(() => {
          const notice = error
            ? { tone: "error" as const, title: "Transaction failed", body: error }
            : splitError && unlockMode === "split"
              ? { tone: "warn" as const, title: "Fix split shares", body: splitError }
              : isConnected && !tokenAddress
                ? { tone: "warn" as const, title: "Token required", body: "Pick a token from your wallet to continue." }
                : isConnected && parsedAmount === undefined
                  ? {
                      tone: "warn" as const,
                      title: "Amount required",
                      body: "Enter how much you want to lock.",
                    }
                  : isConnected && shortFee
                    ? {
                        tone: "warn" as const,
                        title: "USDC needed for fee",
                        body: lockingUsdc
                          ? "Need $10 USDC lock fee plus the amount you lock, and a little for gas."
                          : "Each lock costs $10 USDC (+ gas). Your USDC balance is empty.",
                        href: "https://faucet.circle.com",
                        hrefLabel: "Get testnet USDC",
                      }
                    : null;

          if (!notice) return null;

          return (
            <div className={`form-notice form-notice-${notice.tone}`} role="status">
              <div className="form-notice-body">
                <strong>{notice.title}</strong>
                <p>{notice.body}</p>
              </div>
              {"href" in notice && notice.href ? (
                <a
                  className="form-notice-action"
                  href={notice.href}
                  target="_blank"
                  rel="noreferrer"
                >
                  {notice.hrefLabel}
                </a>
              ) : null}
            </div>
          );
        })()}

        <div style={{ marginTop: "0.5rem" }}>
          {!isConnected ? (
            <WalletConnectButton label="Connect to continue" />
          ) : (
            <button
              type="button"
              className="btn lg block"
              disabled={!ready || busy || notDeployed}
              title={
                shortFee
                  ? "Need $10+ USDC for fee and gas"
                  : !tokenAddress
                    ? "Select a token"
                    : parsedAmount === undefined
                      ? "Enter amount"
                      : undefined
              }
              onClick={submit}
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              {step === "approving"
                ? "Approving…"
                : step === "locking"
                  ? unlockMode === "split"
                    ? "Creating locks…"
                    : "Locking…"
                  : needsApprove
                    ? unlockMode === "split"
                      ? `Approve & split lock · $${10 * Math.max(splits.length, 1)}`
                      : "Approve & lock · $10"
                    : unlockMode === "split"
                      ? `Split lock · $${10 * Math.max(splits.length, 1)}`
                      : "Lock until unlock · $10"}
            </button>
          )}
        </div>
      </FormShell>
    </div>
  );
}
