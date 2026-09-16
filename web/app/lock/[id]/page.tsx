"use client";

import Link from "next/link";
import { use, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatUnits } from "viem";
import { useAccount, usePublicClient, useReadContract, useWriteContract } from "wagmi";
import { ArrowLeft, ArrowUpRight, Copy, Loader2 } from "lucide-react";
import { LockOgPreview } from "@/components/LockOgPreview";
import { LockTokenomicsPie } from "@/components/LockTokenomicsPie";
import { LockProofSkeleton } from "@/components/skeletons";
import { TxExplorerLink } from "@/components/TxExplorerLink";
import { arcFlowAbi, erc20Abi } from "@/lib/abi";
import { ARCFLOW_ADDRESS, EXPLORER_URL, MIN_MAX_FEE_PER_GAS } from "@/lib/chain";
import { confirmTx } from "@/lib/tx";
import { persistLockClaim } from "@/lib/backend";
import { useProofRecord } from "@/hooks/useProofRecord";
import { isTxHash, proofPath } from "@/lib/proof";
import { copyToClipboard } from "@/lib/clipboard";
import { clickOrExplain } from "@/lib/guard-click";
import { isHardLock as hardLockSchedule } from "@/lib/position-kind";
import { formatCountdown, formatDuration } from "@/lib/form-time";
import { lockProofStatus } from "@/lib/lock-status";
import { lockShareText, proofAbsoluteUrl, twitterIntentUrl } from "@/lib/share";

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
  const readsEnabled = lockId !== undefined;
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
    router.replace(proofPath("lock", proof.txHash));
  }, [key, proof?.txHash, router]);

  const { data: position, isPending: positionPending, refetch } = useReadContract({
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
  const { data: totalSupply } = useReadContract({
    address: token,
    abi: erc20Abi,
    functionName: "totalSupply",
    query: { enabled },
  });
  const { data: tokenLocked } = useReadContract({
    address: ARCFLOW_ADDRESS,
    abi: arcFlowAbi,
    functionName: "totalLocked",
    args: token ? [token] : undefined,
    query: { enabled },
  });
  const { data: burnedBalance } = useReadContract({
    address: token,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: ["0x000000000000000000000000000000000000dEaD"],
    query: { enabled },
  });

  const dec = decimals ?? 18;
  const released = (claimed ?? 0n) + (claimable ?? 0n);
  const isHardLock = hardLockSchedule(cliff, end);
  const isDone = end !== undefined && now >= end;
  const timeLeft = end !== undefined
    ? formatCountdown(Number(end - now), isHardLock ? "Unlocked" : "Vested")
    : "—";

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

  const supplyShare = useMemo(() => {
    if (!amount || totalSupply === undefined || totalSupply === 0n) return undefined;
    const scaled = (amount * 10000n) / totalSupply;
    if (scaled === 0n && amount > 0n) return "<0.01%";
    const pct = Number(scaled) / 100;
    return `${pct.toLocaleString("en-US", {
      maximumFractionDigits: 2,
      minimumFractionDigits: 0,
    })}%`;
  }, [amount, totalSupply]);

  const circulating = useMemo(() => {
    if (totalSupply === undefined) return undefined;
    const burned = burnedBalance ?? 0n;
    const locked = tokenLocked ?? 0n;
    const left = totalSupply - burned - locked;
    return left < 0n ? 0n : left;
  }, [totalSupply, burnedBalance, tokenLocked]);

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
    return <LockProofSkeleton />;
  }

  if (isTxHash(key) && !recordId) {
    return (
      <main className="proof">
        <section className="shell proof-empty">
          <p className="proof-kicker">Lock transaction</p>
          <h1>Nothing here</h1>
          <p>This hash is not a lock or vest on this contract. Check the URL or create a new lock.</p>
          <div className="proof-empty-actions">
            <Link className="btn" href="/dashboard/locks">
              Create a lock
            </Link>
            <Link className="btn ghost" href="/explorer">
              Open explorer
            </Link>
          </div>
        </section>
      </main>
    );
  }

  if (positionPending) {
    return <LockProofSkeleton />;
  }

  if (position && !enabled) {
    return (
      <main className="proof">
        <section className="shell proof-empty">
          <p className="proof-kicker">Lock #{recordId ?? key}</p>
          <h1>Nothing here</h1>
          <p>This id has no position on the vault. Check the URL or create a new lock.</p>
          <div className="proof-empty-actions">
            <Link className="btn" href="/dashboard/locks">
              Create a lock
            </Link>
            <Link className="btn ghost" href="/explorer">
              Open explorer
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const status = isDone ? "Fully unlocked" : isHardLock ? "Hard locked" : "Vesting";
  const stillLocked = amount !== undefined ? amountText(amount - released, dec) : "—";
  const durationLabel =
    start !== undefined && end !== undefined ? formatDuration(Number(end - start)) : undefined;
  const displayId = recordId ?? key;

  return (
    <main className="proof">
      <section className="proof-stage">
        <div className="proof-stage-glow" aria-hidden />
        <div className="proof-stage-arc" aria-hidden />

        <div className="shell">
          <div className="proof-nav">
            <Link href="/explorer" className="proof-back">
              <ArrowLeft className="size-4" />
              Explorer
            </Link>
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

          <div className="proof-hero">
            <div className="proof-hero-copy">
              <p className="proof-kicker">
                <span className="pulse-dot" />
                Public proof · Arc Testnet
              </p>

              <div className="proof-title-row">
                <h1>
                  {amountText(amount, dec)} <em>{symbol ?? "TOKEN"}</em>
                </h1>
                <span className={`proof-status${isDone ? " is-done" : ""}`}>
                  {!isDone ? <span className="pulse-dot" /> : null}
                  {status}
                </span>
              </div>

              <p className="proof-sub">
                Lock #{displayId} · {isHardLock ? "Hard lock" : "Linear vest"}
                {end !== undefined ? ` · ${timeLeft}` : ""}
              </p>

              <div className="proof-progress">
                <div className="proof-progress-meta">
                  <span>
                    {unlockedPct.toFixed(unlockedPct > 0 && unlockedPct < 1 ? 2 : 0)}% released
                  </span>
                  <span>
                    {start ? dateFmt.format(new Date(Number(start) * 1000)) : "—"}
                    {" → "}
                    {end ? dateFmt.format(new Date(Number(end) * 1000)) : "—"}
                  </span>
                </div>
                <div className="proof-progress-track" aria-hidden>
                  <div
                    className="proof-progress-fill"
                    style={{ width: `${Math.min(Math.max(timePct, 0), 100)}%` }}
                  />
                </div>
              </div>

              <button type="button" className="proof-copy" onClick={() => void copyLink()}>
                <Copy className="size-3.5" />
                {copied ? "Copied" : "Copy proof link"}
              </button>
            </div>

            <div className="proof-hero-card">
              <LockOgPreview
                amount={amountText(amount, dec)}
                symbol={symbol}
                duration={durationLabel}
                unlockLabel={
                  end ? `${dateFmt.format(new Date(Number(end) * 1000))} UTC` : undefined
                }
                supplyShare={supplyShare}
                status={
                  amount !== undefined && claimed !== undefined && end !== undefined
                    ? lockProofStatus({ amount, claimed, end, nowSec: Number(now) })
                    : "Locked"
                }
                lockId={displayId}
                tokenAddress={token}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="proof-ribbon" aria-label="Position metrics">
        <div className="shell proof-ribbon-inner">
          <div>
            <span>Claimed</span>
            <strong>
              {amountText(claimed, dec)}
              <small>{symbol ?? ""}</small>
            </strong>
          </div>
          <div>
            <span>Claimable now</span>
            <strong>
              {amountText(claimable, dec)}
              <small>{symbol ?? ""}</small>
            </strong>
          </div>
          <div>
            <span>Still locked</span>
            <strong>
              {stillLocked}
              <small>{symbol ?? ""}</small>
            </strong>
          </div>
          <div>
            <span>Time left</span>
            <strong style={{ fontVariantNumeric: "tabular-nums" }}>{timeLeft}</strong>
          </div>
        </div>
      </section>

      <section className="shell proof-body">
        <div className="proof-split">
          <div className="proof-facts">
            <header className="proof-col-head">
              <h2>On-chain facts</h2>
              <span>Immutable schedule</span>
            </header>

            <dl className="proof-dl">
              <div>
                <dt>Token</dt>
                <dd>
                  {token && token !== ZERO ? (
                    <a href={`${EXPLORER_URL}/address/${token}`} target="_blank" rel="noreferrer">
                      {symbol ? `${symbol} · ` : ""}
                      {short(token)}
                      <ArrowUpRight className="size-3.5" />
                    </a>
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
              <div>
                <dt>Beneficiary</dt>
                <dd className="mono">{short(beneficiary)}</dd>
              </div>
              <div>
                <dt>Locked by</dt>
                <dd className="mono">{short(creator)}</dd>
              </div>
              <div>
                <dt>Release type</dt>
                <dd>{isHardLock ? "Hard lock" : "Linear vest"}</dd>
              </div>
              <div>
                <dt>Unlocks at</dt>
                <dd>{end ? `${dateFmt.format(new Date(Number(end) * 1000))} UTC` : "—"}</dd>
              </div>
              <div>
                <dt>Time left</dt>
                <dd style={{ fontVariantNumeric: "tabular-nums" }}>{timeLeft}</dd>
              </div>
              <div>
                <dt>Cliff</dt>
                <dd>{cliff ? dateFmt.format(new Date(Number(cliff) * 1000)) : "—"}</dd>
              </div>
              {supplyShare ? (
                <div>
                  <dt>Of total supply</dt>
                  <dd>{supplyShare}</dd>
                </div>
              ) : null}
              <div>
                <dt>Lock tx</dt>
                <dd>
                  <TxExplorerLink hash={shownLockTx} variant="text">
                    Lock
                  </TxExplorerLink>
                  {!shownLockTx ? "—" : null}
                </dd>
              </div>
              <div>
                <dt>Unlock tx</dt>
                <dd>
                  <TxExplorerLink hash={shownUnlockTx} variant="text">
                    Unlock
                  </TxExplorerLink>
                  {!shownUnlockTx ? "—" : null}
                </dd>
              </div>
              <div>
                <dt>Vault</dt>
                <dd>
                  <a
                    href={`${EXPLORER_URL}/address/${ARCFLOW_ADDRESS}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {short(ARCFLOW_ADDRESS)}
                    <ArrowUpRight className="size-3.5" />
                  </a>
                </dd>
              </div>
            </dl>
          </div>

          <div className="proof-tokenomics">
            <header className="proof-col-head">
              <h2>Tokenomics</h2>
              <span>{symbol ?? "Token"} supply</span>
            </header>

            <LockTokenomicsPie
              circulating={circulating}
              locked={tokenLocked}
              burned={burnedBalance}
              totalSupply={totalSupply}
              symbol={symbol}
              decimals={dec}
            />
          </div>
        </div>

        {error ? <div className="alert alert-error proof-alert">{error}</div> : null}

        {isBeneficiary ? (
          <div className="proof-claim">
            <div>
              <h3>Your claim</h3>
              <p>
                {claimable && claimable > 0n
                  ? `${amountText(claimable, dec)} ${symbol ?? "tokens"} ready to pull to this wallet.`
                  : isHardLock
                    ? `Nothing unlocked yet. ${end !== undefined && now < end ? `${timeLeft} remaining.` : "Come back after the unlock date."}`
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
          <p className="proof-note">
            Only the beneficiary can claim after unlock. The creator cannot pull early.
          </p>
        )}
      </section>
    </main>
  );
}
