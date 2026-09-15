"use client";

import { useMemo, useState } from "react";
import { formatUnits, isAddress, parseUnits } from "viem";
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
import { ownsWalletToken, useWalletTokens } from "@/hooks/useWalletTokens";
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
import { LockTokenomicsPie } from "@/components/LockTokenomicsPie";
import { LockSuccessDialog, type LockSuccessResult } from "@/components/lock-success-dialog";
import { upsertLock } from "@/lib/backend";
import { confirmTx, eventArgs } from "@/lib/tx";
import { clickOrExplain } from "@/lib/guard-click";

const gas = { maxFeePerGas: MIN_MAX_FEE_PER_GAS, maxPriorityFeePerGas: 1n };

function shareAmount(total: bigint, percent: number, isLast: boolean, allocated: bigint) {
  if (isLast) return total - allocated;
  return (total * BigInt(Math.round(percent * 100))) / 10000n;
}

/** Hard lock only — nothing claimable until the unlock timestamp. */
export function CreateLockForm() {
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
  const [success, setSuccess] = useState<LockSuccessResult | null>(null);
  const [successOpen, setSuccessOpen] = useState(false);

  const tokenAddress = isAddress(token) ? (token as `0x${string}`) : undefined;
  const { data: walletTokens } = useWalletTokens();
  const tokenInWallet = ownsWalletToken(walletTokens, tokenAddress);
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
  const { data: tokenLocked } = useReadContract({
    address: ARCFLOW_ADDRESS,
    abi: arcFlowAbi,
    functionName: "totalLocked",
    args: tokenAddress ? [tokenAddress] : undefined,
    query: { enabled: Boolean(tokenAddress && !notDeployed) },
  });
  const { data: burnedBalance } = useReadContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: ["0x000000000000000000000000000000000000dEaD"],
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

  const tokenomics = useMemo(() => {
    if (totalSupply === undefined) {
      return { circulating: 0n, locked: 0n, burned: 0n };
    }
    const burned = burnedBalance ?? 0n;
    const locked = (tokenLocked ?? 0n) + (parsedAmount ?? 0n);
    const left = totalSupply - burned - locked;
    return {
      circulating: left < 0n ? 0n : left,
      locked: locked < 0n ? 0n : locked,
      burned,
    };
  }, [totalSupply, burnedBalance, tokenLocked, parsedAmount]);

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
      tokenInWallet &&
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
    setSuccess(null);
    setSuccessOpen(false);
    if (!address || !publicClient || !tokenAddress || parsedAmount === undefined) {
      setError("Fill token, amount, and connect a wallet.");
      return;
    }
    if (!tokenInWallet) {
      setError("Pick a token from the connected wallet.");
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
      setError("Lock contract is not configured.");
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
        await confirmTx(publicClient, approveHash);
      }
      if (needsFeeApprove) {
        const feeHash = await writeContractAsync({
          address: USDC_ADDRESS,
          abi: erc20Abi,
          functionName: "approve",
          args: [ARCFLOW_ADDRESS, feeTotal],
          ...gas,
        });
        await confirmTx(publicClient, feeHash, { fee: true });
      }

      setStep("locking");
      let allocated = 0n;
      const created: LockSuccessResult["locks"] = [];
      const tokenDecimals =
        decimals ??
        walletTokens.find((t) => t.address.toLowerCase() === tokenAddress.toLowerCase())?.decimals ??
        18;
      const tokenSymbol = symbol ?? "TOKEN";

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
        const receipt = await confirmTx(publicClient, lockHash);
        const locked = eventArgs<{ id: bigint; beneficiary: `0x${string}`; amount: bigint }>(
          receipt,
          arcFlowAbi,
          "Locked",
        );
        for (const ev of locked) {
          created.push({
            id: ev.id.toString(),
            txHash: lockHash,
            amount: Number(formatUnits(ev.amount, tokenDecimals)).toLocaleString("en-US", {
              maximumFractionDigits: 6,
            }),
            beneficiary: ev.beneficiary,
          });
          await upsertLock({
            id: ev.id.toString(),
            kind: "lock",
            token: tokenAddress,
            beneficiary: ev.beneficiary,
            creator: address,
            amount: ev.amount.toString(),
            start: nowSec(),
            cliff: unlockAt,
            end: unlockAt,
            feeUsdc: "10000000",
            txHash: lockHash,
          });
        }
      }

      if (created.length === 0) {
        setError("Lock confirmed, but no lock event was found.");
        return;
      }

      setSuccess({
        locks: created,
        symbol: tokenSymbol,
        unlockAt,
        totalAmount: Number(formatUnits(parsedAmount, tokenDecimals)).toLocaleString("en-US", {
          maximumFractionDigits: 6,
        }),
      });
      setSuccessOpen(true);
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
              Lock contract address is not configured.
            </p>
          </div>
        </div>
      ) : null}

      <LockSuccessDialog
        open={successOpen}
        onOpenChange={setSuccessOpen}
        result={success}
      />

      <FormShell
        title="Hard lock"
        badge="All-or-nothing"
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
              ]}
              note="Hard lock: the full amount stays frozen until the unlock date. Nothing streams out early. For a cliff then per-second release, use Vesting."
            />
            <div className="panel create-tok-panel">
              <div className="panel-head">
                <span>Tokenomics</span>
                {supplyShare ? (
                  <span className="live live-accent">This lock {supplyShare}</span>
                ) : (
                  <span className="dim" style={{ fontSize: "0.72rem" }}>
                    Pick token + amount
                  </span>
                )}
              </div>
              <div className="panel-body create-tok-body">
                <LockTokenomicsPie
                  circulating={tokenomics.circulating}
                  locked={tokenomics.locked}
                  burned={tokenomics.burned}
                  totalSupply={totalSupply}
                  symbol={symbol}
                  decimals={decimals ?? 18}
                  compact
                />
              </div>
            </div>
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
                ? `${symbol}, balance ${Number(formatUnits(balance, decimals)).toLocaleString(
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
              disabled={busy}
              title={
                shortFee
                  ? "Need $10+ USDC for fee and gas"
                  : !tokenAddress
                    ? "Select a token"
                    : parsedAmount === undefined
                      ? "Enter amount"
                      : undefined
              }
              onClick={() =>
                clickOrExplain(
                  ready
                    ? null
                    : notDeployed
                    ? "Lock contract is not configured."
                    : !tokenAddress
                      ? "Select a token from the connected wallet."
                      : parsedAmount === undefined
                        ? "Enter how much you want to lock."
                        : overBalance
                          ? "Amount exceeds your balance."
                          : tooShort
                            ? "Need at least 1 minute."
                            : shortFee
                              ? "Need $10+ USDC for the lock fee and gas."
                              : splitError
                                ? splitError
                                : otherError
                                  ? otherError
                                  : lockTargets.length === 0
                                    ? "Set who can unlock."
                                    : null,
                  () => void submit(),
                )
              }
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
                      ? "Approve & split lock"
                      : "Approve & lock"
                    : unlockMode === "split"
                      ? "Split lock"
                      : "Lock until unlock"}
            </button>
          )}
        </div>
      </FormShell>
    </div>
  );
}
