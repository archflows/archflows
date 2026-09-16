import { ImageResponse } from "next/og";
import { ReferralOgCardImage, REFERRAL_OG_SIZE } from "@/lib/referral-og-card";
import { normalizeCode } from "@/lib/referral";
import { loadReferralOgAssets } from "./og-assets-loader";

export const runtime = "nodejs";
export const alt = "ArcFlows referral invite";
export const size = REFERRAL_OG_SIZE;
export const contentType = "image/png";
export const revalidate = 3600;

export default async function Image({ params }: { params: Promise<{ code: string }> }) {
  const { code: raw } = await params;
  const code = normalizeCode(raw) ?? raw.toUpperCase().slice(0, 16);

  try {
    const assets = await loadReferralOgAssets();
    return new ImageResponse(
      <ReferralOgCardImage
        code={code}
        backgroundSrc={assets.backgroundSrc}
        logoSrc={assets.logoSrc}
      />,
      { ...REFERRAL_OG_SIZE, fonts: assets.fonts },
    );
  } catch (error) {
    console.error("[referral opengraph-image] render failed", error);
    const assets = await loadReferralOgAssets().catch(() => null);
    return new ImageResponse(
      <ReferralOgCardImage
        code={code}
        backgroundSrc={assets?.backgroundSrc ?? ""}
        logoSrc={assets?.logoSrc ?? ""}
      />,
      { ...REFERRAL_OG_SIZE },
    );
  }
}
