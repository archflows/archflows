"use client";

import Image from "next/image";

type Props = {
  amount?: string;
  symbol?: string;
  duration?: string;
  unlockLabel?: string;
  /** Share of token total supply being locked, e.g. "1.25% of supply". */
  supplyShare?: string;
  lockType?: string;
};

function formatAmount(raw?: string) {
  const text = raw?.trim();
  if (!text) return "—";
  const n = Number(text.replace(/,/g, ""));
  if (!Number.isFinite(n)) return text;
  return n.toLocaleString("en-US", { maximumFractionDigits: 4 });
}

function formatSupply(raw?: string) {
  if (!raw?.trim()) return "—";
  return raw.trim();
}

/** Live Twitter/X-style OG card preview for lock proof shares. */
export function LockOgPreview({
  amount,
  symbol,
  duration,
  unlockLabel,
  supplyShare,
  lockType = "Hard lock",
}: Props) {
  const amountText = formatAmount(amount);
  const ticker = symbol?.trim() || "TOKEN";
  const durationText = duration && duration !== "—" ? duration : "Set duration";
  const supplyText = formatSupply(supplyShare);

  return (
    <div className="lock-og-wrap">
      <div className="lock-og-label">Share preview</div>

      <div className="lock-og" role="img" aria-label="Lock proof share card preview">
        <div className="lock-og-glow" aria-hidden />
        <div className="lock-og-grid" aria-hidden />

        <header className="lock-og-top">
          <Image
              src="/logo-arc-png.png"
            alt=""
            width={146}
            height={34}
            className="lock-og-logo"
          />
          <span className="lock-og-badge">{lockType}</span>
        </header>

        <div className="lock-og-hero">
          <p className="lock-og-kicker">On-chain proof</p>
          <p className="lock-og-amount">
            <span className="lock-og-qty">{amountText}</span>
            <span className="lock-og-ticker">{ticker}</span>
          </p>
          <p className="lock-og-duration">{durationText}</p>
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
            <span>arcflow, Arc Testnet</span>
            <span>/lock/{"{id}"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
