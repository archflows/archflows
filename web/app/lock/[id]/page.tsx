"use client";

import Link from "next/link";
import { use, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatUnits } from "viem";
import { useAccount, usePublicClient, useReadContract, useWriteContract } from "wagmi";
import { Clock, Copy, Loader2 } from "lucide-react";
import { arcFlowAbi, erc20Abi } from "@/lib/abi";
import { ARCFLOW_ADDRESS, EXPLORER_URL, MIN_MAX_FEE_PER_GAS } from "@/lib/chain";
import { confirmTx } from "@/lib/tx";
import { persistLockClaim } from "@/lib/backend";
import { TxExplorerLink } from "@/components/TxExplorerLink";
import { useProofRecord } from "@/hooks/useProofRecord";
import { isTxHash } from "@/lib/proof";
import { copyToClipboard } from "@/lib/clipboard";
import { clickOrExplain } from "@/lib/guard-click";
import { isHardLock as hardLockSchedule } from "@/lib/position-kind";
import { ProofPageSkeleton } from "@/components/page-skeleton";
import { lockShareText, proofAbsoluteUrl, twitterIntentUrl } from "@/lib/share";
import { formatCountdown } from "@/lib/form-time";

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

export default function LockPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: key } = use(params);
  const router = useRouter();
  const { data: proof, isLoading: proofLoading } = useProofRecord("lock", key);
  const recordId = isTxHash(key) ? proof?.id ?? null : (proof?.id ?? key);
  const lockId = recordId ? BigInt(recordId) : undefined;
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [lockTxHash, setLockTxHash] = useState<string | null>(isTxHash(key) ? key.toLowerCase() : null);
  const [unlockTxHash, setUnlockTxHash] = useState<string | null>(null);
  const [now, setNow] = useState(() => BigInt(Math.floor(Date.now() / 1000)));

  useEffect(() => {
    const t = setInterval(() => setNow(BigInt(Math.floor(Date.now() / 1000))), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (proof?.txHash) setLockTxHash(proof.txHash);
    if (proof?.unlockTxHash) setUnlockTxHash(proof.unlockTxHash);
  }, [proof]);

  useEffect(() => {
    if (isTxHash(key) || !isTxHash(proof?.txHash)) return;
    router.replace(`/lock/${proof.txHash}`);
  }, [key, proof?.txHash, router]);

  const readsEnabled = lockId !== undefined;

  const { data: position, refetch } = useReadContract({
    address: ARCFLOW_ADDRESS,
    abi: arcFlowAbi,
    functionName: "positions",
    args: lockId !== undefined ? [lockId] : undefined,
    query: { enabled: readsEnabled },
  });
  const { data: claimable, refetch: refetchClaimable } = useReadContract({
    address: ARCFLOW_ADDRESS,
    abi: arcFlowAbi,
    functionName: "claimable",
    args: lockId !== undefined ? [lockId] : undefined,
    query: { enabled: readsEnabled },
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
  const isHardLock = hardLockSchedule(cliff, end);
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
  const overwrittenUnlock =
    Boolean(lockTxHash) && !unlockTxHash && claimed !== undefined && claimed > 0n;
  const duplicateHash =
    Boolean(lockTxHash && unlockTxHash) &&
    lockTxHash!.toLowerCase() === unlockTxHash!.toLowerCase();
  const shownLockTx = overwrittenUnlock || duplicateHash ? null : lockTxHash;
  const shownUnlockTx = unlockTxHash ?? (overwrittenUnlock ? lockTxHash : null);

  async function claim() {
    setError("");
    if (!publicClient || lockId === undefined) return;
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
      await confirmTx(publicClient, hash);
      setUnlockTxHash(hash);
      if (token && beneficiary && creator && amount !== undefined) {
        await persistLockClaim({
          id: lockId.toString(),
          claimed: ((claimed ?? 0n) + (claimable ?? 0n)).toString(),
          unlockTxHash: hash,
          token,
          beneficiary,
          creator,
          amount: amount.toString(),
          start: Number(start ?? 0n),
          cliff: Number(cliff ?? 0n),
          end: Number(end ?? 0n),
          kind: isHardLock ? "lock" : "vest",
          txHash: lockTxHash ?? undefined,
        });
      }
      await Promise.all([refetch(), refetchClaimable()]);
    } catch (err) {
      setError(err instanceof Error ? err.message.split("\n")[0] : "Claim failed.");
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    await copyToClipboard(window.location.href, "Proof link copied");
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  if (isTxHash(key) && proofLoading) {
    return <ProofPageSkeleton />;
  }

  if (isTxHash(key) && !recordId) {
    return (
      <main className="shell" style={{ maxWidth: "46rem", padding: "3rem 0" }}>
        <div className="panel">
          <div className="panel-head">
            <span>Lock transaction not found</span>
            <span className="live">Empty</span>
          </div>
          <div className="panel-body" style={{ display: "grid", gap: "1rem", justifyItems: "start" }}>
            <p className="dim" style={{ margin: 0 }}>
              This hash is not a lock or vest on this contract. Check the URL, or launch a new
              position.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
              <Link href="/dashboard/locks" className="btn sm">
                Create a lock
              </Link>
              <Link href="/dashboard/vesting" className="btn ghost sm">
                Create a vest
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (position && !enabled) {
    return (
      <main className="shell" style={{ maxWidth: "46rem", padding: "3rem 0" }}>
        <div className="panel">
          <div className="panel-head">
            <span>Lock #{recordId ?? key} does not exist</span>
            <span className="live">Empty</span>
          </div>
          <div className="panel-body" style={{ display: "grid", gap: "1rem", justifyItems: "start" }}>
            <p className="dim" style={{ margin: 0 }}>
              Nothing is locked or vesting under this id on this contract. Check the URL, or launch
              a new position.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
              <Link href="/dashboard/locks" className="btn sm">
                Create a lock
              </Link>
              <Link href="/dashboard/vesting" className="btn ghost sm">
                Create a vest
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const status = isDone
    ? isHardLock
      ? "Fully unlocked"
      : "Fully vested"
    : isHardLock
      ? "Hard locked"
      : "Vesting";

  return (
    <main className="shell" style={{ maxWidth: "52rem", padding: "2.5rem 0 4rem" }}>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "start",
          justifyContent: "space-between",
          gap: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        <div>
          <p className="tag tag-accent">
            {isHardLock ? "// PROOF OF LOCK · ARC TESTNET" : "// PROOF OF VEST · ARC TESTNET"}
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.6rem" }}>
            <h1
              style={{
                margin: 0,
                fontSize: "clamp(1.5rem, 3vw, 2rem)",
                letterSpacing: "-0.03em",
                fontWeight: 700,
              }}
            >
              {symbol ? `${symbol} ` : ""}
              {isHardLock ? "Lock" : "Vest"} #{recordId ?? "…"}
            </h1>
            <span className={isDone ? "live live-accent" : "live"}>
              {!isDone ? <span className="pulse-dot" /> : null}
              {status}
            </span>
          </div>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          <button type="button" className="btn ghost sm" onClick={() => void copyLink()}>
            <Copy className="size-3.5" />
            {copied ? "Copied" : "Copy proof link"}
          </button>
          <a
            className="btn ghost sm"
            href={twitterIntentUrl(
              lockShareText({
                amount: amountText(amount, dec),
                symbol: symbol ?? "TOKEN",
                unlockAt: Number(end ?? 0n),
                proofUrl: proofAbsoluteUrl(
                  "lock",
                  shownLockTx ?? (isTxHash(key) ? key : null),
                  recordId ?? undefined,
                ),
              }),
            )}
            target="_blank"
            rel="noreferrer"
          >
            Share on X
          </a>
        </div>
      </div>

      <div className="panel">
        <div className="panel-body" style={{ display: "flex", flexWrap: "wrap", gap: "1.5rem" }}>
          <div className="dial">
            <div className="dial-ring" />
            <div style={{ textAlign: "center", position: "relative" }}>
              <div
                style={{
                  fontSize: "1.5rem",
                  fontWeight: 700,
                  fontVariantNumeric: "tabular-nums",
                  color: "var(--beam)",
                }}
              >
                {unlockedPct.toFixed(unlockedPct > 0 && unlockedPct < 1 ? 2 : 0)}%
              </div>
              <div
                className="mono dim"
                style={{ fontSize: "0.62rem", textTransform: "uppercase", letterSpacing: "0.08em" }}
              >
                {isHardLock ? "Unlocked" : "Vested"}
              </div>
            </div>
          </div>

          <div style={{ flex: "1 1 18rem", minWidth: 0, display: "grid", gap: "0.85rem" }}>
            <div>
              <div
                className="mono dim"
                style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.08em" }}
              >
                {isHardLock ? "Locked amount" : "Vesting amount"}
              </div>
              <div
                style={{
                  fontSize: "clamp(1.6rem, 4vw, 2.1rem)",
                  fontWeight: 700,
                  letterSpacing: "-0.03em",
                  fontVariantNumeric: "tabular-nums",
                  marginTop: "0.2rem",
                }}
              >
                {amountText(amount, dec)}{" "}
                <span className="dim" style={{ fontSize: "1rem", fontWeight: 500 }}>
                  {symbol ?? ""}
                </span>
              </div>
            </div>

            <div className="meter">
              <div className="meter-fill" style={{ width: `${Math.min(timePct, 100)}%` }} />
            </div>

            <div
              className="mono dim"
              style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem" }}
            >
              <span>{start ? dateFmt.format(new Date(Number(start) * 1000)) : "—"}</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                <Clock className="size-3.5" />
                {end !== undefined ? formatCountdown(Number(end - now), "Unlocked") : "—"}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="stat-grid stat-grid-2" style={{ marginTop: "1rem" }}>
        {[
          ["Claimed", amountText(claimed, dec), symbol ?? ""],
          ["Claimable now", amountText(claimable, dec), symbol ?? ""],
          [
            isHardLock ? "Still locked" : "Still vesting",
            amount !== undefined ? amountText(amount - released, dec) : "—",
            symbol ?? "",
          ],
          [
            isHardLock ? "Fully unlocks" : "Fully vested",
            end ? dateFmt.format(new Date(Number(end) * 1000)) : "—",
            end
              ? formatCountdown(Number(end - now), isHardLock ? "Unlocked" : "Vested")
              : "UTC",
          ],
        ].map(([label, value, unit], i) => (
          <div
            className="stat"
            key={label}
            style={i > 1 ? { borderTop: "1px solid var(--line)" } : undefined}
          >
            <span>{label}</span>
            <strong>{value}</strong>
            <span style={{ marginTop: "0.25rem", marginBottom: 0 }}>{unit}</span>
          </div>
        ))}
      </div>

      <div className="panel" style={{ marginTop: "1rem" }}>
        <div className="panel-head">
          <span>On-chain details</span>
          <span className="mono dim" style={{ fontSize: "0.72rem" }}>
            // IMMUTABLE
          </span>
        </div>
        <div>
          <div className="kv">
            <span className="kv-key">Token</span>
            <span className="kv-val">
              {token && token !== ZERO ? (
                <a
                  className="mono"
                  style={{ fontSize: "0.78rem", color: "var(--beam)" }}
                  href={`${EXPLORER_URL}/address/${token}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {symbol ? `${symbol} · ` : ""}
                  {short(token)}
                </a>
              ) : (
                "—"
              )}
            </span>
          </div>
          <div className="kv">
            <span className="kv-key">Beneficiary</span>
            <span className="kv-val mono" style={{ fontSize: "0.78rem" }}>
              {short(beneficiary)}
            </span>
          </div>
          <div className="kv">
            <span className="kv-key">Locked by</span>
            <span className="kv-val mono" style={{ fontSize: "0.78rem" }}>
              {short(creator)}
            </span>
          </div>
          <div className="kv">
            <span className="kv-key">Release</span>
            <span className="kv-val">{isHardLock ? "Hard lock" : "Linear vest"}</span>
          </div>
          <div className="kv">
            <span className="kv-key">Lock tx</span>
            <span className="kv-val">
              <TxExplorerLink hash={shownLockTx}>Lock</TxExplorerLink>
              {!shownLockTx ? "—" : null}
            </span>
          </div>
          <div className="kv">
            <span className="kv-key">Unlock tx</span>
            <span className="kv-val">
              <TxExplorerLink hash={shownUnlockTx}>Unlock</TxExplorerLink>
              {!shownUnlockTx ? "—" : null}
            </span>
          </div>
          <div className="kv">
            <span className="kv-key">{isHardLock ? "Unlocks at" : "Fully vested"}</span>
            <span className="kv-val">
              {end ? `${dateFmt.format(new Date(Number(end) * 1000))} UTC` : "—"}
            </span>
          </div>
          <div className="kv">
            <span className="kv-key">Time left</span>
            <span className="kv-val" style={{ fontVariantNumeric: "tabular-nums" }}>
              {end !== undefined
                ? formatCountdown(Number(end - now), isHardLock ? "Unlocked" : "Vested")
                : "—"}
            </span>
          </div>
          <div className="kv">
            <span className="kv-key">Cliff</span>
            <span className="kv-val">
              {cliff ? dateFmt.format(new Date(Number(cliff) * 1000)) : "—"}
            </span>
          </div>
        </div>
      </div>

      {error ? (
        <div className="alert alert-error" style={{ marginTop: "1rem" }}>
          {error}
        </div>
      ) : null}

      {isBeneficiary ? (
        <div className="cta-box" style={{ marginTop: "1.25rem", padding: "1.25rem" }}>
          <div className="cta-orb" />
          <div>
            <p className="tag tag-accent" style={{ marginBottom: "0.3rem" }}>
              // YOUR POSITION
            </p>
            <p className="dim" style={{ margin: 0, fontSize: "0.9rem" }}>
              {claimable && claimable > 0n
                ? isHardLock
                  ? `${amountText(claimable, dec)} ${symbol ?? "tokens"} have unlocked and are ready to claim.`
                  : `${amountText(claimable, dec)} ${symbol ?? "tokens"} have vested and are ready to claim.`
                : isHardLock
                  ? `Nothing unlocked yet. ${end !== undefined && now < end ? `${formatCountdown(Number(end - now))} remaining.` : "Come back after the unlock date."}`
                  : "Nothing vested yet. Come back after the cliff."}
            </p>
          </div>
          <button
            type="button"
            className="btn"
            disabled={busy}
            onClick={() =>
              clickOrExplain(
                !claimable || claimable === 0n
                  ? isHardLock
                    ? "Nothing unlocked yet."
                    : "Nothing vested yet."
                  : null,
                () => void claim(),
              )
            }
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : null}
            {busy ? "Claiming…" : isHardLock ? "Claim unlocked" : "Claim vested"}
          </button>
        </div>
      ) : (
        <p
          className="mono dim"
          style={{ textAlign: "center", marginTop: "1.5rem", fontSize: "0.76rem" }}
        >
          // only the beneficiary can claim after unlock — the creator cannot pull early
        </p>
      )}
    </main>
  );
}
