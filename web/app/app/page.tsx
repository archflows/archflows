"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { decodeEventLog, formatUnits, isAddress, parseUnits } from "viem";
import { useAccount, usePublicClient, useReadContract, useWriteContract } from "wagmi";
import { Loader2 } from "lucide-react";
import { arcFlowAbi, erc20Abi } from "@/lib/abi";
import { ARCFLOW_ADDRESS, MIN_MAX_FEE_PER_GAS } from "@/lib/chain";
import { WalletConnectButton } from "@/components/WalletConnectButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const DURATIONS = [
  { label: "7d", seconds: 7 * 86400 },
  { label: "30d", seconds: 30 * 86400 },
  { label: "90d", seconds: 90 * 86400 },
  { label: "180d", seconds: 180 * 86400 },
  { label: "1y", seconds: 365 * 86400 },
];

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

export default function CreateLockPage() {
  const router = useRouter();
  const publicClient = usePublicClient();
  const { address, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();

  const [token, setToken] = useState("");
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState<"lock" | "vest">("lock");
  const [days, setDays] = useState(DURATIONS[2].seconds);
  const [error, setError] = useState("");
  const [step, setStep] = useState<"idle" | "approving" | "locking">("idle");

  const tokenAddress = isAddress(token) ? (token as `0x${string}`) : undefined;
  const notDeployed = ARCFLOW_ADDRESS === ZERO;

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

  const parsedAmount = useMemo(() => {
    if (!amount || decimals === undefined) return undefined;
    try {
      const value = parseUnits(amount, decimals);
      return value > 0n ? value : undefined;
    } catch {
      return undefined;
    }
  }, [amount, decimals]);

  const needsApprove =
    parsedAmount !== undefined && (allowance === undefined || allowance < parsedAmount);
  const overBalance = parsedAmount !== undefined && balance !== undefined && parsedAmount > balance;
  const unlockDate = useMemo(() => new Date(Date.now() + days * 1000), [days]);
  const busy = step !== "idle";
  const ready = Boolean(isConnected && tokenAddress && parsedAmount !== undefined && !overBalance);

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
    if (notDeployed) {
      setError("Set NEXT_PUBLIC_ARCFLOW_ADDRESS after deploying the contract.");
      return;
    }

    const now = BigInt(Math.floor(Date.now() / 1000));
    const end = now + BigInt(days);
    const cliff = mode === "lock" ? end : now;

    try {
      if (needsApprove) {
        setStep("approving");
        const approveHash = await writeContractAsync({
          address: tokenAddress,
          abi: erc20Abi,
          functionName: "approve",
          args: [ARCFLOW_ADDRESS, parsedAmount],
          ...gas,
        });
        await publicClient.waitForTransactionReceipt({ hash: approveHash });
      }

      setStep("locking");
      const lockHash = await writeContractAsync({
        address: ARCFLOW_ADDRESS,
        abi: arcFlowAbi,
        functionName: "lock",
        args: [tokenAddress, address, parsedAmount, now, cliff, end],
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
              {balance !== undefined && decimals !== undefined ? (
                <div className="absolute inset-y-0 right-2 flex items-center gap-2">
                  {symbol ? (
                    <span className="font-mono text-xs text-muted-foreground">{symbol}</span>
                  ) : null}
                  <Button
                    type="button"
                    size="xs"
                    variant="outline"
                    onClick={() => setAmount(formatUnits(balance, decimals))}
                  >
                    MAX
                  </Button>
                </div>
              ) : null}
            </div>
            {overBalance ? (
              <p className="text-sm text-destructive">Exceeds wallet balance.</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label>Duration</Label>
            <div className="grid grid-cols-5 gap-1 rounded-lg border p-1">
              {DURATIONS.map((d) => (
                <Button
                  key={d.label}
                  type="button"
                  size="sm"
                  variant={days === d.seconds ? "secondary" : "ghost"}
                  onClick={() => setDays(d.seconds)}
                >
                  {d.label}
                </Button>
              ))}
            </div>
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
                    ? "Approve & lock"
                    : "Lock tokens"}
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
                <dd className="text-right font-medium">{dateFmt.format(unlockDate)} UTC</dd>
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
            </dl>
          </div>

          <p className="text-sm leading-relaxed text-muted-foreground">
            If the pad already locked LP, lock your{" "}
            <span className="font-medium text-foreground">dev buy</span> here. LP lock ≠ wallet
            lock. Once confirmed, nobody can cancel — including you.
          </p>
        </aside>
      </div>
    </div>
  );
}
