import type { Metadata } from "next";
import { REFERRAL_OG_SIZE } from "@/lib/referral-og-card";
import { normalizeCode } from "@/lib/referral";
import { af } from "@/lib/public-env";

type Props = {
  params: Promise<{ code: string }>;
  children: React.ReactNode;
};

function siteOrigin() {
  const raw = af.site.replace(/\/$/, "");
  if (/^https?:\/\/localhost(?::\d+)?$/i.test(raw) && process.env.NODE_ENV === "production") {
    return "https://arcflows.finance";
  }
  return raw;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code: raw } = await params;
  const code = normalizeCode(raw) ?? raw.toUpperCase();
  const site = siteOrigin();
  const title = `Join ArcFlows · ${code}`;
  const description =
    "You've been invited to lock and vest tokens on Arc. Public proof. Fees in USDC.";
  const url = `${site}/r/${code}`;
  const image = `${site}/r/${code}/opengraph-image`;

  return {
    metadataBase: new URL(site),
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: "website",
      siteName: "ArcFlows",
      images: [
        {
          url: image,
          width: REFERRAL_OG_SIZE.width,
          height: REFERRAL_OG_SIZE.height,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [
        {
          url: image,
          width: REFERRAL_OG_SIZE.width,
          height: REFERRAL_OG_SIZE.height,
          alt: title,
        },
      ],
    },
  };
}

export default function ReferralShareLayout({ children }: Props) {
  return children;
}
