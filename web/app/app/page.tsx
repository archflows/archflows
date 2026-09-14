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
  USDC_DECIMALS,
} from "@/lib/chain";
import { useMounted } from "@/hooks/useMounted";
import { WalletConnectButton } from "@/components/WalletConnectButton";
import { cn } from "@/lib/utils";

const DAY = 86400;
const HOUR = 3600;
const MINUTE = 60;
/** Tiny slack vs chain clock so a lock that is "now" on the laptop is not already expired on-chain. */
const MIN_DURATION_SEC = 60;

const ZERO = "0x0000000000000000000000000000000000000000";
const gas = { maxFeePerGas: MIN_MAX_FEE_PER_GAS, maxPriorityFeePerGas: 1n };

const dateFmt = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "UTC",
});

function nowSec() {
  return Math.floor(Date.now() / 1000);
}

function toLocalInput(unix: number) {
  const d = new Date(unix * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function sameAddress(a?: string, b?: string) {
  return Boolean(a && b && a.toLowerCase() === b.toLowerCase());
}

function parseCount(raw: string) {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n);
}

function formatDuration(sec: number) {
  if (sec <= 0) return "—";
  const d = Math.floor(sec / DAY);
  const h = Math.floor((sec % DAY) / HOUR);
  const m = Math.floor((sec % HOUR) / MINUTE);
  const parts: string[] = [];
  if (d) parts.push(`${d} day${d === 1 ? "" : "s"}`);
  if (h) parts.push(`${h} hour${h === 1 ? "" : "s"}`);
  if (m || parts.length === 0) parts.push(`${m} min`);
  return parts.join(" ");
}

export default function CreateLockPage() {
  const router = useRouter();
  const publicClient = usePublicClient();
  const mounted = useMounted();
  const { address, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();

  const [token, setToken] = useState("");
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState<"lock" | "vest">("lock");
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

  const tokenSpend =
    parsedAmount === undefined ? undefined : lockingUsdc ? parsedAmount + LOCK_FEE_UNITS : parsedAmount;
  const needsTokenApprove =
    tokenSpend !== undefined && (allowance === undefined || allowance < tokenSpend);
  const needsFeeApprove =
    !lockingUsdc && (usdcAllowance === undefined || usdcAllowance < LOCK_FEE_UNITS);
  const needsApprove = needsTokenApprove || needsFeeApprove;
  const overBalance =
    tokenSpend !== undefined && balance !== undefined && tokenSpend > balance;
  const shortFee = !lockingUsdc && usdcBalance !== undefined && usdcBalance < LOCK_FEE_UNITS;
  const unlockDate = new Date(unlockAt * 1000);
  const busy = step !== "idle";
  const ready = Boolean(
    isConnected && tokenAddress && parsedAmount !== undefined && !overBalance && !tooShort && !shortFee,
  );

  const maxLockable = useMemo(() => {
    if (balance === undefined || decimals === undefined) return undefined;
    if (lockingUsdc) {
      if (balance <= LOCK_FEE_UNITS) return 0n;
      return balance - LOCK_FEE_UNITS;
    }
    return balance;
  }, [balance, decimals, lockingUsdc]);

  function applyParts(days: string, hours: string, minutes: string) {
    const total =
      parseCount(days) * DAY + parseCount(hours) * HOUR + parseCount(minutes) * MINUTE;
    setUnlockAt(nowSec() + total);
  }

  function onDaysChange(raw: string) {
    setDaysInput(raw);
    applyParts(raw, hoursInput, minutesInput);
  }

  function onHoursChange(raw: string) {
    setHoursInput(raw);
    applyParts(daysInput, raw, minutesInput);
  }

  function onMinutesChange(raw: string) {
    setMinutesInput(raw);
    applyParts(daysInput, hoursInput, raw);
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
    if (!address || !publicClient) {
      setError("Connect a wallet on Arc Testnet first.");
      return;
    }
    if (!tokenAddress || parsedAmount === undefined) {
      setError("Paste the token address and an amount to lock.");
      return;
    }
    if (tooShort) {
      setError("Pick an unlock time at least 1 minute from now.");
      return;
    }
    if (shortFee) {
      setError("Lock fee is $10 USDC. Fund the wallet from faucet.circle.com.");
      return;
    }
    if (notDeployed) {
      setError("Set NEXT_PUBLIC_ARCFLOW_ADDRESS after deploying the contract.");
      return;
    }

    const start = 0n;
    const end = BigInt(unlockAt);
    const cliff = mode === "lock" ? end : 0n;

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
          args: [ARCFLOW_ADDRESS, LOCK_FEE_UNITS],
          ...gas,
        });
        await publicClient.waitForTransactionReceipt({ hash: feeHash });
      }

      setStep("locking");
      const lockHash = await writeContractAsync({
        address: ARCFLOW_ADDRESS,
        abi: arcFlowAbi,
        functionName: "lock",
        args: [tokenAddress, address, parsedAmount, start, cliff, end],
        ...gas,
      });
      const receipt = await publicClient.waitForTransactionReceipt({ hash: lockHash });

      let lockId: bigint | undefined;
      for (const log of receipt.logs) {
        try {
          const parsed = decodeEventLog({ abi: arcFlowAbi, data: log.data, topics: log.topics });
          if (parsed.eventName === "Locked") {
            lockId = parsed.args.id;
            break;
          }
        } catch {
          // skip unrelated logs
        }
      }
      if (lockId === undefined) {
        setError("Locked, but the lock id could not be read from the receipt.");
        return;
      }
      router.push(`/lock/${lockId.toString()}`);
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
          Contract not deployed yet — the console runs in preview mode. Set{" "}
          <code className="mono">NEXT_PUBLIC_ARCFLOW_ADDRESS</code> to arm transactions.
        </div>
      ) : null}

      <div className="create-grid">
        <div className="panel">
          <div className="panel-head">
            <span>Lock parameters</span>
            <span className="live live-accent">Arc Testnet</span>
          </div>

          <div className="panel-body">
            <div className="field">
              <label className="field-label" htmlFor="token">
                Token contract
              </label>
              <input
                id="token"
                className="af-input mono"
                placeholder="0x…"
                autoComplete="off"
                spellCheck={false}
                value={token}
                onChange={(e) => setToken(e.target.value.trim())}
              />
{token && !tokenAddress ? (
                <p className="field-error">Invalid address.</p>
              ) : symbol ? (
                <p className="field-hint">
                  <span style={{ color: "var(--beam)" }}>{symbol}</span>
                  {balance !== undefined && decimals !== undefined
                    ? ` · balance ${Number(formatUnits(balance, decimals)).toLocaleString("en-US", {
                        maximumFractionDigits: 4,
                      })}`
                    : null}
                </p>
              ) : (
                <p className="field-hint">Paste the ERC-20 straight after your pad create.</p>
              )}
            </div>

            <div className="field">
              <label className="field-label" htmlFor="amount">
                Amount
              </label>
              <div style={{ position: "relative" }}>
                <input
                  id="amount"
                  className="af-input"
                  placeholder="0.0"
                  inputMode="decimal"
                  autoComplete="off"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  style={balance !== undefined ? { paddingRight: "7rem" } : undefined}
                />
                {balance !== undefined && decimals !== undefined ? (
                  <div
                    style={{
                      position: "absolute",
                      inset: "0 0.4rem 0 auto",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.4rem",
                    }}
                  >
                    {maxLockable !== undefined && decimals !== undefined ? (
                      <div className="absolute inset-y-0 right-2 flex items-center gap-2">
                        {symbol ? (
                          <span className="font-mono text-xs text-muted-foreground">{symbol}</span>
                        ) : null}
                        <Button
                          type="button"
                          size="xs"
                          variant="outline"
                          onClick={() => setAmount(formatUnits(maxLockable, decimals))}
                        >
                          MAX
                        </Button>
                      </div>
                    ) : null}
                  >
                    {symbol ? (
                      <span className="mono dim" style={{ fontSize: "0.72rem" }}>
                        {symbol}
                      </span>
                    ) : null}
                    <button
                      type="button"
                      className="btn ghost sm"
                      onClick={() => setAmount(formatUnits(balance, decimals))}
                    >
                      MAX
                    </button>
                  </div>
                ) : null}
              </div>
              {overBalance ? <p className="field-error">Exceeds wallet balance.</p> : null}
            </div>
{overBalance ? (
              <p className="text-sm text-destructive">
                {lockingUsdc ? "Exceeds wallet balance after the $10 USDC fee." : "Exceeds wallet balance."}
              </p>
            ) : lockingUsdc ? (
              <p className="text-xs text-muted-foreground">MAX leaves $10 USDC for the lock fee.</p>
            ) : null}
          </div>

          <div className="field">
            <span className="field-label">Orbit duration</span>
            <div className="seg seg-5">
              {DURATIONS.map((d) => (
                <button
                  key={d.label}
                  type="button"
                  className={cn("seg-btn", days === d.seconds && "on")}
                  onClick={() => setDays(d.seconds)}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <span className="field-label">Release curve</span>
            <div className="seg seg-2">
              <button
                type="button"
                className={cn("seg-btn", mode === "lock" && "on")}
                onClick={() => setMode("lock")}
              >
                Hard lock
              </button>
              <button
                type="button"
                className={cn("seg-btn", mode === "vest" && "on")}
                onClick={() => setMode("vest")}
              >
                Linear vest
              </button>
            </div>
            <p className="field-hint">
              {mode === "lock"
                ? "Nothing claimable until the end date — full stop."
                : "Per-second release from now until the end date. Claim anytime."}
            </p>
          </div>

          {error ? <div className="alert alert-error">{error}</div> : null}

          <div style={{ marginTop: "1.25rem" }}>
            {!isConnected ? (
              <WalletConnectButton label="Connect to continue" />
            ) : (
              <button
                type="button"
                className="btn lg block"
                disabled={!ready || busy || notDeployed}
                onClick={submit}
              >
                {busy ? <Loader2 className="size-4 animate-spin" /> : null}
                {step === "approving"
                  ? "Approving…"
                  : step === "locking"
                    ? "Locking…"
                    : needsApprove
                      ? "Approve & lock"
                      : "Lock tokens"}
              </button>
            )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="unlock" className="text-xs text-muted-foreground">
                Or pick date & time
              </Label>
              <Input
                id="unlock"
                type="datetime-local"
                min={mounted ? toLocalInput(nowSec() + MINUTE) : undefined}
                value={mounted ? toLocalInput(unlockAt) : ""}
                onChange={(e) => onDateChange(e.target.value)}
              />
            </div>
            {tooShort ? (
              <p className="text-sm text-destructive">Unlock must be in the future.</p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Type any duration or pick the exact unlock moment. No preset required.
              </p>
            )}
          </div>


          <div className="space-y-2">
            <Label>Release</Label>
            <div className="grid grid-cols-2 gap-1 rounded-lg border p-1">
              <Button
                type="button"
                size="sm"
                variant={mode === "lock" ? "secondary" : "ghost"}
                onClick={() => setMode("lock")}
              >
                Hard lock
              </Button>
              <Button
                type="button"
                size="sm"
                variant={mode === "vest" ? "secondary" : "ghost"}
                onClick={() => setMode("vest")}
              >
                Linear vest
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {mode === "lock"
                ? "Nothing claimable until the end date."
                : "Linear release after start — claim anytime."}
            </p>
          </div>

          {error ? (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          {!isConnected ? (
            <WalletConnectButton label="Connect to continue" />
          ) : (
            <Button
              className="w-full"
              size="lg"
              disabled={!ready || busy || notDeployed}
              onClick={submit}
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              {step === "approving"
                ? "Approving…"
                : step === "locking"
                  ? "Locking…"
                  : needsApprove
                    ? "Approve & lock · $10"
                    : "Lock tokens · $10"}
            </Button>
          )}
        </div>

        <aside className="space-y-4">
          <div className="panel">
            <div className="panel-head">
              <span>Flight plan</span>
              <span className="mono dim" style={{ fontSize: "0.72rem" }}>
                // PREVIEW
              </span>
            </div>
            <dl style={{ margin: 0 }}>
              <div className="kv">
                <dt>Release</dt>
                <dd>{mode === "lock" ? "Hard lock" : "Linear vest"}</dd>
              </div>
              <div className="flex justify-between gap-3 px-4 py-3">
                <dt className="text-muted-foreground">Unlocks</dt>
                <dd className="text-right font-medium">
                  {mounted ? `${dateFmt.format(unlockDate)} UTC` : "—"}
                </dd>
              </div>
              <div className="flex justify-between gap-3 px-4 py-3">
                <dt className="text-muted-foreground">Duration</dt>
                <dd className="font-medium tabular-nums">
                  {tooShort ? "—" : formatDuration(durationSec)}
                </dd>

              </div>
              <div className="kv">
                <dt>Beneficiary</dt>
                <dd className="mono" style={{ fontSize: "0.78rem" }}>
                  {address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "Connect wallet"}
                </dd>
              </div>
              <div className="kv">
                <dt>Amount</dt>
                <dd style={{ fontVariantNumeric: "tabular-nums" }}>
                  {amount || "—"}
                  {symbol ? ` ${symbol}` : ""}
                </dd>
              </div>
              <div className="flex justify-between gap-3 px-4 py-3">
                <dt className="text-muted-foreground">Lock fee</dt>
                <dd className="text-right font-medium">
                  $10 USDC
                  {shortFee ? (
                    <span className="mt-0.5 block text-xs font-normal text-destructive">Need $10 USDC</span>
                  ) : usdcBalance !== undefined ? (
                    <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                      Wallet {Number(formatUnits(usdcBalance, USDC_DECIMALS)).toLocaleString("en-US", {
                        maximumFractionDigits: 2,
                      })}{" "}
                      USDC
                    </span>
                  ) : null}
                </dd>
              </div>

              <div className="kv">
                <dt>Gas</dt>
                <dd>USDC · 20 gwei floor</dd>
              </div>

              </div>
            </dl>
          </div>

          <p className="text-sm leading-relaxed text-muted-foreground">
            Fee is a flat $10 USDC on every lock, paid to treasury at confirm — not taken from the
            locked bag. Keep a little extra USDC for gas; on Arc gas and the fee are the same asset.
            Once confirmed, nobody can cancel — including you.
          </p>

          <div className="panel">
            <div className="panel-head">
              <span className="mono" style={{ fontSize: "0.78rem" }}>
                // POINT OF NO RETURN
              </span>
            </div>
            <div className="panel-body dim" style={{ fontSize: "0.88rem", lineHeight: 1.7 }}>
              If the pad already locked LP, lock your{" "}
              <span style={{ color: "var(--ink)" }}>dev buy</span> here — LP lock is not a wallet
              lock. Once the transaction confirms, nobody can cancel or shorten the schedule,
              including you.
            </div>
          </div>

        </aside>
      </div>
    </div>
  );
}
