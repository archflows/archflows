"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Copy } from "lucide-react";
import { TxExplorerLink } from "@/components/TxExplorerLink";
import { ProofPageSkeleton } from "@/components/page-skeleton";
import { copyToClipboard } from "@/lib/clipboard";

export function ProofFrame({
  tag,
  title,
  status,
  loading,
  missing,
  missingLabel,
  createHref,
  createLabel,
  txHash,
  children,
}: {
  tag: string;
  title: string;
  status: string;
  loading?: boolean;
  missing?: boolean;
  missingLabel: string;
  createHref: string;
  createLabel: string;
  txHash?: string | null;
  children: ReactNode;
}) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    await copyToClipboard(window.location.href, "Proof link copied");
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  if (loading) {
    return <ProofPageSkeleton />;
  }

  if (missing) {
    return (
      <main className="shell" style={{ maxWidth: "46rem", padding: "3rem 0" }}>
        <div className="panel">
          <div className="panel-head">
            <span>{missingLabel}</span>
            <span className="live">Empty</span>
          </div>
          <div className="panel-body" style={{ display: "grid", gap: "1rem", justifyItems: "start" }}>
            <p className="dim" style={{ margin: 0 }}>
              Nothing is indexed under this id or transaction hash. Check the URL, or create a new
              position.
            </p>
            <Link href={createHref} className="btn sm">
              {createLabel}
            </Link>
          </div>
        </div>
      </main>
    );
  }

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
          <p className="tag tag-accent">{tag}</p>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.6rem" }}>
            <h1
              style={{
                margin: 0,
                fontSize: "clamp(1.5rem, 3vw, 2rem)",
                letterSpacing: "-0.03em",
                fontWeight: 700,
              }}
            >
              {title}
            </h1>
            <span className="live live-accent">{status}</span>
          </div>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          <button type="button" className="btn ghost sm" onClick={() => void copyLink()}>
            <Copy className="size-3.5" />
            {copied ? "Copied" : "Copy proof link"}
          </button>
          <TxExplorerLink hash={txHash} />
        </div>
      </div>
      {children}
    </main>
  );
}

export function ProofKv({
  rows,
}: {
  rows: { key: string; value: ReactNode }[];
}) {
  return (
    <div className="panel" style={{ marginTop: "1rem" }}>
      <div className="panel-head">
        <span>On-chain details</span>
        <span className="mono dim" style={{ fontSize: "0.72rem" }}>
          // IMMUTABLE
        </span>
      </div>
      <div>
        {rows.map((row) => (
          <div className="kv" key={row.key}>
            <span className="kv-key">{row.key}</span>
            <span className="kv-val">{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
