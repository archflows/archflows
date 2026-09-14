"use client";

import Link from "next/link";
import { use, useEffect, useMemo, useState } from "react";
import { formatUnits } from "viem";
import { useAccount, usePublicClient, useReadContract, useWriteContract } from "wagmi";
import { Clock, Copy, Loader2, Lock } from "lucide-react";
import { arcFlowAbi, erc20Abi } from "@/lib/abi";
import { ARCFLOW_ADDRESS, EXPLORER_URL, MIN_MAX_FEE_PER_GAS } from "@/lib/chain";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

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

function amountText(value: bigint | undefined, decimals: number) {
  if (value === undefined) return "—";
  return Number(formatUnits(value, decimals)).toLocaleString("en-US", {
    maximumFractionDigits: 6,
  });
}

function countdown(seconds: bigint) {
  if (seconds <= 0n) return "unlocked";
  const total = Number(seconds);
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  if (d > 0) return `${d}d ${h}h left`;
  if (h > 0) return `${h}h ${m}m left`;
  return `${m}m ${total % 60}s left`;
}

export default function LockPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const lockId = BigInt(id);
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [now, setNow] = useState(() => BigInt(Math.floor(Date.now() / 1000)));

  useEffect(() => {
    const t = setInterval(() => setNow(BigInt(Math.floor(Date.now() / 1000))), 1000);
    return () => clearInterval(t);
  }, []);

  const { data: position, refetch } = useReadContract({
    address: ARCFLOW_ADDRESS,
    abi: arcFlowAbi,
    functionName: "positions",
    args: [lockId],
  });
  const { data: claimable, refetch: refetchClaimable } = useReadContract({
    address: ARCFLOW_ADDRESS,
    abi: arcFlowAbi,
    functionName: "claimable",
    args: [lockId],
  });

  const token = position?.[0];
  const beneficiary = position?.[1];
  const creator = position?.[2];
  const amount = position?.[3];
  const claimed = position?.[4];
  const start = position?.[5];
  const cliff = position?.[6];
  const end = position?.[7];

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

  const dec = decimals ?? 18;
  const released = (claimed ?? 0n) + (claimable ?? 0n);
  const isHardLock = cliff !== undefined && end !== undefined && cliff === end;
  const isDone = end !== undefined && now >= end;

  const unlockedPct = useMemo(() => {
    if (!amount || amount === 0n) return 0;
    return Number((released * 10000n) / amount) / 100;
  }, [amount, released]);

  const timePct = useMemo(() => {
    if (start === undefined || end === undefined) return 0;
    if (now >= end) return 100;
    if (now <= start) return 0;
    const span = end - start;
    if (span === 0n) return 100;
    return Number(((now - start) * 10000n) / span) / 100;
  }, [now, start, end]);

  const isBeneficiary =
    address && beneficiary && address.toLowerCase() === beneficiary.toLowerCase();

  async function claim() {
    setError("");
    if (!publicClient) return;
    setBusy(true);
    try {
      const hash = await writeContractAsync({
        address: ARCFLOW_ADDRESS,
        abi: arcFlowAbi,
        functionName: "claim",
        args: [lockId],
        maxFeePerGas: MIN_MAX_FEE_PER_GAS,
        maxPriorityFeePerGas: 1n,
      });
      await publicClient.waitForTransactionReceipt({ hash });
      await Promise.all([refetch(), refetchClaimable()]);
    } catch (err) {
      setError(err instanceof Error ? err.message.split("\n")[0] : "Claim failed.");
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // clipboard blocked
    }
  }

  if (position && !enabled) {
    return (
      <main className="mx-auto w-full max-w-3xl space-y-4 px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Lock #{id} does not exist</CardTitle>
            <CardDescription>Nothing locked under this id on this contract.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/app" className={cn(buttonVariants())}>
              Create a lock
            </Link>
          </CardContent>
        </Card>
      </main>
    );
  }

  const statusBadge = isDone ? (
    <Badge>Fully unlocked</Badge>
  ) : isHardLock ? (
    <Badge variant="secondary" className="gap-1">
      <Lock className="size-3" />
      Hard locked
    </Badge>
  ) : (
    <Badge variant="outline">Vesting</Badge>
  );

  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Proof of lock</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              {symbol ? `${symbol} ` : ""}Lock #{id}
            </h1>
            {statusBadge}
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={copyLink}>
          <Copy className="size-4" />
          {copied ? "Copied" : "Copy link"}
        </Button>
      </div>

      <Card>
        <CardContent className="grid gap-6 pt-6 sm:grid-cols-[auto_1fr] sm:items-center">
          <div className="flex size-24 flex-col items-center justify-center rounded-xl border bg-muted/40 text-center">
            <div className="text-2xl font-semibold tabular-nums">
              {unlockedPct.toFixed(unlockedPct > 0 && unlockedPct < 1 ? 2 : 0)}%
            </div>
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Unlocked</div>
          </div>
          <div className="space-y-3">
            <div>
              <div className="text-sm text-muted-foreground">Locked amount</div>
              <div className="text-3xl font-semibold tracking-tight tabular-nums">
                {amountText(amount, dec)}{" "}
                <span className="text-base font-medium text-muted-foreground">{symbol ?? ""}</span>
              </div>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-primary" style={{ width: `${Math.min(timePct, 100)}%` }} />
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{start ? dateFmt.format(new Date(Number(start) * 1000)) : "—"}</span>
              <span className="inline-flex items-center gap-1">
                <Clock className="size-3.5" />
                {end !== undefined ? countdown(end - now) : "—"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        {[
          ["Claimed", amountText(claimed, dec)],
          ["Claimable now", amountText(claimable, dec)],
          ["Still locked", amount !== undefined ? amountText(amount - released, dec) : "—"],
          ["Fully unlocks", end ? dateFmt.format(new Date(Number(end) * 1000)) : "—"],
        ].map(([label, value]) => (
          <Card key={label}>
            <CardHeader className="pb-2">
              <CardDescription>{label}</CardDescription>
              <CardTitle className="text-lg tabular-nums">{value}</CardTitle>
              <p className="text-xs text-muted-foreground">{label === "Fully unlocks" ? "UTC" : symbol ?? ""}</p>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {[
            [
              "Token",
              token && token !== ZERO ? (
                <a
                  className="font-mono text-xs text-primary hover:underline"
                  href={`${EXPLORER_URL}/address/${token}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {symbol ? `${symbol} · ` : ""}
                  {short(token)}
                </a>
              ) : (
                "—"
              ),
            ],
            ["Beneficiary", <span className="font-mono text-xs">{short(beneficiary)}</span>],
            ["Locked by", <span className="font-mono text-xs">{short(creator)}</span>],
            ["Release", isHardLock ? "Hard lock" : "Linear vest"],
            ["Cliff", cliff ? dateFmt.format(new Date(Number(cliff) * 1000)) : "—"],
          ].map(([label, value]) => (
            <div key={String(label)} className="flex items-center justify-between gap-3 border-b pb-2 last:border-b-0 last:pb-0">
              <span className="text-muted-foreground">{label}</span>
              <span className="text-right font-medium">{value}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {error ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {isBeneficiary ? (
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-6">
            <div>
              <p className="text-sm font-medium">Your position</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {claimable && claimable > 0n
                  ? `${amountText(claimable, dec)} ${symbol ?? "tokens"} ready to claim.`
                  : "Nothing unlocked yet. Come back after the cliff."}
              </p>
            </div>
            <Button disabled={busy || !claimable || claimable === 0n} onClick={claim}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              {busy ? "Claiming…" : "Claim unlocked"}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <p className="text-center text-sm text-muted-foreground">
          Only the beneficiary can claim after unlock. Creator cannot pull early.
        </p>
      )}
    </main>
  );
}

