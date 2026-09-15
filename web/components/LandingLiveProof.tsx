"use client";

import Link from "next/link";
import { useLiveStats } from "@/hooks/useLiveStats";
import { formatAmount, formatUnlock, lockStatus, shortenAddr } from "@/lib/live-format";
import { proofPath } from "@/lib/proof";

function elapsedPct(start?: string | number, end?: string | number) {
  const s = Number(start);
  const e = Number(end);
  const now = Math.floor(Date.now() / 1000);
  if (!Number.isFinite(s) || !Number.isFinite(e) || e <= s) return 0;
  if (now <= s) return 0;
  if (now >= e) return 100;
  return Math.min(100, Math.round(((now - s) / (e - s)) * 100));
}

export function LandingLiveProof() {
  const { data: stats } = useLiveStats();
  const featured = stats?.featured;
  const pct = featured ? elapsedPct(featured.start_at, featured.end_at) : 0;
  const status = featured ? lockStatus(featured) : "Empty";
  const remaining = featured
    ? formatAmount(
        (BigInt(featured.amount || "0") - BigInt(featured.claimed || "0")).toString(),
      )
    : "0";

  return (
    <div className="lp-proof-panel">
      <div className="lp-proof-chrome">
        <span className="lp-proof-dots" aria-hidden>
          <i />
          <i />
          <i />
        </span>
        <span className="mono dim">
          {featured ? `Lock #${featured.id}` : "Public proof"}
        </span>
      </div>
      <div className="lp-proof-body">
        <div className="lp-proof-title">
          <div>
            <p className="lp-eyebrow" style={{ marginBottom: 6 }}>
              Vault position
            </p>
            <h3>{featured ? `Lock #${featured.id}` : "No lock indexed yet"}</h3>
          </div>
          <span className="live live-accent">
            <span className="pulse-dot" />
            {status}
          </span>
        </div>
        <div className="lp-proof-stats">
          <div>
            <span>Locked amount</span>
            <strong>{featured ? formatAmount(featured.amount) : "0"}</strong>
          </div>
          <div>
            <span>Fully unlocks</span>
            <strong>{featured ? formatUnlock(featured.end_at) : "—"}</strong>
          </div>
          <div>
            <span>Release</span>
            <strong>{featured?.kind === "vest" ? "Linear vest" : "Hard lock"}</strong>
          </div>
          <div>
            <span>Remaining</span>
            <strong>{remaining}</strong>
          </div>
        </div>
        <div className="lp-proof-meter">
          <div className="lp-proof-meter-row">
            <span>Time elapsed</span>
            <span>{pct}%</span>
          </div>
          <div className="meter">
            <div className="meter-fill" style={{ width: `${pct}%` }} />
          </div>
        </div>
        {featured ? (
          <p className="mono dim" style={{ marginTop: 12, fontSize: "0.75rem" }}>
            Beneficiary {shortenAddr(featured.beneficiary)} ·{" "}
            <Link href={proofPath("lock", featured.tx_hash, featured.id)}>Open proof</Link>
          </p>
        ) : null}
      </div>
    </div>
  );
}
