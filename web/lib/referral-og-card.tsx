export const REFERRAL_OG_SIZE = { width: 1200, height: 630 };

const S = 2.5;

type Props = {
  code: string;
  backgroundSrc: string;
  logoSrc: string;
};

/** Satori referral share card. Background is the ArcFlows gradient plate. */
export function ReferralOgCardImage({ code, backgroundSrc, logoSrc }: Props) {
  const display = code || "INVITE";

  return (
    <div
      style={{
        width: REFERRAL_OG_SIZE.width,
        height: REFERRAL_OG_SIZE.height,
        display: "flex",
        position: "relative",
        backgroundColor: "#050816",
        color: "#ffffff",
        fontFamily: "Sora",
        overflow: "hidden",
      }}
    >
      <img
        src={backgroundSrc}
        width={REFERRAL_OG_SIZE.width}
        height={REFERRAL_OG_SIZE.height}
        alt=""
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: REFERRAL_OG_SIZE.width,
          height: REFERRAL_OG_SIZE.height,
          objectFit: "cover",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: REFERRAL_OG_SIZE.width,
          height: REFERRAL_OG_SIZE.height,
          background:
            "linear-gradient(180deg, rgba(5,8,22,0.55) 0%, rgba(5,8,22,0.18) 42%, rgba(5,8,22,0.08) 100%)",
        }}
      />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: REFERRAL_OG_SIZE.width,
          height: REFERRAL_OG_SIZE.height,
          padding: `${Math.round(18 * S)}px ${Math.round(20 * S)}px ${Math.round(16 * S)}px`,
          position: "relative",
          boxSizing: "border-box",
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
          <img src={logoSrc} height={Math.round(22 * S)} alt="ArcFlows" />
          <div
            style={{
              display: "flex",
              fontSize: Math.round(0.62 * 16 * S),
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "#dbeafe",
              border: `${S}px solid rgba(255,255,255,0.22)`,
              background: "rgba(8,12,28,0.35)",
              borderRadius: 999,
              padding: `${Math.round(0.28 * 16 * S)}px ${Math.round(0.62 * 16 * S)}px`,
            }}
          >
            Invite
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            justifyContent: "center",
            gap: Math.round(0.45 * 16 * S),
          }}
        >
          <div
            style={{
              display: "flex",
              fontFamily: "IBM Plex Mono",
              fontSize: Math.round(0.62 * 16 * S),
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "rgba(219,234,254,0.78)",
            }}
          >
            Referral
          </div>
          <div
            style={{
              display: "flex",
              fontSize: Math.round(2.05 * 16 * S),
              fontWeight: 700,
              letterSpacing: "-0.04em",
              lineHeight: 1.02,
              color: "#f8fafc",
            }}
          >
            Lock. Vest. Stream.
          </div>
          <div
            style={{
              display: "flex",
              fontSize: Math.round(0.92 * 16 * S),
              fontWeight: 500,
              color: "rgba(226,232,240,0.88)",
            }}
          >
            Use my ArcFlows invite. Earn USDC when they lock.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            width: "100%",
            gap: Math.round(16 * S),
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: Math.round(0.28 * 16 * S),
            }}
          >
            <span
              style={{
                display: "flex",
                fontFamily: "IBM Plex Mono",
                fontSize: Math.round(0.55 * 16 * S),
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "rgba(219,234,254,0.7)",
              }}
            >
              Code
            </span>
            <div
              style={{
                display: "flex",
                fontFamily: "IBM Plex Mono",
                fontSize: Math.round(1.35 * 16 * S),
                fontWeight: 400,
                letterSpacing: "0.18em",
                color: "#ffffff",
                border: `${S}px solid rgba(255,255,255,0.28)`,
                background: "rgba(8,12,28,0.42)",
                borderRadius: Math.round(10 * S),
                padding: `${Math.round(0.45 * 16 * S)}px ${Math.round(0.85 * 16 * S)}px`,
              }}
            >
              {display}
            </div>
          </div>
          <div
            style={{
              display: "flex",
              fontFamily: "IBM Plex Mono",
              fontSize: Math.round(0.68 * 16 * S),
              letterSpacing: "0.04em",
              color: "rgba(226,232,240,0.82)",
              paddingBottom: Math.round(0.35 * 16 * S),
            }}
          >
            arcflows.finance/r/{display}
          </div>
        </div>
      </div>
    </div>
  );
}
