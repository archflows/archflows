"use client";

import Link from "next/link";
import { useLiveStats } from "@/hooks/useLiveStats";
import { formatAmount, formatUnlock, lockStatus } from "@/lib/live-format";
import { proofPath, shortHash } from "@/lib/proof";

export function LandingHeroMock() {
  const { data: stats, isLoading } = useLiveStats();
  const featured = stats?.featured;
  const kind = featured?.kind === "vest" ? "Linear vest" : "Hard lock";

  return (
    <div className="lp-mock">
      <div className="lp-mock-bar">
        <span className="lp-proof-dots">
          <i />
          <i />
          <i />
        </span>
        <span className="lp-mock-url">
          {featured
            ? `app.arcflow / lock/${featured.tx_hash ? shortHash(featured.tx_hash) : featured.id}`
            : "app.arcflow / create lock"}
        </span>
      </div>
      <div className="lp-mock-body">
        <div className="lp-mock-row">
          <span>Latest lock</span>
          <strong>{isLoading ? "…" : featured ? `#${featured.id}` : "None yet"}</strong>
        </div>
        <div className="lp-mock-field">
          <span>Amount</span>
          <b>{featured ? formatAmount(featured.amount) : "0"}</b>
        </div>
        <div className="lp-mock-modes">
          <span className={kind === "Hard lock" ? "is-on" : ""}>Hard lock</span>
          <span className={kind === "Linear vest" ? "is-on" : ""}>Linear vest</span>
        </div>
        <div className="lp-mock-field">
          <span>Unlock date</span>
          <b>{featured ? formatUnlock(featured.end_at) : "—"}</b>
        </div>
        <div className="lp-mock-row lp-mock-fee">
          <span>Status</span>
          <strong>{featured ? lockStatus(featured) : "Waiting for first lock"}</strong>
        </div>
        {featured ? (
          <Link className="lp-mock-cta" href={proofPath("lock", featured.tx_hash, featured.id)}>
            View live lock
          </Link>
        ) : (
          <Link className="lp-mock-cta" href="/auth">
            Lock tokens
          </Link>
        )}
      </div>
    </div>
  );
}
