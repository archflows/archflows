"use client";

import Link from "next/link";
import { use, useEffect, useMemo, useState } from "react";
import { formatUnits } from "viem";
import { useAccount, usePublicClient, useReadContract, useWriteContract } from "wagmi";
import { ArrowLeft, ArrowUpRight, Copy, Loader2 } from "lucide-react";
import { LockOgPreview } from "@/components/LockOgPreview";
import { LockTokenomicsPie } from "@/components/LockTokenomicsPie";
import { LockProofSkeleton } from "@/components/skeletons";
import { arcFlowAbi, erc20Abi } from "@/lib/abi";
import { ARCFLOW_ADDRESS, EXPLORER_URL, MIN_MAX_FEE_PER_GAS } from "@/lib/chain";
import { formatDuration } from "@/lib/form-time";
import { lockProofStatus } from "@/lib/lock-status";

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
  if (seconds <= 0n) return "Unlocked";
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

  const { data: position, isPending: positionPending, refetch } = useReadContract({
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

  if (positionPending) {
    return <LockProofSkeleton />;
  }

  if (position && !enabled) {
    return (
      <main className="proof">
        <section className="shell proof-empty">
          <p className="proof-kicker">Lock #{id}</p>
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
  const stillLocked =
    amount !== undefined ? amountText(amount - released, dec) : "—";
  const durationLabel =
    start !== undefined && end !== undefined
      ? formatDuration(Number(end - start))
      : undefined;

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
                Lock #{id} · {isHardLock ? "Hard lock" : "Linear vest"}
                {end !== undefined ? ` · ${countdown(end - now)}` : ""}
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

              <button type="button" className="proof-copy" onClick={copyLink}>
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
                lockId={id}
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
            <span>Duration</span>
            <strong>{durationLabel ?? "—"}</strong>
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
                    <a
                      href={`${EXPLORER_URL}/address/${token}`}
                      target="_blank"
                      rel="noreferrer"
                    >
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
                <dt>Cliff</dt>
                <dd>{cliff ? dateFmt.format(new Date(Number(cliff) * 1000)) : "—"}</dd>
              </div>
              <div>
                <dt>Fully unlocks</dt>
                <dd>{end ? `${dateFmt.format(new Date(Number(end) * 1000))} UTC` : "—"}</dd>
              </div>
              {supplyShare ? (
                <div>
                  <dt>Of total supply</dt>
                  <dd>{supplyShare}</dd>
                </div>
              ) : null}
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
                  : "Nothing unlocked yet. Come back after the cliff."}
              </p>
            </div>
            <button
              type="button"
              className="btn"
              disabled={busy || !claimable || claimable === 0n}
              onClick={claim}
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              {busy ? "Claiming…" : "Claim unlocked"}
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
