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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
    <div className="space-y-6">
      {notDeployed ? (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          Contract not deployed yet. Form works for preview — set{" "}
          <code className="font-mono text-xs">NEXT_PUBLIC_ARCFLOW_ADDRESS</code> to enable
          transactions.
        </div>
      ) : null}

      {!isConnected ? (
        <div className="flex justify-end">
          <WalletConnectButton size="sm" label="Connect wallet" className="w-auto" />
        </div>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:gap-10">
        <div className="space-y-5 rounded-xl border bg-card/40 p-5 sm:p-6">
          <div className="space-y-2">
            <Label htmlFor="token">Token contract</Label>
            <Input
              id="token"
              placeholder="0x…"
              autoComplete="off"
              spellCheck={false}
              className="font-mono"
              value={token}
              onChange={(e) => setToken(e.target.value.trim())}
            />
            {token && !tokenAddress ? (
              <p className="text-sm text-destructive">Invalid address.</p>
            ) : symbol ? (
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{symbol}</span>
                {balance !== undefined && decimals !== undefined
                  ? ` · balance ${Number(formatUnits(balance, decimals)).toLocaleString("en-US", {
                      maximumFractionDigits: 4,
                    })}`
                  : null}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">Paste the ERC-20 after your pad create.</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <div className="relative">
              <Input
                id="amount"
                placeholder="0.0"
                inputMode="decimal"
                autoComplete="off"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={balance !== undefined ? "pr-28" : undefined}
              />
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
            </div>
            {overBalance ? (
              <p className="text-sm text-destructive">
                {lockingUsdc ? "Exceeds wallet balance after the $10 USDC fee." : "Exceeds wallet balance."}
              </p>
            ) : lockingUsdc ? (
              <p className="text-xs text-muted-foreground">MAX leaves $10 USDC for the lock fee.</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label>Unlock at</Label>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="days" className="text-xs text-muted-foreground">
                  Days
                </Label>
                <Input
                  id="days"
                  type="number"
                  min={0}
                  step={1}
                  inputMode="numeric"
                  value={daysInput}
                  onChange={(e) => onDaysChange(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="hours" className="text-xs text-muted-foreground">
                  Hours
                </Label>
                <Input
                  id="hours"
                  type="number"
                  min={0}
                  step={1}
                  inputMode="numeric"
                  value={hoursInput}
                  onChange={(e) => onHoursChange(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="minutes" className="text-xs text-muted-foreground">
                  Minutes
                </Label>
                <Input
                  id="minutes"
                  type="number"
                  min={0}
                  step={1}
                  inputMode="numeric"
                  value={minutesInput}
                  onChange={(e) => onMinutesChange(e.target.value)}
                />
              </div>
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

        <aside className="space-y-6 lg:pt-1">
          <div className="rounded-xl border">
            <div className="border-b px-4 py-3 text-sm font-medium">Summary</div>
            <dl className="divide-y text-sm">
              <div className="flex justify-between gap-3 px-4 py-3">
                <dt className="text-muted-foreground">Mode</dt>
                <dd className="font-medium">{mode === "lock" ? "Hard lock" : "Linear vest"}</dd>
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
              <div className="flex justify-between gap-3 px-4 py-3">
                <dt className="text-muted-foreground">Beneficiary</dt>
                <dd className="font-mono text-xs">
                  {address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "Connect wallet"}
                </dd>
              </div>
              <div className="flex justify-between gap-3 px-4 py-3">
                <dt className="text-muted-foreground">Amount</dt>
                <dd className="font-medium tabular-nums">
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
            </dl>
          </div>

          <p className="text-sm leading-relaxed text-muted-foreground">
            Fee is a flat $10 USDC on every lock, paid to treasury at confirm — not taken from the
            locked bag. Keep a little extra USDC for gas; on Arc gas and the fee are the same asset.
            Once confirmed, nobody can cancel — including you.
          </p>
        </aside>
      </div>
    </div>
  );
}
