"use client";

import Link from "next/link";
import { useState } from "react";
import { formatUnits } from "viem";
import { useAccount, useReadContract } from "wagmi";
import { ArrowRight, Satellite } from "lucide-react";
import { arcFlowAbi, erc20Abi } from "@/lib/abi";
import { ARCFLOW_ADDRESS } from "@/lib/chain";
import { WalletConnectButton } from "@/components/WalletConnectButton";
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

function LockRow({ id }: { id: bigint }) {
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
      <div className="row-link" style={{ pointerEvents: "none" }}>
        <div style={{ display: "grid", gap: "0.5rem" }}>
          <div className="skeleton" style={{ width: "10rem", height: "0.85rem" }} />
          <div className="skeleton" style={{ width: "16rem", height: "0.55rem" }} />
        </div>
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
    <Link href={`/lock/${id.toString()}`} className="row-link">
      <div style={{ minWidth: 0, display: "grid", gap: "0.55rem" }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.55rem" }}>
          <span className="token-glyph">{ticker.slice(0, 3).toUpperCase()}</span>
          <span style={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
            {amount !== undefined
              ? Number(formatUnits(amount, dec)).toLocaleString("en-US", {
                  maximumFractionDigits: 4,
                })
              : "—"}{" "}
            {ticker}
          </span>
          <span className={cn("live", isDone ? "live-accent" : undefined)}>
            {isDone ? "Unlocked" : isHardLock ? "Hard locked" : "Vesting"}
          </span>
        </div>

        <div className="meter" style={{ maxWidth: "18rem" }}>
          <div className="meter-fill" style={{ width: `${Math.min(timePct, 100)}%` }} />
        </div>

        <p className="mono dim" style={{ margin: 0, fontSize: "0.72rem" }}>
          LOCK #{id.toString()} · {isDone ? "unlocked" : "unlocks"}{" "}
          {end ? dateFmt.format(new Date(Number(end) * 1000)) : "—"}
          {claimed !== undefined && claimed > 0n
            ? ` · claimed ${Number(formatUnits(claimed, dec)).toLocaleString("en-US", {
                maximumFractionDigits: 4,
              })}`
            : ""}
        </p>
      </div>

      <span className="box-link" style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
        Proof
        <ArrowRight className="size-3.5" />
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
  return <LockRow id={id} />;
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
      <div className="stat-grid stat-grid-2">
        <div className="stat">
          <span>Locks launched</span>
          <strong>{created}</strong>
        </div>
        <div className="stat">
          <span>Vesting to you</span>
          <strong>{received}</strong>
        </div>
      </div>

      <div className="seg seg-2" style={{ maxWidth: "22rem" }}>
        <button
          type="button"
          className={cn("seg-btn", tab === "created" && "on")}
          onClick={() => setTab("created")}
        >
          Created ({created})
        </button>
        <button
          type="button"
          className={cn("seg-btn", tab === "receiving" && "on")}
          onClick={() => setTab("receiving")}
        >
          Receiving ({received})
        </button>
      </div>

      <div className="panel">
        {count === 0 ? (
          <div className="panel-body" style={{ display: "grid", gap: "0.85rem", justifyItems: "start" }}>
            <span className="box-icon">
              <Satellite className="size-4" />
            </span>
            <div>
              <h2 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 650 }}>
                {tab === "created" ? "Empty orbit" : "Nothing vesting to you"}
              </h2>
              <p className="dim" style={{ margin: "0.4rem 0 0", fontSize: "0.9rem" }}>
                {tab === "created"
                  ? "Lock tokens after your launch, then paste the proof link under the CA."
                  : "When someone locks tokens to your wallet, the position shows up here."}
              </p>
            </div>
            {tab === "created" ? (
              <Link href="/app" className="btn sm">
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
      </div>
    </div>
  );
}

export default function MyLocksPage() {
  const { address, isConnected } = useAccount();

  if (!isConnected || !address) {
    return (
      <div className="panel" style={{ maxWidth: "26rem" }}>
        <div className="panel-head">
          <span>Wallet required</span>
          <span className="live live-accent">Read-only</span>
        </div>
        <div className="panel-body" style={{ display: "grid", gap: "0.9rem" }}>
          <p className="dim" style={{ margin: 0, fontSize: "0.9rem" }}>
            ArcFlow reads positions straight from the contract — connect to see the ones tied to
            your address.
          </p>
          <WalletConnectButton />
        </div>
      </div>
    );
  }

  return <Locks owner={address} />;
}
