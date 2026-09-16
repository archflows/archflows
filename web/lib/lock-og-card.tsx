import type { LockOgData } from "@/lib/lock-og";
import { isLockOpen, type LockProofStatus } from "@/lib/lock-status";

/** Preview card is 480×252; OG output is 1200×630 (×2.5). */
const S = 2.5;

export const LOCK_OG_SIZE = { width: 1200, height: 630 };

function statusBadgeStyle(status: LockProofStatus) {
  if (status === "Claimed") {
    return {
      color: "#bbf7d0",
      border: `${S}px solid rgba(34,197,94,0.4)`,
      background: "rgba(34,197,94,0.12)",
    };
  }
  if (status === "Unlocked") {
    return {
      color: "#a5f3fc",
      border: `${S}px solid rgba(6,182,212,0.4)`,
      background: "rgba(6,182,212,0.12)",
    };
  }
  return {
    color: "#bfdbfe",
    border: `${S}px solid rgba(0,80,224,0.32)`,
    background: "rgba(0,80,224,0.1)",
  };
}

function LockGlyph({ open }: { open: boolean }) {
  const size = Math.round(1.55 * 16 * S);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        flexShrink: 0,
        marginRight: Math.round(0.55 * 16 * S),
      }}
    >
      <svg
        width={size}
        height={size}
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

type CardProps = {
  data: LockOgData;
  backgroundSrc: string;
  logoSrc: string;
};

/** Satori-compatible lock proof card — mirrors LockOgPreview layout. */
export function LockOgCardImage({ data, backgroundSrc, logoSrc }: CardProps) {
  const open = isLockOpen(data.status);
  const durationText =
    data.exists && data.durationLabel !== "—" ? data.durationLabel : "Set duration";

  return (
    <div
      style={{
        width: LOCK_OG_SIZE.width,
        height: LOCK_OG_SIZE.height,
        display: "flex",
        position: "relative",
        backgroundColor: "#08090c",
        color: "#ffffff",
        fontFamily: "Sora",
        borderRadius: Math.round(14 * S),
        border: `${S}px solid rgba(0, 80, 224, 0.22)`,
        overflow: "hidden",
      }}
    >
      <img
        src={backgroundSrc}
        width={LOCK_OG_SIZE.width}
        height={LOCK_OG_SIZE.height}
        alt=""
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: LOCK_OG_SIZE.width,
          height: LOCK_OG_SIZE.height,
          objectFit: "cover",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: LOCK_OG_SIZE.width,
          height: LOCK_OG_SIZE.height,
          background:
            "linear-gradient(90deg, rgba(8,9,12,0.72) 0%, rgba(8,9,12,0.22) 58%, transparent 78%)",
        }}
      />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: LOCK_OG_SIZE.width,
          height: LOCK_OG_SIZE.height,
          padding: `${Math.round(16 * S)}px ${Math.round(17.6 * S)}px ${Math.round(13.6 * S)}px`,
          position: "relative",
          boxSizing: "border-box",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", maxWidth: "62%" }}>
            <img src={logoSrc} height={Math.round(22 * S)} alt="ArcFlows" />
          </div>
          <div
            style={{
              display: "flex",
              fontSize: Math.round(0.62 * 16 * S),
              fontWeight: 600,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              borderRadius: 999,
              padding: `${Math.round(0.28 * 16 * S)}px ${Math.round(0.55 * 16 * S)}px`,
              whiteSpace: "nowrap",
              ...statusBadgeStyle(data.status),
            }}
          >
            {data.status}
          </div>
        </div>

        {/* Hero */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            minHeight: 0,
            paddingTop: Math.round(1.85 * 16 * S),
            gap: Math.round(0.28 * 16 * S),
          }}
        >
          <div
            style={{
              display: "flex",
              fontFamily: "IBM Plex Mono",
              fontSize: Math.round(0.62 * 16 * S),
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "#9ca3af",
              margin: 0,
            }}
          >
            {data.exists ? "Just Locked Tokens" : "Lock not found"}
          </div>

          <div style={{ display: "flex", alignItems: "center", minWidth: 0 }}>
            {data.exists ? <LockGlyph open={open} /> : null}
            <span
              style={{
                fontSize: Math.round(1.65 * 16 * S),
                fontWeight: 700,
                letterSpacing: "-0.035em",
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
              fontSize: Math.round(0.78 * 16 * S),
              fontWeight: 600,
              color: "#4d8aff",
              letterSpacing: "0.02em",
              lineHeight: 1,
            }}
          >
            {data.symbol}
          </div>

          <div style={{ display: "flex", flex: 1 }} />

          <div
            style={{
              display: "flex",
              alignItems: "center",
              fontSize: Math.round(0.78 * 16 * S),
              fontWeight: 500,
              color: "#94a3b8",
              paddingBottom: Math.round(0.45 * 16 * S),
              gap: Math.round(0.4 * 16 * S),
            }}
          >
            {data.exists ? (
              <>
                <span>{durationText}</span>
                <span style={{ color: "rgba(148,163,184,0.55)" }}>|</span>
                <span
                  style={{
                    fontFamily: "IBM Plex Mono",
                    fontSize: Math.round(0.72 * 16 * S),
                    color: "#94a3b8",
                  }}
                >
                  Ca {data.tokenShort}
                </span>
              </>
            ) : (
              "Nothing locked under this id"
            )}
          </div>
        </div>

        {/* Bottom */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flexShrink: 0,
            gap: Math.round(0.55 * 16 * S),
            paddingTop: Math.round(0.7 * 16 * S),
            borderTop: `${S}px solid rgba(148,163,184,0.14)`,
          }}
        >
          <div
            style={{
              display: "flex",
              width: "100%",
              gap: `${Math.round(0.65 * 16 * S)}px ${Math.round(16 * S)}px`,
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", flex: 1.35, minWidth: 0 }}>
              <span
                style={{
                  display: "flex",
                  fontFamily: "IBM Plex Mono",
                  fontSize: Math.round(0.58 * 16 * S),
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                  color: "#9ca3af",
                  marginBottom: Math.round(0.28 * 16 * S),
                }}
              >
                Unlocks
              </span>
              <span
                style={{
                  display: "flex",
                  fontSize: Math.round(0.78 * 16 * S),
                  fontWeight: 600,
                  lineHeight: 1.25,
                  color: "#e2e8f0",
                }}
              >
                {data.unlockLabel}
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", flex: 0.9, minWidth: 0 }}>
              <span
                style={{
                  display: "flex",
                  fontFamily: "IBM Plex Mono",
                  fontSize: Math.round(0.58 * 16 * S),
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                  color: "#9ca3af",
                  marginBottom: Math.round(0.28 * 16 * S),
                }}
              >
                Of total supply
              </span>
              <span
                style={{
                  display: "flex",
                  fontSize: Math.round(0.78 * 16 * S),
                  fontWeight: 600,
                  lineHeight: 1.25,
                  color: "#e2e8f0",
                }}
              >
                {data.supplyShare}
              </span>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              width: "100%",
              fontFamily: "IBM Plex Mono",
              fontSize: Math.round(0.58 * 16 * S),
              color: "rgba(148,163,184,0.75)",
            }}
          >
            <span>ArcFlow</span>
            <span>Public proof</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Minimal fallback when full render fails — still returns HTTP 200 PNG. */
export function LockOgFallbackImage({ id, logoSrc }: { id: string; logoSrc?: string }) {
  return (
    <div
      style={{
        width: LOCK_OG_SIZE.width,
        height: LOCK_OG_SIZE.height,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#08090c",
        color: "#f8fafc",
        fontFamily: "Sora",
        padding: 48,
      }}
    >
      {logoSrc ? (
        <img src={logoSrc} height={48} alt="ArcFlows" style={{ marginBottom: 32 }} />
      ) : null}
      <div style={{ display: "flex", fontSize: 36, fontWeight: 700, marginBottom: 12 }}>
        ArcFlow Lock Proof
      </div>
      <div
        style={{
          display: "flex",
          fontFamily: "IBM Plex Mono",
          fontSize: 22,
          color: "#94a3b8",
        }}
      >
        Lock #{id}
      </div>
    </div>
  );
}
