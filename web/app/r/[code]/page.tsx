import Link from "next/link";
import { ReferralRedirect } from "@/components/referral/referral-redirect";
import {
  referralLandingHeadline,
  referralLandingSubcopy,
  referralShareUrl,
} from "@/lib/referral-share";
import { REFERRAL_PARAM, normalizeCode } from "@/lib/referral";
import { af } from "@/lib/public-env";

function siteOrigin() {
  const raw = af.site.replace(/\/$/, "");
  if (/^https?:\/\/localhost(?::\d+)?$/i.test(raw) && process.env.NODE_ENV === "production") {
    return "https://arcflows.finance";
  }
  return raw;
}

export default async function ReferralSharePage({ params }: { params: Promise<{ code: string }> }) {
  const { code: raw } = await params;
  const code = normalizeCode(raw) ?? raw.toUpperCase().slice(0, 16);
  const continueHref = `/?${REFERRAL_PARAM}=${code}`;
  const link = referralShareUrl(siteOrigin(), code);

  return (
    <main className="shell" style={{ padding: "4.5rem 0 5rem", textAlign: "center" }}>
      <p className="dim" style={{ margin: "0 0 0.75rem", fontSize: "0.72rem", letterSpacing: "0.08em", textTransform: "uppercase" }}>
        Earn 15% from referrals
      </p>
      <h1 style={{ margin: "0 0 0.65rem", fontSize: "clamp(1.5rem, 4vw, 2rem)", fontWeight: 700 }}>
        {referralLandingHeadline()}
      </h1>
      <p className="dim" style={{ margin: "0 auto 1.1rem", maxWidth: "34rem", lineHeight: 1.6 }}>
        {referralLandingSubcopy()}
      </p>
      <p className="mono dash-well" style={{ margin: "0 auto 0.85rem", maxWidth: "28rem", padding: "0.65rem 0.85rem", fontSize: "0.82rem", color: "var(--ink)" }}>
        {link}
      </p>
      <p className="mono" style={{ margin: "0 0 1.35rem", fontSize: "0.95rem", color: "var(--ink)" }}>
        Code · {code}
      </p>
      <Link className="btn lg" href={continueHref}>
        Start on ArcFlows
      </Link>
      <p className="dim" style={{ margin: "1rem 0 0", fontSize: "0.74rem" }}>
        Redirecting in a moment…
      </p>
      <ReferralRedirect code={code} />
    </main>
  );
}
