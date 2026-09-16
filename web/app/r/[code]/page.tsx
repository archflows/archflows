import Link from "next/link";
import { ReferralRedirect } from "@/components/referral/referral-redirect";
import { REFERRAL_PARAM, normalizeCode } from "@/lib/referral";

export default async function ReferralSharePage({ params }: { params: Promise<{ code: string }> }) {
  const { code: raw } = await params;
  const code = normalizeCode(raw) ?? raw.toUpperCase().slice(0, 16);
  const continueHref = `/?${REFERRAL_PARAM}=${code}`;

  return (
    <main className="shell" style={{ padding: "4.5rem 0 5rem", textAlign: "center" }}>
      <p className="dim" style={{ margin: "0 0 0.75rem", fontSize: "0.72rem", letterSpacing: "0.08em", textTransform: "uppercase" }}>
        ArcFlows invite
      </p>
      <h1 style={{ margin: "0 0 0.65rem", fontSize: "clamp(1.5rem, 4vw, 2rem)", fontWeight: 700 }}>
        Lock and vest on Arc
      </h1>
      <p className="dim" style={{ margin: "0 auto 1.35rem", maxWidth: "34rem", lineHeight: 1.6 }}>
        You&apos;ve been invited to create public token locks and vesting schedules on Arc. Fees in USDC.
      </p>
      <p className="mono" style={{ margin: "0 0 1.35rem", fontSize: "0.95rem", color: "var(--ink)" }}>
        Code {code}
      </p>
      <Link className="btn lg" href={continueHref}>
        Continue to ArcFlows
      </Link>
      <p className="dim" style={{ margin: "1rem 0 0", fontSize: "0.74rem" }}>
        Redirecting in a moment…
      </p>
      <ReferralRedirect code={code} />
    </main>
  );
}
