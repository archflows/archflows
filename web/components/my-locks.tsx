"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { formatUnits } from "viem";
import {
  useAccount,
  usePublicClient,
  useReadContract,
  useReadContracts,
  useWriteContract,
} from "wagmi";
import { ArrowRightIcon, CopyIcon, ExternalLinkIcon, HourglassIcon, Loader2Icon, LockIcon, SatelliteIcon } from "lucide-react";
import { arcFlowAbi } from "@/lib/abi";
import { ARCFLOW_ADDRESS, explorerTxUrl } from "@/lib/chain";
import { arcGas, confirmTx, txMessage } from "@/lib/tx";
import { persistLockClaim } from "@/lib/backend";
import { WalletConnectButton } from "@/components/WalletConnectButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { RowActions } from "@/components/row-actions";
import { useLockTxMap, type LockTxRecord } from "@/hooks/useTxHashMap";
import { useTokenMeta } from "@/hooks/useTokenMeta";
import { useNowSec } from "@/hooks/useNowSec";
import { proofPath } from "@/lib/proof";
import { isHardLock } from "@/lib/position-kind";
import { lockClaimable } from "@/lib/schedule";
import { abiField, asAddress, asBigint } from "@/lib/abi-result";
import { copyToClipboard } from "@/lib/clipboard";
import { clickOrExplain } from "@/lib/guard-click";
import { formatCountdown } from "@/lib/form-time";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ListRowSkeleton } from "@/components/page-skeleton";
import { cn } from "@/lib/utils";

const ZERO = "0x0000000000000000000000000000000000000000";
const MAX_ROWS = 50;
const READ_STALE = { staleTime: 30_000, gcTime: 10 * 60_000 } as const;

type Position = {
  token: `0x${string}`;
  beneficiary: `0x${string}`;
  creator: `0x${string}`;
  amount: bigint;
  claimed: bigint;
  start: bigint;
  cliff: bigint;
  end: bigint;
};

function parsePosition(raw: unknown): Position | undefined {
  const token = asAddress(abiField(raw, 0, "token"));
  const beneficiary = asAddress(abiField(raw, 1, "beneficiary"));
  const creator = asAddress(abiField(raw, 2, "creator"));
  if (!token || !beneficiary || !creator) return undefined;
  return {
    token,
    beneficiary,
    creator,
    amount: asBigint(abiField(raw, 3, "amount")),
    claimed: asBigint(abiField(raw, 4, "claimed")),
    start: asBigint(abiField(raw, 5, "start")),
    cliff: asBigint(abiField(raw, 6, "cliff")),
    end: asBigint(abiField(raw, 7, "end")),
  };
}

const dateFmt = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

type Tab = "locked" | "unlocked";
type Kind = "lock" | "vest";

type Props = {
  kind?: Kind;
  createHref?: string;
  createLabel?: string;
};

function fmtAmt(value: bigint, decimals: number) {
  return Number(formatUnits(value, decimals)).toLocaleString("en-US", { maximumFractionDigits: 4 });
}

function LockRow(props: {
  id: bigint;
  indexed?: LockTxRecord;
  kind: Kind;
  position?: Position;
  now: bigint;
  onRefresh?: () => Promise<unknown>;
}) {
  if (!props.position) {
    return (
      <div className="flex items-center gap-4 rounded-xl bg-black/25 px-4 py-3">
        <div className="skeleton size-9 shrink-0 rounded-lg" />
        <div className="grid flex-1 gap-2">
          <div className="skeleton h-3.5 w-36" />
          <div className="skeleton h-2 w-48" />
        </div>
      </div>
    );
  }
  return <LockRowReady {...props} position={props.position} />;
}

function LockRowReady({
  id,
  indexed,
  kind,
  position,
  now,
  onRefresh,
}: {
  id: bigint;
  indexed?: LockTxRecord;
  kind: Kind;
  position: Position;
  now: bigint;
  onRefresh?: () => Promise<unknown>;
}) {
  const publicClient = usePublicClient();
  const queryClient = useQueryClient();
  const router = useRouter();
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const [busy, setBusy] = useState(false);
  const [claimError, setClaimError] = useState("");
  const [unlockHash, setUnlockHash] = useState<string | null>(null);

  const { symbol, decimals } = useTokenMeta(position.token);
  const { beneficiary, creator, amount, claimed, start, cliff, end } = position;
  const dec = decimals ?? 18;
  const isDone = now >= end;
  const hard = isHardLock(cliff, end);
  const isBeneficiary =
    Boolean(address) && address!.toLowerCase() === beneficiary.toLowerCase();
  const liveClaimable = lockClaimable({ amount, claimed, start, cliff, end, now });
  const fullyClaimed = claimed >= amount && liveClaimable === 0n && isDone;
  const span = end - start;
  const timePct =
    isDone || span === 0n ? 100 : now <= start ? 0 : Number(((now - start) * 100n) / span);
  const ticker = symbol ?? "Token";
  const claimedOnChain = claimed > 0n;
  const rawCreate = indexed?.create;
  const rawUnlock =
    unlockHash ?? indexed?.unlock ?? (claimedOnChain && !indexed?.unlock ? rawCreate : undefined);
  const duplicateHash =
    Boolean(rawCreate && rawUnlock) && rawCreate!.toLowerCase() === rawUnlock!.toLowerCase();
  const lockTx = duplicateHash ? undefined : rawCreate;
  const unlockTx = rawUnlock;
  const proofHref = proofPath("lock", indexed?.create ?? lockTx, id);

  function claimReason(): string | null {
    if (busy) return "Transaction in progress.";
    if (!address) return "Connect a wallet to claim.";
    if (!publicClient) return "Wallet is still connecting.";
    if (!isBeneficiary) return "Only the beneficiary can claim this position.";
    if (fullyClaimed) return "Already fully claimed.";
    if (now < cliff) return `Cliff is ${dateFmt.format(new Date(Number(cliff) * 1000))} UTC.`;
    if (kind === "lock" && now < end) {
      return `Unlocks ${dateFmt.format(new Date(Number(end) * 1000))} UTC · ${formatCountdown(Number(end - now), "Unlocked")} left.`;
    }
    if (liveClaimable === 0n) {
      return kind === "vest" ? "Nothing vested to claim yet." : "Nothing to unlock yet.";
    }
    return null;
  }

  async function unlock() {
    const reason = claimReason();
    if (reason || !publicClient || !address) {
      clickOrExplain(reason ?? "Cannot claim right now.", () => undefined);
      return;
    }
    setClaimError("");
    setBusy(true);
    try {
      const onChain = await publicClient.readContract({
        address: ARCFLOW_ADDRESS,
        abi: arcFlowAbi,
        functionName: "claimable",
        args: [id],
      });
      if (onChain === 0n) {
        throw new Error("Nothing to claim yet.");
      }
      await publicClient.simulateContract({
        account: address,
        address: ARCFLOW_ADDRESS,
        abi: arcFlowAbi,
        functionName: "claim",
        args: [id],
      });
      const hash = await writeContractAsync({
        address: ARCFLOW_ADDRESS,
        abi: arcFlowAbi,
        functionName: "claim",
        args: [id],
        ...arcGas,
      });
      await confirmTx(publicClient, hash);
      setUnlockHash(hash);
      await persistLockClaim({
        id: id.toString(),
        claimed: (claimed + onChain).toString(),
        unlockTxHash: hash,
        token: position.token,
        beneficiary,
        creator,
        amount: amount.toString(),
        start: Number(start),
        cliff: Number(cliff),
        end: Number(end),
        kind: hard ? "lock" : "vest",
        txHash: indexed?.create,
      });
      await queryClient.invalidateQueries({ queryKey: ["arcflow-api", "tx-hashes"] });
      await queryClient.invalidateQueries({ queryKey: ["arcflow-api", "stats"] });
      await onRefresh?.();
    } catch (err) {
      setClaimError(txMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const blocked = claimReason();

  return (
    <div className="rounded-xl bg-black/20 px-4 py-3">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {kind === "vest" ? <HourglassIcon className="size-4" /> : <LockIcon className="size-4" />}
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate font-medium tabular-nums text-white">
              {fmtAmt(amount, dec)} {ticker}
            </span>
            {isDone ? (
              <Badge className="border-white/25 bg-white/20 font-normal text-white">
                {kind === "vest" ? "Fully vested" : "Unlocked"}
              </Badge>
            ) : kind === "vest" ? (
              <Badge className="border-white/25 bg-black/40 font-normal text-white">Vesting</Badge>
            ) : (
              <Badge className="border-white/25 bg-black/40 font-normal text-white">Locked</Badge>
            )}
            {fullyClaimed ? <Badge className="font-normal">Claimed</Badge> : null}
            {liveClaimable > 0n && isBeneficiary ? <Badge className="font-normal">Ready</Badge> : null}
          </div>

          <div className="h-1.5 max-w-xs overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-[width]"
              style={{ width: `${Math.min(timePct, 100)}%` }}
            />
          </div>

          <p className="truncate font-mono text-[11px] text-white/70">
            {kind === "vest" ? "VEST" : "LOCK"} #{id.toString()} ·{" "}
            {kind === "vest"
              ? isDone
                ? "fully vested"
                : `releases through ${dateFmt.format(new Date(Number(end) * 1000))} · ${formatCountdown(Number(end - now), "Vested")}`
              : isDone
                ? "unlocked"
                : `unlocks ${dateFmt.format(new Date(Number(end) * 1000))} · ${formatCountdown(Number(end - now), "Unlocked")}`}
            {kind === "vest" && !isDone && cliff > start
              ? ` · cliff ${dateFmt.format(new Date(Number(cliff) * 1000))}`
              : ""}
            {liveClaimable > 0n ? ` · claimable ${fmtAmt(liveClaimable, dec)}` : ""}
            {claimed > 0n ? ` · claimed ${fmtAmt(claimed, dec)}` : ""}
          </p>
        </div>

        <RowActions
          busy={busy}
          primary={
            fullyClaimed ? null : (
              <Button
                type="button"
                size="sm"
                disabled={busy}
                onClick={() => clickOrExplain(blocked, () => void unlock())}
              >
                {busy ? <Loader2Icon className="size-3.5 animate-spin" /> : null}
                {busy ? "Claiming…" : kind === "vest" ? "Claim vested" : "Unlock"}
              </Button>
            )
          }
          items={[
            {
              id: "proof",
              label: "Open proof",
              icon: <ArrowRightIcon />,
              onSelect: () => {
                router.push(proofHref);
              },
            },
            {
              id: "copy",
              label: "Copy proof link",
              icon: <CopyIcon />,
              onSelect: () => {
                void copyToClipboard(`${window.location.origin}${proofHref}`, "Proof link copied");
              },
            },
            {
              id: "lock-tx",
              label: "View create tx",
              icon: <ExternalLinkIcon />,
              hidden: !lockTx,
              onSelect: () => {
                if (lockTx) window.open(explorerTxUrl(lockTx), "_blank", "noopener,noreferrer");
              },
            },
            {
              id: "claim-tx",
              label: kind === "vest" ? "View claim tx" : "View unlock tx",
              icon: <ExternalLinkIcon />,
              hidden: !unlockTx,
              onSelect: () => {
                if (unlockTx) window.open(explorerTxUrl(unlockTx), "_blank", "noopener,noreferrer");
              },
            },
          ]}
        />
      </div>
      {claimError ? <p className="mt-2 text-xs text-destructive">{claimError}</p> : null}
    </div>
  );
}

function useWalletLockBuckets(owner: `0x${string}`, kind: Kind) {
  const enabled = Boolean(owner) && ARCFLOW_ADDRESS !== ZERO;

  const { data: createdCount } = useReadContract({
    address: ARCFLOW_ADDRESS,
    abi: arcFlowAbi,
    functionName: "creatorLockCount",
    args: [owner],
    query: { enabled, ...READ_STALE },
  });
  const { data: receivedCount } = useReadContract({
    address: ARCFLOW_ADDRESS,
    abi: arcFlowAbi,
    functionName: "beneficiaryLockCount",
    args: [owner],
    query: { enabled, ...READ_STALE },
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
    query: { enabled: enabled && idContracts.length > 0, ...READ_STALE },
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

  const {
    data: positionResults,
    isPending: positionsPending,
    refetch: refetchPositions,
  } = useReadContracts({
    contracts: positionContracts,
    query: { enabled: enabled && positionContracts.length > 0, ...READ_STALE },
  });

  return useMemo(() => {
    const now = BigInt(Math.floor(Date.now() / 1000));
    const locked: bigint[] = [];
    const unlocked: bigint[] = [];
    const positions = new Map<string, Position>();

    ids.forEach((id, i) => {
      const row = positionResults?.[i];
      if (!row || row.status !== "success" || !row.result) return;
      const position = parsePosition(row.result);
      if (!position) return;
      positions.set(id.toString(), position);
      const cliff = position.cliff;
      const end = position.end;
      const hard = isHardLock(cliff, end);
      if (kind === "lock" && !hard) return;
      if (kind === "vest" && hard) return;
      if (now >= end) unlocked.push(id);
      else locked.push(id);
    });

    const pending =
      (created + received > 0 && idsPending) ||
      (ids.length > 0 && positionsPending);

    return {
      locked,
      unlocked,
      pending,
      total: locked.length + unlocked.length,
      positions,
      refetchPositions,
    };
  }, [ids, positionResults, idsPending, positionsPending, created, received, kind, refetchPositions]);
}

function Locks({
  owner,
  kind,
  createHref,
  createLabel,
}: {
  owner: `0x${string}`;
  kind: Kind;
  createHref: string;
  createLabel: string;
}) {
  const [tab, setTab] = useState<Tab>("locked");
  const now = useNowSec();
  const { locked, unlocked, pending, total, positions, refetchPositions } = useWalletLockBuckets(
    owner,
    kind,
  );
  const { data: txMap } = useLockTxMap(owner);
  const rows = useMemo(
    () => (tab === "locked" ? locked : unlocked).slice(0, MAX_ROWS),
    [tab, locked, unlocked],
  );
  const vest = kind === "vest";

  return (
    <div className="space-y-4">
      <Card className="shadow-none ring-0">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2">
            {vest ? (
              <HourglassIcon className="size-4 text-primary" />
            ) : (
              <LockIcon className="size-4 text-primary" />
            )}
            {vest ? "Your vests" : "Your locks"}
          </CardTitle>
          <CardDescription>
            {vest
              ? "Linear schedules for this wallet — still releasing or fully vested."
              : "Hard locks for this wallet — still frozen or already unlocked."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div className="seg seg-2 max-w-md">
            <button
              type="button"
              className={cn("seg-btn", tab === "locked" && "on")}
              onClick={() => setTab("locked")}
            >
              {vest ? `Releasing (${locked.length})` : `Locked (${locked.length})`}
            </button>
            <button
              type="button"
              className={cn("seg-btn", tab === "unlocked" && "on")}
              onClick={() => setTab("unlocked")}
            >
              {vest ? `Fully vested (${unlocked.length})` : `Unlocked (${unlocked.length})`}
            </button>
          </div>

          {pending ? (
            <ListRowSkeleton count={4} />
          ) : total === 0 ? (
            <div className="flex flex-col items-start gap-3 rounded-xl bg-black/20 px-4 py-6">
              <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                {vest ? <HourglassIcon className="size-4" /> : <SatelliteIcon className="size-4" />}
              </span>
              <div>
                <p className="font-medium text-foreground">
                  {vest ? "No vesting schedules yet" : "No hard locks yet"}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {vest
                    ? "Create a vest to stream tokens after an optional cliff. Hard locks live under Locks."
                    : "Create a lock to freeze the full amount until one date. Linear schedules live under Vesting."}
                </p>
              </div>
              <Link href={createHref} className={cn(buttonVariants({ size: "sm" }), "text-primary-foreground")}>
                {createLabel}
              </Link>
            </div>
          ) : rows.length === 0 ? (
            <div className="rounded-xl bg-black/20 px-4 py-6 text-sm text-white">
              {tab === "locked"
                ? vest
                  ? "Nothing still vesting."
                  : "Nothing still locked."
                : vest
                  ? "Nothing fully vested yet."
                  : "Nothing unlocked yet."}
            </div>
          ) : (
            <div className="grid gap-2">
              {rows.map((id) => (
                <LockRow
                  key={id.toString()}
                  id={id}
                  kind={kind}
                  indexed={txMap?.get(id.toString())}
                  position={positions.get(id.toString())}
                  now={now}
                  onRefresh={refetchPositions}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function MyLocksPage({
  kind = "lock",
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
            Connect a wallet to see {kind === "vest" ? "vests" : "locks"} for your address.
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

  return <Locks owner={address} kind={kind} createHref={createHref} createLabel={createLabel} />;
}
