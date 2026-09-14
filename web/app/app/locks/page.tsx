"use client";

import Link from "next/link";
import { useState } from "react";
import { formatUnits } from "viem";
import { useAccount, useReadContract } from "wagmi";
import { ArrowRight, Loader2, Lock } from "lucide-react";
import { arcFlowAbi, erc20Abi } from "@/lib/abi";
import { ARCFLOW_ADDRESS } from "@/lib/chain";
import { WalletConnectButton } from "@/components/WalletConnectButton";
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
const MAX_ROWS = 50;

const dateFmt = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

type Tab = "created" | "receiving";

function LockCard({ id }: { id: bigint }) {
  const { data: position } = useReadContract({
    address: ARCFLOW_ADDRESS,
    abi: arcFlowAbi,
    functionName: "positions",
    args: [id],
  });

  const token = position?.[0];
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

  if (!position) {
    return (
      <div className="border-b px-4 py-4">
        <div className="h-4 w-40 animate-pulse rounded bg-muted" />
        <div className="mt-2 h-2 w-64 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  const dec = decimals ?? 18;
  const now = BigInt(Math.floor(Date.now() / 1000));
  const isDone = end !== undefined && now >= end;
  const isHardLock = cliff !== undefined && end !== undefined && cliff === end;

  let timePct = 0;
  if (start !== undefined && end !== undefined) {
    const span = end - start;
    timePct = isDone || span === 0n ? 100 : now <= start ? 0 : Number(((now - start) * 100n) / span);
  }

  const ticker = symbol ?? "Token";

  return (
    <Link
      href={`/lock/${id.toString()}`}
      className="flex flex-col gap-3 border-b px-4 py-4 transition-colors last:border-b-0 hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="min-w-0 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-md border bg-muted font-mono text-[10px] font-semibold">
            {ticker.slice(0, 3).toUpperCase()}
          </span>
          <span className="font-medium">
            {amount !== undefined
              ? Number(formatUnits(amount, dec)).toLocaleString("en-US", {
                  maximumFractionDigits: 4,
                })
              : "—"}{" "}
            {ticker}
          </span>
          {isDone ? (
            <Badge>Unlocked</Badge>
          ) : isHardLock ? (
            <Badge variant="secondary">Hard locked</Badge>
          ) : (
            <Badge variant="outline">Vesting</Badge>
          )}
        </div>
        <div className="h-1.5 max-w-xs overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-primary" style={{ width: `${Math.min(timePct, 100)}%` }} />
        </div>
        <p className="text-xs text-muted-foreground">
          Lock #{id.toString()} · {isDone ? "unlocked" : "unlocks"}{" "}
          {end ? dateFmt.format(new Date(Number(end) * 1000)) : "—"}
          {claimed !== undefined && claimed > 0n
            ? ` · claimed ${Number(formatUnits(claimed, dec)).toLocaleString("en-US", {
                maximumFractionDigits: 4,
              })}`
            : ""}
        </p>
      </div>
      <span className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "shrink-0")}>
        Open proof
        <ArrowRight className="size-4" />
      </span>
    </Link>
  );
}

function IndexedLock({ owner, index, tab }: { owner: `0x${string}`; index: number; tab: Tab }) {
  const { data: id } = useReadContract({
    address: ARCFLOW_ADDRESS,
    abi: arcFlowAbi,
    functionName: tab === "created" ? "locksByCreator" : "locksByBeneficiary",
    args: [owner, BigInt(index)],
  });
  if (id === undefined) return null;
  return <LockCard id={id} />;
}

function Locks({ owner }: { owner: `0x${string}` }) {
  const [tab, setTab] = useState<Tab>("created");

  const { data: createdCount } = useReadContract({
    address: ARCFLOW_ADDRESS,
    abi: arcFlowAbi,
    functionName: "creatorLockCount",
    args: [owner],
  });
  const { data: receivedCount } = useReadContract({
    address: ARCFLOW_ADDRESS,
    abi: arcFlowAbi,
    functionName: "beneficiaryLockCount",
    args: [owner],
  });

  const created = Number(createdCount ?? 0n);
  const received = Number(receivedCount ?? 0n);
  const count = tab === "created" ? created : received;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Locks created</CardDescription>
            <CardTitle className="text-2xl tabular-nums">{created}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Locks receiving</CardDescription>
            <CardTitle className="text-2xl tabular-nums">{received}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid max-w-sm grid-cols-2 gap-1 rounded-lg border p-1">
        <Button
          type="button"
          size="sm"
          variant={tab === "created" ? "secondary" : "ghost"}
          onClick={() => setTab("created")}
        >
          Created ({created})
        </Button>
        <Button
          type="button"
          size="sm"
          variant={tab === "receiving" ? "secondary" : "ghost"}
          onClick={() => setTab("receiving")}
        >
          Receiving ({received})
        </Button>
      </div>

      <Card className="overflow-hidden p-0">
        {count === 0 ? (
          <div className="flex flex-col items-start gap-3 p-6">
            <div className="flex size-9 items-center justify-center rounded-md border bg-muted">
              <Lock className="size-4" />
            </div>
            <div>
              <h2 className="font-medium">
                {tab === "created" ? "No locks yet" : "Nothing vesting to you"}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {tab === "created"
                  ? "Create a lock after your token launch, then share the proof link."
                  : "When someone locks tokens to your wallet, it shows up here."}
              </p>
            </div>
            {tab === "created" ? (
              <Link href="/app" className={cn(buttonVariants())}>
                Create lock
              </Link>
            ) : null}
          </div>
        ) : (
          <div>
            {Array.from({ length: Math.min(count, MAX_ROWS) }, (_, i) => (
              <IndexedLock key={`${tab}-${i}`} owner={owner} index={i} tab={tab} />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

export default function MyLocksPage() {
  const { address, isConnected } = useAccount();

  return (
    <div className="space-y-6">
      {!isConnected || !address ? (
        <Card className="max-w-md">
          <CardHeader>
            <Badge variant="outline" className="w-fit gap-1">
              <Lock className="size-3" />
              Wallet required
            </Badge>
            <CardTitle>Connect to see your locks</CardTitle>
            <CardDescription>ArcFlow reads positions straight from the contract.</CardDescription>
          </CardHeader>
          <CardContent>
            <WalletConnectButton />
          </CardContent>
        </Card>
      ) : (
        <Locks owner={address} />
      )}
    </div>
  );
}
