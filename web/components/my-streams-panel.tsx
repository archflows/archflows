"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { formatUnits, isAddress, parseUnits } from "viem";
import {
  useAccount,
  usePublicClient,
  useReadContract,
  useReadContracts,
  useWriteContract,
} from "wagmi";
import {
  ArrowRightIcon,
  CopyIcon,
  ExternalLinkIcon,
  Loader2Icon,
  WavesIcon,
} from "lucide-react";
import { erc20Abi, streamAbi } from "@/lib/abi";
import { ARCFLOW_STREAM_ADDRESS, explorerTxUrl } from "@/lib/chain";
import { ZERO, dateFmt, shorten } from "@/lib/form-time";
import { MAX_U128, arcGas, confirmTx, txMessage } from "@/lib/tx";
import { patchStream } from "@/lib/backend";
import { WalletConnectButton } from "@/components/WalletConnectButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RowActions } from "@/components/row-actions";
import { useTxHashMap } from "@/hooks/useTxHashMap";
import { useTokenMeta } from "@/hooks/useTokenMeta";
import { useNowSec } from "@/hooks/useNowSec";
import { goToExplorerTx } from "@/lib/explorer-nav";
import { proofPath } from "@/lib/proof";
import { streamWithdrawable } from "@/lib/schedule";
import { abiField, asAddress, asBigint, asBool } from "@/lib/abi-result";
import { copyToClipboard } from "@/lib/clipboard";
import { clickOrExplain } from "@/lib/guard-click";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ListRowSkeleton } from "@/components/page-skeleton";
import { cn } from "@/lib/utils";

const MAX_ROWS = 40;
const READ_STALE = { staleTime: 30_000, gcTime: 10 * 60_000 } as const;
type Tab = "receiving" | "sent";
type Panel = "idle" | "topup" | "transfer" | "cancel";

type Stream = {
  token: `0x${string}`;
  sender: `0x${string}`;
  recipient: `0x${string}`;
  amount: bigint;
  withdrawn: bigint;
  vestedBase: bigint;
  start: bigint;
  cliff: bigint;
  end: bigint;
  period: bigint;
  cancelable: boolean;
  transferable: boolean;
  canTopup: boolean;
  canceled: boolean;
};

function parseStream(raw: unknown): Stream | undefined {
  const token = asAddress(abiField(raw, 0, "token"));
  const sender = asAddress(abiField(raw, 1, "sender"));
  const recipient = asAddress(abiField(raw, 2, "recipient"));
  if (!token || token === ZERO || !sender || !recipient) return undefined;
  return {
    token,
    sender,
    recipient,
    amount: asBigint(abiField(raw, 3, "amount")),
    withdrawn: asBigint(abiField(raw, 4, "withdrawn")),
    vestedBase: asBigint(abiField(raw, 5, "vestedBase")),
    start: asBigint(abiField(raw, 6, "start")),
    cliff: asBigint(abiField(raw, 7, "cliff")),
    end: asBigint(abiField(raw, 8, "end")),
    period: asBigint(abiField(raw, 9, "period"), 1n),
    cancelable: asBool(abiField(raw, 10, "cancelable")),
    transferable: asBool(abiField(raw, 11, "transferable")),
    canTopup: asBool(abiField(raw, 12, "canTopup")),
    canceled: asBool(abiField(raw, 13, "canceled")),
  };
}

function fmtAmt(value: bigint, decimals: number) {
  return Number(formatUnits(value, decimals)).toLocaleString("en-US", { maximumFractionDigits: 4 });
}

function StreamRow(props: {
  id: bigint;
  role: Tab;
  indexedHash?: string;
  s?: Stream;
  now: bigint;
  onRefresh?: () => Promise<unknown>;
}) {
  if (!props.s) {
    return (
      <div className="dash-well flex items-center gap-4 px-4 py-3">
        <div className="skeleton size-9 shrink-0 rounded-lg" />
        <div className="grid flex-1 gap-2">
          <div className="skeleton h-3.5 w-36" />
          <div className="skeleton h-2 w-48" />
        </div>
      </div>
    );
  }
  return <StreamRowReady {...props} s={props.s} />;
}

function StreamRowReady({
  id,
  role,
  indexedHash,
  s,
  now,
  onRefresh,
}: {
  id: bigint;
  role: Tab;
  indexedHash?: string;
  s: Stream;
  now: bigint;
  onRefresh?: () => Promise<unknown>;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [panel, setPanel] = useState<Panel>("idle");
  const [topUpAmt, setTopUpAmt] = useState("");
  const [transferTo, setTransferTo] = useState("");
  const [txHash, setTxHash] = useState<string | null>(null);

  const { symbol, decimals } = useTokenMeta(s.token);
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: s.token,
    abi: erc20Abi,
    functionName: "allowance",
    args: address ? [address, ARCFLOW_STREAM_ADDRESS] : undefined,
    query: {
      enabled: Boolean(address && role === "sent" && s.canTopup && !s.canceled),
      staleTime: 8_000,
    },
  });

  if (!s) {
    return (
      <div className="sk-list-row" style={{ pointerEvents: "none" }} aria-hidden>
        <div className="skeleton size-9 rounded-lg" style={{ width: "2.25rem", height: "2.25rem" }} />
        <div className="sk-stack" style={{ flex: 1, gap: "0.35rem" }}>
          <div className="skeleton" style={{ width: "9rem", height: "0.7rem", borderRadius: 999 }} />
          <div className="skeleton" style={{ width: "12rem", height: "0.55rem", borderRadius: 999 }} />
        </div>
      </div>
    );
  }

  const dec = decimals ?? 18;
  const ticker = symbol ?? "Token";
  const isRecipient = Boolean(address) && address!.toLowerCase() === s.recipient.toLowerCase();
  const isSender = Boolean(address) && address!.toLowerCase() === s.sender.toLowerCase();
  const liveWithdrawable = streamWithdrawable({ ...s, now });
  const isDone = now >= s.end || s.canceled;
  const span = s.end - s.start;
  const timePct =
    isDone || span === 0n ? 100 : now <= s.start ? 0 : Number(((now - s.start) * 100n) / span);
  const proofHref = proofPath("stream", txHash ?? indexedHash, id);
  const explorerHash = txHash ?? indexedHash;

  function withdrawReason(): string | null {
    if (busy) return "Transaction in progress.";
    if (!address) return "Connect a wallet to withdraw.";
    if (!publicClient) return "Wallet is still connecting.";
    if (!isRecipient) return "Only the recipient can withdraw.";
    if (liveWithdrawable === 0n) return "Nothing withdrawable yet.";
    return null;
  }

  function cancelReason(): string | null {
    if (busy) return "Transaction in progress.";
    if (!isSender) return "Only the sender can cancel.";
    if (!s.cancelable) return "This stream was created as non-cancellable.";
    if (s.canceled) return "Already cancelled.";
    return null;
  }

  function topUpReason(): string | null {
    if (busy) return "Transaction in progress.";
    if (!isSender) return "Only the sender can top up.";
    if (!s.canTopup) return "This stream does not allow top-ups.";
    if (s.canceled) return "Cancelled streams cannot be topped up.";
    if (now >= s.end) return "This stream has already ended.";
    return null;
  }

  function transferReason(): string | null {
    if (busy) return "Transaction in progress.";
    if (!isRecipient) return "Only the recipient can transfer.";
    if (!s.transferable) return "This stream is not transferable.";
    if (s.canceled) return "Cancelled streams cannot be transferred.";
    if (liveWithdrawable > 0n) return "Withdraw vested tokens before transferring.";
    return null;
  }

  async function afterTx(hash: string, patch: Record<string, unknown>) {
    setTxHash(hash);
    await patchStream(id.toString(), { ...patch, txHash: hash });
    await queryClient.invalidateQueries({ queryKey: ["arcflow-api"] });
    await onRefresh?.();
    goToExplorerTx(router, hash);
  }

  async function run(fn: () => Promise<void>) {
    if (!publicClient || !address) {
      clickOrExplain("Connect a wallet first.", () => undefined);
      return;
    }
    setError("");
    setBusy(true);
    try {
      await fn();
      setPanel("idle");
    } catch (e) {
      setError(txMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function withdraw() {
    const reason = withdrawReason();
    if (reason) {
      clickOrExplain(reason, () => undefined);
      return;
    }
    await run(async () => {
      const onChain = await publicClient!.readContract({
        address: ARCFLOW_STREAM_ADDRESS,
        abi: streamAbi,
        functionName: "withdrawable",
        args: [id],
      });
      if (onChain === 0n) throw new Error("Nothing withdrawable yet.");
      await publicClient!.simulateContract({
        account: address!,
        address: ARCFLOW_STREAM_ADDRESS,
        abi: streamAbi,
        functionName: "withdraw",
        args: [id],
      });
      const hash = await writeContractAsync({
        address: ARCFLOW_STREAM_ADDRESS,
        abi: streamAbi,
        functionName: "withdraw",
        args: [id],
        ...arcGas,
      });
      await confirmTx(publicClient!, hash);
      await afterTx(hash, { withdrawn: (s.withdrawn + onChain).toString() });
    });
  }

  async function cancel() {
    const reason = cancelReason();
    if (reason) {
      clickOrExplain(reason, () => undefined);
      return;
    }
    await run(async () => {
      await publicClient!.simulateContract({
        account: address!,
        address: ARCFLOW_STREAM_ADDRESS,
        abi: streamAbi,
        functionName: "cancel",
        args: [id],
      });
      const hash = await writeContractAsync({
        address: ARCFLOW_STREAM_ADDRESS,
        abi: streamAbi,
        functionName: "cancel",
        args: [id],
        ...arcGas,
      });
      await confirmTx(publicClient!, hash);
      await afterTx(hash, { canceled: true });
    });
  }

  async function topUp() {
    const reason = topUpReason();
    if (reason) {
      clickOrExplain(reason, () => undefined);
      return;
    }
    if (decimals === undefined) {
      clickOrExplain("Token decimals are still loading.", () => undefined);
      return;
    }
    let value: bigint;
    try {
      value = parseUnits(topUpAmt.trim(), decimals);
    } catch {
      clickOrExplain("Enter a valid top-up amount.", () => undefined);
      return;
    }
    if (value <= 0n) {
      clickOrExplain("Top-up must be greater than zero.", () => undefined);
      return;
    }
    if (value > MAX_U128 || s.amount + value > MAX_U128) {
      clickOrExplain("Amount exceeds the maximum for this stream.", () => undefined);
      return;
    }
    await run(async () => {
      if (!s.token) return;
      const current = allowance ?? 0n;
      if (current < value) {
        const a = await writeContractAsync({
          address: s.token,
          abi: erc20Abi,
          functionName: "approve",
          args: [ARCFLOW_STREAM_ADDRESS, value],
          ...arcGas,
        });
        await confirmTx(publicClient!, a, { fee: true });
        await refetchAllowance();
      }
      await publicClient!.simulateContract({
        account: address!,
        address: ARCFLOW_STREAM_ADDRESS,
        abi: streamAbi,
        functionName: "topUp",
        args: [id, value],
      });
      const hash = await writeContractAsync({
        address: ARCFLOW_STREAM_ADDRESS,
        abi: streamAbi,
        functionName: "topUp",
        args: [id, value],
        ...arcGas,
      });
      await confirmTx(publicClient!, hash);
      await afterTx(hash, { amount: (s.amount + value).toString() });
      setTopUpAmt("");
    });
  }

  async function transfer() {
    const reason = transferReason();
    if (reason) {
      clickOrExplain(reason, () => undefined);
      return;
    }
    const to = transferTo.trim() as `0x${string}`;
    if (!isAddress(to)) {
      clickOrExplain("Enter a valid recipient address.", () => undefined);
      return;
    }
    if (to.toLowerCase() === s.recipient.toLowerCase()) {
      clickOrExplain("New recipient must be a different wallet.", () => undefined);
      return;
    }
    await run(async () => {
      const leftover = await publicClient!.readContract({
        address: ARCFLOW_STREAM_ADDRESS,
        abi: streamAbi,
        functionName: "withdrawable",
        args: [id],
      });
      if (leftover > 0n) throw new Error("SettleFirst");
      await publicClient!.simulateContract({
        account: address!,
        address: ARCFLOW_STREAM_ADDRESS,
        abi: streamAbi,
        functionName: "transferRecipient",
        args: [id, to],
      });
      const hash = await writeContractAsync({
        address: ARCFLOW_STREAM_ADDRESS,
        abi: streamAbi,
        functionName: "transferRecipient",
        args: [id, to],
        ...arcGas,
      });
      await confirmTx(publicClient!, hash);
      await afterTx(hash, { recipient: to });
      setTransferTo("");
    });
  }

  const withdrawBlocked = withdrawReason();
  const statusLabel = s.canceled ? "Canceled" : isDone ? "Ended" : "Streaming";

  return (
    <div className="dash-well px-4 py-3">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <WavesIcon className="size-4" />
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate font-medium tabular-nums text-white">
              {fmtAmt(s.amount, dec)} {ticker}
            </span>
            <Badge
              className={cn(
                "font-normal",
                s.canceled ? "border-[var(--dash-border)] bg-sidebar text-white" : "border-white/25 bg-white/20 text-white",
              )}
            >
              {statusLabel}
            </Badge>
            {liveWithdrawable > 0n && isRecipient ? <Badge className="font-normal">Ready</Badge> : null}
          </div>
          <div className="h-1.5 max-w-xs overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-[width]"
              style={{ width: `${Math.min(timePct, 100)}%` }}
            />
          </div>
          <p className="truncate font-mono text-[11px] text-white/70">
            STREAM #{id.toString()} · {role === "receiving" ? `from ${shorten(s.sender)}` : `to ${shorten(s.recipient)}`}
            {` · ends ${dateFmt.format(new Date(Number(s.end) * 1000))}`}
            {liveWithdrawable > 0n ? ` · withdrawable ${fmtAmt(liveWithdrawable, dec)}` : ""}
            {s.withdrawn > 0n ? ` · withdrawn ${fmtAmt(s.withdrawn, dec)}` : ""}
          </p>
        </div>

        <RowActions
          busy={busy}
          primary={
            role === "receiving" ? (
              <Button
                type="button"
                size="sm"
                disabled={busy}
                onClick={() => clickOrExplain(withdrawBlocked, () => void withdraw())}
              >
                {busy && panel === "idle" ? <Loader2Icon className="size-3.5 animate-spin" /> : null}
                {busy && panel === "idle" ? "Withdrawing…" : "Withdraw"}
              </Button>
            ) : null
          }
          items={[
            {
              id: "proof",
              label: "Open proof",
              icon: <ArrowRightIcon />,
              onSelect: () => router.push(proofHref),
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
              id: "explorer",
              label: "View transaction",
              icon: <ExternalLinkIcon />,
              hidden: !explorerHash,
              onSelect: () => {
                if (explorerHash) {
                  window.open(explorerTxUrl(explorerHash), "_blank", "noopener,noreferrer");
                }
              },
            },
            {
              id: "topup",
              label: "Top up",
              separatorBefore: true,
              hidden: role !== "sent",
              onSelect: () => {
                const reason = topUpReason();
                clickOrExplain(reason, () => setPanel("topup"));
              },
            },
            {
              id: "transfer",
              label: "Transfer recipient",
              hidden: role !== "receiving",
              onSelect: () => {
                const reason = transferReason();
                clickOrExplain(reason, () => setPanel("transfer"));
              },
            },
            {
              id: "cancel",
              label: "Cancel stream",
              destructive: true,
              hidden: role !== "sent",
              onSelect: () => {
                const reason = cancelReason();
                clickOrExplain(reason, () => setPanel("cancel"));
              },
            },
          ]}
        />
      </div>

      {panel === "topup" ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Input
            className="w-36"
            inputMode="decimal"
            placeholder={`Amount (${ticker})`}
            value={topUpAmt}
            onChange={(e) => setTopUpAmt(e.target.value)}
            disabled={busy}
          />
          <Button type="button" size="sm" disabled={busy} onClick={() => void topUp()}>
            {busy ? <Loader2Icon className="size-3.5 animate-spin" /> : null}
            Confirm top-up
          </Button>
          <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => setPanel("idle")}>
            Close
          </Button>
        </div>
      ) : null}

      {panel === "transfer" ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Input
            className="w-64 font-mono"
            placeholder="0x… new recipient"
            value={transferTo}
            onChange={(e) => setTransferTo(e.target.value.trim())}
            disabled={busy}
          />
          <Button type="button" size="sm" disabled={busy} onClick={() => void transfer()}>
            {busy ? <Loader2Icon className="size-3.5 animate-spin" /> : null}
            Transfer
          </Button>
          <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => setPanel("idle")}>
            Close
          </Button>
        </div>
      ) : null}

      {panel === "cancel" ? (
        <div className="mt-3 space-y-2">
          <p className="text-xs text-white/70">
            Unvested tokens return to you. The recipient can still withdraw what already vested.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" size="sm" variant="destructive" disabled={busy} onClick={() => void cancel()}>
              {busy ? <Loader2Icon className="size-3.5 animate-spin" /> : null}
              Confirm cancel
            </Button>
            <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => setPanel("idle")}>
              Keep stream
            </Button>
          </div>
        </div>
      ) : null}

      {error ? <p className="mt-2 text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

function StreamList({
  owner,
  tab,
  count,
  txMap,
}: {
  owner: `0x${string}`;
  tab: Tab;
  count: number;
  txMap?: Map<string, string>;
}) {
  const n = Math.min(count, MAX_ROWS);
  const now = useNowSec();
  const idContracts = useMemo(
    () =>
      Array.from({ length: n }, (_, i) => ({
        address: ARCFLOW_STREAM_ADDRESS,
        abi: streamAbi,
        functionName:
          tab === "sent" ? ("streamsBySender" as const) : ("streamsByRecipient" as const),
        args: [owner, BigInt(i)] as const,
      })),
    [n, owner, tab],
  );

  const { data: idResults, isPending: idsPending } = useReadContracts({
    contracts: idContracts,
    query: { enabled: n > 0, ...READ_STALE },
  });

  const ids = useMemo(() => {
    const out: bigint[] = [];
    for (const row of idResults ?? []) {
      if (row.status === "success" && row.result !== undefined) out.push(row.result as bigint);
    }
    return out;
  }, [idResults]);

  const streamContracts = useMemo(
    () =>
      ids.map((id) => ({
        address: ARCFLOW_STREAM_ADDRESS,
        abi: streamAbi,
        functionName: "streams" as const,
        args: [id] as const,
      })),
    [ids],
  );

  const { data: streamResults, refetch: refetchStreams } = useReadContracts({
    contracts: streamContracts,
    query: { enabled: streamContracts.length > 0, staleTime: 8_000 },
  });

  if (n === 0) {
    return (
      <p className="text-sm text-white/70">
        {tab === "receiving"
          ? "No streams vesting to this wallet yet."
          : "You have not funded any streams from this wallet."}
      </p>
    );
  }

  if (idsPending || !idResults) {
    return <ListRowSkeleton count={Math.min(n, 4)} />;
  }

  return (
    <div className="grid gap-2">
      {ids.map((id, i) => {
        const streamRow = streamResults?.[i];
        return (
          <StreamRow
            key={id.toString()}
            id={id}
            role={tab}
            indexedHash={txMap?.get(id.toString())}
            s={streamRow?.status === "success" ? parseStream(streamRow.result) : undefined}
            now={now}
            onRefresh={refetchStreams}
          />
        );
      })}
    </div>
  );
}

export function MyStreamsPanel() {
  const { address, isConnected } = useAccount();
  const [tab, setTab] = useState<Tab>("receiving");
  const { data: txMap } = useTxHashMap("streams", address);

  const { data: sentCount, isPending: sentPending } = useReadContract({
    address: ARCFLOW_STREAM_ADDRESS,
    abi: streamAbi,
    functionName: "senderStreamCount",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address), ...READ_STALE },
  });
  const { data: recvCount, isPending: recvPending } = useReadContract({
    address: ARCFLOW_STREAM_ADDRESS,
    abi: streamAbi,
    functionName: "recipientStreamCount",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address), ...READ_STALE },
  });

  if (!isConnected || !address) {
    return (
      <Card className="max-w-md shadow-none ring-0">
        <CardHeader>
          <CardTitle>Wallet required</CardTitle>
          <CardDescription>Connect a wallet to see streams you send or receive.</CardDescription>
        </CardHeader>
        <CardContent>
          <WalletConnectButton />
        </CardContent>
      </Card>
    );
  }

  if (ARCFLOW_STREAM_ADDRESS === ZERO) {
    return <div className="alert alert-warn">Stream address not set.</div>;
  }

  const sent = Number(sentCount ?? 0n);
  const recv = Number(recvCount ?? 0n);

  return (
    <Card className="shadow-none ring-0">
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2">
          <WavesIcon className="size-4 text-primary" />
          Your streams
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        <div className="seg seg-2 max-w-md">
          <button
            type="button"
            className={cn("seg-btn", tab === "receiving" && "on")}
            onClick={() => setTab("receiving")}
          >
            Receiving ({recv})
          </button>
          <button
            type="button"
            className={cn("seg-btn", tab === "sent" && "on")}
            onClick={() => setTab("sent")}
          >
            Sent ({sent})
          </button>
        </div>
        {sentPending || recvPending ? (
          <ListRowSkeleton count={4} />
        ) : (
          <StreamList
            owner={address}
            tab={tab}
            count={tab === "sent" ? sent : recv}
            txMap={txMap}
          />
        )}
      </CardContent>
    </Card>
  );
}
