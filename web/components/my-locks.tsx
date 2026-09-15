"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { formatUnits } from "viem";
import {
  useAccount,
  usePublicClient,
  useReadContract,
  useReadContracts,
  useWriteContract,
} from "wagmi";
import { ArrowRightIcon, Loader2Icon, LockIcon, SatelliteIcon } from "lucide-react";
import { arcFlowAbi, erc20Abi } from "@/lib/abi";
import { ARCFLOW_ADDRESS } from "@/lib/chain";
import { arcGas, txMessage } from "@/lib/tx";
import { WalletConnectButton } from "@/components/WalletConnectButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
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

type Tab = "locked" | "unlocked";

type Props = {
  createHref?: string;
  createLabel?: string;
};

function LockRow({ id }: { id: bigint }) {
  const publicClient = usePublicClient();
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const [busy, setBusy] = useState(false);
  const [claimError, setClaimError] = useState("");

  const { data: position, refetch: refetchPosition } = useReadContract({
    address: ARCFLOW_ADDRESS,
    abi: arcFlowAbi,
    functionName: "positions",
    args: [id],
  });
  const { data: claimable, refetch: refetchClaimable } = useReadContract({
    address: ARCFLOW_ADDRESS,
    abi: arcFlowAbi,
    functionName: "claimable",
    args: [id],
  });

  const token = position?.[0];
  const beneficiary = position?.[1];
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
      <div className="flex items-center gap-4 rounded-xl bg-black/25 px-4 py-3">
        <div className="h-9 w-9 animate-pulse rounded-lg bg-muted" />
        <div className="grid flex-1 gap-2">
          <div className="h-3.5 w-36 animate-pulse rounded bg-muted" />
          <div className="h-2 w-48 animate-pulse rounded bg-muted" />
        </div>
      </div>
    );
  }

  const dec = decimals ?? 18;
  const now = BigInt(Math.floor(Date.now() / 1000));
  const isDone = end !== undefined && now >= end;
  const isHardLock = cliff !== undefined && end !== undefined && cliff === end;
  const isBeneficiary =
    Boolean(address && beneficiary) && address!.toLowerCase() === beneficiary!.toLowerCase();
  const canClaim = isBeneficiary && claimable !== undefined && claimable > 0n;
  const fullyClaimed =
    isDone &&
    amount !== undefined &&
    claimed !== undefined &&
    claimed >= amount &&
    (claimable === undefined || claimable === 0n);

  let timePct = 0;
  if (start !== undefined && end !== undefined) {
    const span = end - start;
    timePct = isDone || span === 0n ? 100 : now <= start ? 0 : Number(((now - start) * 100n) / span);
  }

  const ticker = symbol ?? "Token";
  const amountLabel =
    amount !== undefined
      ? Number(formatUnits(amount, dec)).toLocaleString("en-US", { maximumFractionDigits: 4 })
      : "—";

  const statusLabel = fullyClaimed
    ? "Claimed"
    : canClaim
      ? "Ready"
      : isDone
        ? "Unlocked"
        : isHardLock
          ? "Locked"
          : "Vesting";

  async function unlock() {
    if (!publicClient || !canClaim) return;
    setClaimError("");
    setBusy(true);
    try {
      const hash = await writeContractAsync({
        address: ARCFLOW_ADDRESS,
        abi: arcFlowAbi,
        functionName: "claim",
        args: [id],
        ...arcGas,
      });
      await publicClient.waitForTransactionReceipt({ hash });
      await Promise.all([refetchPosition(), refetchClaimable()]);
    } catch (err) {
      setClaimError(txMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl bg-black/20 px-4 py-3">
      <div className="flex items-center gap-4">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 font-mono text-[10px] font-semibold tracking-wide text-primary">
          {ticker.slice(0, 3).toUpperCase()}
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate font-medium tabular-nums text-foreground">
              {amountLabel} {ticker}
            </span>
            <Badge variant="outline" className="font-normal">
              {statusLabel}
            </Badge>
          </div>

          <div className="h-1.5 max-w-xs overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-[width]"
              style={{ width: `${Math.min(timePct, 100)}%` }}
            />
          </div>

          <p className="truncate font-mono text-[11px] text-muted-foreground">
            LOCK #{id.toString()}, {isDone ? "unlocked" : "unlocks"}{" "}
            {end ? dateFmt.format(new Date(Number(end) * 1000)) : "—"}
            {claimed !== undefined && claimed > 0n
              ? `, claimed ${Number(formatUnits(claimed, dec)).toLocaleString("en-US", {
                  maximumFractionDigits: 4,
                })}`
              : ""}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {canClaim ? (
            <Button size="sm" disabled={busy} onClick={unlock}>
              {busy ? <Loader2Icon className="size-3.5 animate-spin" /> : null}
              {busy ? "Unlocking…" : "Unlock"}
            </Button>
          ) : null}
          <Button
            size="sm"
            variant="ghost"
            className="text-primary hover:text-primary"
            nativeButton={false}
            render={<Link href={`/lock/${id.toString()}`} />}
          >
            Proof
            <ArrowRightIcon className="size-3.5" />
          </Button>
        </div>
      </div>
      {claimError ? <p className="mt-2 text-xs text-destructive">{claimError}</p> : null}
    </div>
  );
}

function useWalletLockBuckets(owner: `0x${string}`) {
  const enabled = Boolean(owner) && ARCFLOW_ADDRESS !== ZERO;

  const { data: createdCount } = useReadContract({
    address: ARCFLOW_ADDRESS,
    abi: arcFlowAbi,
    functionName: "creatorLockCount",
    args: [owner],
    query: { enabled },
  });
  const { data: receivedCount } = useReadContract({
    address: ARCFLOW_ADDRESS,
    abi: arcFlowAbi,
    functionName: "beneficiaryLockCount",
    args: [owner],
    query: { enabled },
  });

  const created = Math.min(Number(createdCount ?? 0n), MAX_ROWS);
  const received = Math.min(Number(receivedCount ?? 0n), MAX_ROWS);

  const idContracts = useMemo(
    () => [
      ...Array.from({ length: created }, (_, i) => ({
        address: ARCFLOW_ADDRESS,
        abi: arcFlowAbi,
        functionName: "locksByCreator" as const,
        args: [owner, BigInt(i)] as const,
      })),
      ...Array.from({ length: received }, (_, i) => ({
        address: ARCFLOW_ADDRESS,
        abi: arcFlowAbi,
        functionName: "locksByBeneficiary" as const,
        args: [owner, BigInt(i)] as const,
      })),
    ],
    [created, received, owner],
  );

  const { data: idResults, isPending: idsPending } = useReadContracts({
    contracts: idContracts,
    query: { enabled: enabled && idContracts.length > 0 },
  });

  const ids = useMemo(() => {
    const seen = new Set<string>();
    const out: bigint[] = [];
    for (const row of idResults ?? []) {
      if (row.status !== "success" || row.result === undefined) continue;
      const id = row.result as bigint;
      const key = id.toString();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(id);
    }
    return out;
  }, [idResults]);

  const positionContracts = useMemo(
    () =>
      ids.map((id) => ({
        address: ARCFLOW_ADDRESS,
        abi: arcFlowAbi,
        functionName: "positions" as const,
        args: [id] as const,
      })),
    [ids],
  );

  const { data: positionResults, isPending: positionsPending } = useReadContracts({
    contracts: positionContracts,
    query: { enabled: enabled && positionContracts.length > 0 },
  });

  return useMemo(() => {
    const now = BigInt(Math.floor(Date.now() / 1000));
    const locked: bigint[] = [];
    const unlocked: bigint[] = [];

    ids.forEach((id, i) => {
      const row = positionResults?.[i];
      if (!row || row.status !== "success" || !row.result) return;
      const end = row.result[7] as bigint;
      if (now >= end) unlocked.push(id);
      else locked.push(id);
    });

    const pending =
      (created + received > 0 && idsPending) ||
      (ids.length > 0 && positionsPending);

    return { locked, unlocked, pending, total: ids.length };
  }, [ids, positionResults, idsPending, positionsPending, created, received]);
}

function Locks({
  owner,
  createHref,
  createLabel,
}: {
  owner: `0x${string}`;
  createHref: string;
  createLabel: string;
}) {
  const [tab, setTab] = useState<Tab>("locked");
  const { locked, unlocked, pending, total } = useWalletLockBuckets(owner);
  const rows = tab === "locked" ? locked : unlocked;

  return (
    <div className="space-y-4">
      <Card className="shadow-none ring-0">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2">
            <LockIcon className="size-4 text-primary" />
            Your positions
          </CardTitle>
          <CardDescription>
            Locks tied to this wallet, still locked or already unlocked.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div className="seg seg-2 max-w-md">
            <button
              type="button"
              className={cn("seg-btn", tab === "locked" && "on")}
              onClick={() => setTab("locked")}
            >
              Locked ({locked.length})
            </button>
            <button
              type="button"
              className={cn("seg-btn", tab === "unlocked" && "on")}
              onClick={() => setTab("unlocked")}
            >
              Unlocked ({unlocked.length})
            </button>
          </div>

          {pending ? (
            <div className="grid gap-2">
              {Array.from({ length: 2 }, (_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 rounded-xl bg-black/25 px-4 py-3"
                >
                  <div className="h-9 w-9 animate-pulse rounded-lg bg-muted" />
                  <div className="grid flex-1 gap-2">
                    <div className="h-3.5 w-36 animate-pulse rounded bg-muted" />
                    <div className="h-2 w-48 animate-pulse rounded bg-muted" />
                  </div>
                </div>
              ))}
            </div>
          ) : total === 0 ? (
            <div className="flex flex-col items-start gap-3 rounded-xl bg-black/20 px-4 py-6">
              <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <SatelliteIcon className="size-4" />
              </span>
              <div>
                <p className="font-medium text-foreground">No positions yet</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Create a lock, then share the proof page under your CA.
                </p>
              </div>
              <Button size="sm" nativeButton={false} render={<Link href={createHref} />}>
                {createLabel}
              </Button>
            </div>
          ) : rows.length === 0 ? (
            <div className="rounded-xl bg-black/20 px-4 py-6 text-sm text-white">
              {tab === "locked" ? "Nothing still locked." : "Nothing unlocked yet."}
            </div>
          ) : (
            <div className="grid gap-2">
              {rows.map((id) => (
                <LockRow key={id.toString()} id={id} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function MyLocksPage({
  createHref = "/dashboard/locks",
  createLabel = "Create lock",
}: Props) {
  const { address, isConnected } = useAccount();

  if (!isConnected || !address) {
    return (
      <Card className="max-w-md shadow-none ring-0">
        <CardHeader>
          <CardTitle>Wallet required</CardTitle>
          <CardDescription>
            Connect on Arc Testnet to read positions tied to your address.
          </CardDescription>
          <CardAction>
            <Badge variant="outline">Read-only</Badge>
          </CardAction>
        </CardHeader>
        <CardContent>
          <WalletConnectButton />
        </CardContent>
      </Card>
    );
  }

  return <Locks owner={address} createHref={createHref} createLabel={createLabel} />;
}
