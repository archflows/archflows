import { REFERRAL_OG_SIZE, renderReferralOgPng } from "@/lib/referral-og-compose";
import { referralShareUrl } from "@/lib/referral-share";
import { normalizeCode } from "@/lib/referral";
import { af } from "@/lib/public-env";

function siteOrigin() {
  const raw = af.site.replace(/\/$/, "");
  if (/^https?:\/\/localhost(?::\d+)?$/i.test(raw) && process.env.NODE_ENV === "production") {
    return "https://arcflows.finance";
  }
  return raw;
}

export const runtime = "nodejs";
export const alt = "ArcFlows referral invite";
export const size = REFERRAL_OG_SIZE;
export const contentType = "image/png";
export const revalidate = 3600;

export default async function Image({ params }: { params: Promise<{ code: string }> }) {
  const { code: raw } = await params;
  const code = normalizeCode(raw) ?? raw.toUpperCase().slice(0, 16);
  const link = referralShareUrl(siteOrigin(), code);

  try {
    const png = await renderReferralOgPng(code, link);
    return new Response(new Uint8Array(png), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": `public, max-age=${revalidate}`,
      },
    });
  } catch (error) {
    console.error("[referral opengraph-image] render failed", error);
    throw error;
  }
}
