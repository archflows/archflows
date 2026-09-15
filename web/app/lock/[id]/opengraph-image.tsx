import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getLockOgData, type LockOgData } from "@/lib/lock-og";
import { isLockOpen, type LockProofStatus } from "@/lib/lock-status";

export const runtime = "nodejs";
export const alt = "ArcFlow lock proof";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 300;

async function fileDataUri(rel: string, mime: string) {
  const buf = await readFile(join(process.cwd(), rel));
  return `data:${mime};base64,${buf.toString("base64")}`;
}

async function loadFonts() {
  const urls = [
    {
      name: "Sora",
      weight: 700 as const,
      url: "https://cdn.jsdelivr.net/fontsource/fonts/sora@5.2.5/latin-700-normal.ttf",
    },
    {
      name: "Sora",
      weight: 600 as const,
      url: "https://cdn.jsdelivr.net/fontsource/fonts/sora@5.2.5/latin-600-normal.ttf",
    },
    {
      name: "IBM Plex Mono",
      weight: 400 as const,
      url: "https://cdn.jsdelivr.net/fontsource/fonts/ibm-plex-mono@5.2.5/latin-400-normal.ttf",
    },
  ];

  const fonts = [];
  for (const font of urls) {
    try {
      const res = await fetch(font.url, { cache: "force-cache" });
      if (!res.ok) continue;
      fonts.push({
        name: font.name,
        data: await res.arrayBuffer(),
        weight: font.weight,
        style: "normal" as const,
      });
    } catch {
      // fall back to ImageResponse default
    }
  }
  return fonts;
}

function statusBadgeStyle(status: LockProofStatus) {
  if (status === "Claimed") {
    return {
      color: "#bbf7d0",
      border: "1px solid rgba(34,197,94,0.4)",
      background: "rgba(34,197,94,0.14)",
    };
  }
  if (status === "Unlocked") {
    return {
      color: "#a5f3fc",
      border: "1px solid rgba(6,182,212,0.4)",
      background: "rgba(6,182,212,0.14)",
    };
  }
  return {
    color: "#bfdbfe",
    border: "1px solid rgba(0,80,224,0.45)",
    background: "rgba(0,80,224,0.14)",
  };
}

function LockGlyph({ open }: { open: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 56,
        height: 56,
        flexShrink: 0,
        marginRight: 18,
      }}
    >
      <svg
        width="52"
        height="52"
        viewBox="0 0 24 24"
        fill="none"
        stroke={open ? "#67e8f9" : "#93c5fd"}
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        {open ? (
          <path d="M7 11V7a5 5 0 0 1 9.9-1" />
        ) : (
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        )}
      </svg>
    </div>
  );
}

function LockOgCard({
  data,
  backgroundSrc,
  logoSrc,
}: {
  data: LockOgData;
  backgroundSrc: string;
  logoSrc: string;
}) {
  return (
    <div
      style={{
        width: 1200,
        height: 630,
        display: "flex",
        position: "relative",
        backgroundColor: "#08090c",
        color: "#ffffff",
        fontFamily: "Sora",
      }}
    >
      <img
        src={backgroundSrc}
        width={1200}
        height={630}
        alt=""
        style={{ position: "absolute", top: 0, left: 0, width: 1200, height: 630, objectFit: "cover" }}
      />
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: 620,
          height: 630,
          background:
            "linear-gradient(90deg, rgba(8,9,12,0.72) 0%, rgba(8,9,12,0.28) 70%, rgba(8,9,12,0) 100%)",
        }}
      />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: 1200,
          height: 630,
          padding: "56px 64px 48px",
          position: "relative",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
          }}
        >
          <div style={{ display: "flex", alignItems: "center" }}>
            <img src={logoSrc} width={168} height={39} alt="ARCFLOW" />
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 18,
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              borderRadius: 999,
              padding: "10px 18px",
              ...statusBadgeStyle(data.status),
            }}
          >
            {data.status}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", width: 820, marginTop: 58 }}>
          <div
            style={{
              display: "flex",
              fontFamily: "IBM Plex Mono",
              fontSize: 18,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "#9ca3af",
              marginBottom: 14,
            }}
          >
            {data.exists ? "Just Locked Tokens" : "Lock not found"}
          </div>
          <div style={{ display: "flex", alignItems: "center", width: "100%" }}>
            {data.exists ? <LockGlyph open={isLockOpen(data.status)} /> : null}
            <span
              style={{
                fontSize: 72,
                fontWeight: 700,
                letterSpacing: "-0.04em",
                lineHeight: 1,
                color: "#f8fafc",
              }}
            >
              {data.amountLabel}
            </span>
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 10,
              fontSize: 28,
              fontWeight: 600,
              color: "#4d8aff",
            }}
          >
            {data.symbol}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", width: "100%" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: 14,
              fontSize: 24,
              fontWeight: 500,
              color: "#94a3b8",
            }}
          >
            {data.exists ? (
              <>
                <span>{data.durationLabel}</span>
                <span style={{ margin: "0 12px", color: "rgba(148,163,184,0.55)" }}>|</span>
                <span style={{ fontFamily: "IBM Plex Mono", fontSize: 22 }}>
                  Ca {data.tokenShort}
                </span>
              </>
            ) : (
              "Nothing locked under this id"
            )}
          </div>
          <div
            style={{
              display: "flex",
              width: "100%",
              borderTop: "1px solid rgba(148,163,184,0.16)",
              paddingTop: 22,
              marginBottom: 18,
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", width: 360 }}>
              <span
                style={{
                  fontFamily: "IBM Plex Mono",
                  fontSize: 14,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "#9ca3af",
                  marginBottom: 8,
                }}
              >
                Unlocks
              </span>
              <span style={{ fontSize: 22, fontWeight: 600, color: "#e2e8f0" }}>{data.unlockLabel}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", width: 360 }}>
              <span
                style={{
                  fontFamily: "IBM Plex Mono",
                  fontSize: 14,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "#9ca3af",
                  marginBottom: 8,
                }}
              >
                Of total supply
              </span>
              <span style={{ fontSize: 22, fontWeight: 600, color: "#e2e8f0" }}>{data.supplyShare}</span>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              width: "100%",
              fontFamily: "IBM Plex Mono",
              fontSize: 16,
              color: "rgba(148,163,184,0.85)",
            }}
          >
            <span>arcflows</span>
            <span>archflows.finance/lock/{data.id}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [data, backgroundSrc, logoSrc, fonts] = await Promise.all([
    getLockOgData(id),
    fileDataUri("public/og-lock-bg.png", "image/png"),
    fileDataUri("public/logoarcflows-v2.png", "image/png"),
    loadFonts(),
  ]);

  return new ImageResponse(
    <LockOgCard data={data} backgroundSrc={backgroundSrc} logoSrc={logoSrc} />,
    { ...size, fonts },
  );
}
