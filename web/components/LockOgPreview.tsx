"use client";

import Image from "next/image";
import { Lock, LockOpen } from "lucide-react";
import { formatCompactNumber } from "@/lib/format-amount";
import { CONTRACT_LABEL } from "@/lib/brand";
import { isLockOpen, type LockProofStatus } from "@/lib/lock-status";

type Props = {
  amount?: string;
  symbol?: string;
  duration?: string;
  /** Token contract address (shown as Ca next to duration). */
  tokenAddress?: string;
  unlockLabel?: string;
  /** Share of token total supply being locked, e.g. "1.25%". */
  supplyShare?: string;
  status?: LockProofStatus;
  lockId?: string;
};

function formatAmount(raw?: string) {
  const text = raw?.trim();
  if (!text) return "—";
  // Already compacted from upstream (e.g. "500K")
  if (/[KMBT]$/i.test(text)) return text;
  const n = Number(text.replace(/,/g, ""));
  if (!Number.isFinite(n)) return text;
  return formatCompactNumber(n);
}

function formatSupply(raw?: string) {
  if (!raw?.trim()) return "—";
  return raw.trim();
}

function shortCa(value?: string) {
  if (!value) return "";
  if (value.length < 12) return value;
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

/** Live Twitter/X-style OG card preview for lock proof shares. */
export function LockOgPreview({
  amount,
  symbol,
  duration,
  tokenAddress,
  unlockLabel,
  supplyShare,
  status = "Locked",
  lockId,
}: Props) {
  const amountText = formatAmount(amount);
  const ticker = symbol?.trim() || "TOKEN";
  const durationText = duration && duration !== "—" ? duration : "Set duration";
  const ca = shortCa(tokenAddress);
  const supplyText = formatSupply(supplyShare);
  const open = isLockOpen(status);
  const statusClass =
    status === "Claimed" ? " is-claimed" : status === "Unlocked" ? " is-unlocked" : "";

  return (
    <div className="lock-og-wrap">
      <div className="lock-og" role="img" aria-label="Lock proof share card preview">
        <header className="lock-og-top">
          <span className="lock-og-brand" aria-label="ArcFlows">
            <Image
              src="/logoarcflows-v2.png"
              alt=""
              width={140}
              height={32}
              className="lock-og-logo"
              unoptimized
              aria-hidden
            />
          </span>
          <span className={`lock-og-badge${statusClass}`}>{status}</span>
        </header>

        <div className="lock-og-hero">
          <p className="lock-og-kicker">Just Locked Tokens</p>
          <div className="lock-og-hero-main">
            <div className={`lock-og-icon${open ? " is-open" : ""}`} aria-hidden>
              {open ? <LockOpen strokeWidth={2.1} /> : <Lock strokeWidth={2.1} />}
            </div>
            <span className="lock-og-qty">{amountText}</span>
          </div>
          <span className="lock-og-ticker">{ticker}</span>
          <p className="lock-og-duration">
            {durationText}
            {ca ? (
              <>
                <span className="lock-og-dur-sep" aria-hidden>
                  |
                </span>
                <span className="lock-og-ca">Ca {ca}</span>
              </>
            ) : null}
          </p>
        </div>

        <div className="lock-og-bottom">
          <div className="lock-og-meta">
            <div className="lock-og-meta-item">
              <span>Unlocks</span>
              <strong>{unlockLabel || "—"}</strong>
            </div>
            <div className="lock-og-meta-item">
              <span>Of total supply</span>
              <strong>{supplyText}</strong>
            </div>
          </div>
          <div className="lock-og-foot">
            <span>{CONTRACT_LABEL.locker}</span>
            <span>Public proof</span>
          </div>
        </div>
      </div>
    </div>
  );
}
