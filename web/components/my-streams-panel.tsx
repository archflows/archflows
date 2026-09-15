"use client";

import { useState } from "react";
import { formatUnits, isAddress, parseUnits } from "viem";
import { useAccount, usePublicClient, useReadContract, useWriteContract } from "wagmi";
import { Loader2 } from "lucide-react";
import { erc20Abi, streamAbi } from "@/lib/abi";
import { ARCFLOW_STREAM_ADDRESS } from "@/lib/chain";
import { ZERO, dateFmt, shorten } from "@/lib/form-time";
import { arcGas, txMessage } from "@/lib/tx";
import { WalletConnectButton } from "@/components/WalletConnectButton";
import { cn } from "@/lib/utils";

const MAX_ROWS = 40;
type Tab = "receiving" | "sent";

function StreamRow({ id, role }: { id: bigint; role: Tab }) {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [topUpAmt, setTopUpAmt] = useState("");

  const { data: s, refetch } = useReadContract({
    address: ARCFLOW_STREAM_ADDRESS,
    abi: streamAbi,
    functionName: "streams",
    args: [id],
  });
  const { data: withdrawable, refetch: refetchW } = useReadContract({
    address: ARCFLOW_STREAM_ADDRESS,
    abi: streamAbi,
    functionName: "withdrawable",
    args: [id],
  });

  const token = s?.[0];
  const sender = s?.[1];
  const recipient = s?.[2];
  const amount = s?.[3];
  const withdrawn = s?.[4];
  const end = s?.[8];
  const cancelable = s?.[10];
  const canTopup = s?.[12];
  const canceled = s?.[13];
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
  const { data: allowance } = useReadContract({
    address: token,
    abi: erc20Abi,
    functionName: "allowance",
    args: address && token ? [address, ARCFLOW_STREAM_ADDRESS] : undefined,
    query: { enabled: Boolean(address && token && role === "sent" && canTopup) },
  });

  if (!s) {
    return (
      <div className="row-link" style={{ pointerEvents: "none" }}>
        <div className="skeleton" style={{ width: "12rem", height: "0.85rem" }} />
      </div>
    );
  }

  const dec = decimals ?? 18;
  const ticker = symbol ?? "Token";
  const isRecipient = address && recipient && address.toLowerCase() === recipient.toLowerCase();
  const isSender = address && sender && address.toLowerCase() === sender.toLowerCase();
  const canWithdraw = Boolean(isRecipient && withdrawable && withdrawable > 0n && !busy);
  const canCancel = Boolean(isSender && cancelable && !canceled && !busy);

  async function run(fn: () => Promise<void>) {
    setError("");
    setBusy(true);
    try {
      await fn();
      await refetch();
      await refetchW();
    } catch (e) {
      setError(txMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border-b border-border px-4 py-3 last:border-0">
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.55rem", alignItems: "center" }}>
        <span className="token-glyph">{ticker.slice(0, 3).toUpperCase()}</span>
        <span style={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
          {amount !== undefined
            ? Number(formatUnits(amount, dec)).toLocaleString("en-US", { maximumFractionDigits: 4 })
            : "—"}{" "}
          {ticker}
        </span>
        <span className={cn("live", canceled ? undefined : "live-accent")}>
          {canceled ? "Canceled" : "Streaming"}
        </span>
        <span className="mono dim" style={{ fontSize: "0.72rem" }}>
          #{id.toString()} · ends {end ? dateFmt.format(new Date(Number(end) * 1000)) : "—"}
        </span>
      </div>
      <p className="mono dim" style={{ margin: "0.35rem 0 0", fontSize: "0.72rem" }}>
        {role === "receiving" ? `from ${shorten(sender)}` : `to ${shorten(recipient)}`}
        {withdrawable !== undefined
          ? ` · withdrawable ${Number(formatUnits(withdrawable, dec)).toLocaleString("en-US", {
              maximumFractionDigits: 4,
            })}`
          : ""}
        {withdrawn !== undefined && withdrawn > 0n
          ? ` · withdrawn ${Number(formatUnits(withdrawn, dec)).toLocaleString("en-US", {
              maximumFractionDigits: 4,
            })}`
          : ""}
      </p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginTop: "0.65rem" }}>
        {canWithdraw ? (
          <button
            type="button"
            className="btn sm"
            disabled={busy}
            onClick={() =>
              run(async () => {
                if (!publicClient) return;
                const hash = await writeContractAsync({
                  address: ARCFLOW_STREAM_ADDRESS,
                  abi: streamAbi,
                  functionName: "withdraw",
                  args: [id],
                  ...arcGas,
                });
                await publicClient.waitForTransactionReceipt({ hash });
              })
            }
          >
            {busy ? <Loader2 className="size-3.5 animate-spin" /> : null}
            Withdraw
          </button>
        ) : null}
        {canCancel ? (
          <button
            type="button"
            className="btn sm"
            disabled={busy}
            onClick={() =>
              run(async () => {
                if (!publicClient) return;
                const hash = await writeContractAsync({
                  address: ARCFLOW_STREAM_ADDRESS,
                  abi: streamAbi,
                  functionName: "cancel",
                  args: [id],
                  ...arcGas,
                });
                await publicClient.waitForTransactionReceipt({ hash });
              })
            }
          >
            Cancel
          </button>
        ) : null}
        {isSender && canTopup && !canceled && token ? (
          <div style={{ display: "inline-flex", gap: "0.35rem", alignItems: "center" }}>
            <input
              className="af-input"
              style={{ width: "6.5rem", height: "2rem", fontSize: "0.8rem" }}
              placeholder="Top-up"
              inputMode="decimal"
              value={topUpAmt}
              onChange={(e) => setTopUpAmt(e.target.value)}
            />
            <button
              type="button"
              className="btn sm"
              disabled={busy || !topUpAmt}
              onClick={() =>
                run(async () => {
                  if (!publicClient || !token || decimals === undefined) return;
                  const value = parseUnits(topUpAmt, decimals);
                  if (value <= 0n) return;
                  if (allowance === undefined || allowance < value) {
                    const a = await writeContractAsync({
                      address: token,
                      abi: erc20Abi,
                      functionName: "approve",
                      args: [ARCFLOW_STREAM_ADDRESS, value],
                      ...arcGas,
                    });
                    await publicClient.waitForTransactionReceipt({ hash: a });
                  }
                  const hash = await writeContractAsync({
                    address: ARCFLOW_STREAM_ADDRESS,
                    abi: streamAbi,
                    functionName: "topUp",
                    args: [id, value],
                    ...arcGas,
                  });
                  await publicClient.waitForTransactionReceipt({ hash });
                  setTopUpAmt("");
                })
              }
            >
              Top up
            </button>
          </div>
        ) : null}
        {isRecipient && s[11] && !canceled ? (
          <TransferButton id={id} onDone={() => { void refetch(); }} />
        ) : null}
      </div>
      {error ? <p className="field-error" style={{ marginTop: "0.4rem" }}>{error}</p> : null}
    </div>
  );
}

function TransferButton({ id, onDone }: { id: bigint; onDone: () => void }) {
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const [to, setTo] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  return (
    <div style={{ display: "inline-flex", gap: "0.35rem", alignItems: "center" }}>
      <input
        className="af-input mono"
        style={{ width: "10rem", height: "2rem", fontSize: "0.75rem" }}
        placeholder="0x… new recipient"
        value={to}
        onChange={(e) => setTo(e.target.value.trim())}
      />
      <button
        type="button"
        className="btn sm"
        disabled={busy || !isAddress(to)}
        onClick={async () => {
          if (!publicClient || !isAddress(to)) return;
          setBusy(true);
          setError("");
          try {
            const hash = await writeContractAsync({
              address: ARCFLOW_STREAM_ADDRESS,
              abi: streamAbi,
              functionName: "transferRecipient",
              args: [id, to as `0x${string}`],
              ...arcGas,
            });
            await publicClient.waitForTransactionReceipt({ hash });
            setTo("");
            onDone();
          } catch (e) {
            setError(txMessage(e));
          } finally {
            setBusy(false);
          }
        }}
      >
        Transfer
      </button>
      {error ? <span className="field-error">{error}</span> : null}
    </div>
  );
}

function IndexedStream({
  owner,
  index,
  tab,
}: {
  owner: `0x${string}`;
  index: number;
  tab: Tab;
}) {
  const { data: id } = useReadContract({
    address: ARCFLOW_STREAM_ADDRESS,
    abi: streamAbi,
    functionName: tab === "sent" ? "streamsBySender" : "streamsByRecipient",
    args: [owner, BigInt(index)],
  });
  if (id === undefined) return null;
  return <StreamRow id={id} role={tab} />;
}

export function MyStreamsPanel() {
  const { address, isConnected } = useAccount();
  const [tab, setTab] = useState<Tab>("receiving");

  const { data: sentCount } = useReadContract({
    address: ARCFLOW_STREAM_ADDRESS,
    abi: streamAbi,
    functionName: "senderStreamCount",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) },
  });
  const { data: recvCount } = useReadContract({
    address: ARCFLOW_STREAM_ADDRESS,
    abi: streamAbi,
    functionName: "recipientStreamCount",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) },
  });

  if (!isConnected || !address) {
    return (
      <div className="panel" style={{ maxWidth: "26rem" }}>
        <div className="panel-body">
          <p className="dim" style={{ margin: "0 0 0.75rem" }}>
            Connect to see streams you send or receive.
          </p>
          <WalletConnectButton />
        </div>
      </div>
    );
  }

  if (ARCFLOW_STREAM_ADDRESS === ZERO) {
    return <div className="alert alert-warn">Stream address not set.</div>;
  }

  const sent = Number(sentCount ?? 0n);
  const recv = Number(recvCount ?? 0n);
  const count = tab === "sent" ? sent : recv;

  return (
    <div className="space-y-4">
      <div className="stat-grid stat-grid-2">
        <div className="stat">
          <span>Receiving</span>
          <strong>{recv}</strong>
        </div>
        <div className="stat">
          <span>Sent</span>
          <strong>{sent}</strong>
        </div>
      </div>
      <div className="seg seg-2" style={{ maxWidth: "22rem" }}>
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
      <div className="panel">
        {count === 0 ? (
          <div className="panel-body">
            <p className="dim" style={{ margin: 0 }}>
              {tab === "receiving"
                ? "No streams vesting to this wallet yet."
                : "You have not funded any streams from this wallet."}
            </p>
          </div>
        ) : (
          <div>
            {Array.from({ length: Math.min(count, MAX_ROWS) }, (_, i) => (
              <IndexedStream key={`${tab}-${i}`} owner={address} index={i} tab={tab} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
