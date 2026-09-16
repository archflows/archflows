import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getLockOgData } from "@/lib/lock-og";
import { LOCK_OG_SIZE } from "@/lib/lock-og-card";
import { resolveLockProofKeyCached } from "@/lib/lock-proof-key";
import { isTxHash } from "@/lib/proof";
import { af } from "@/lib/public-env";

type Props = {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
};

function siteOrigin() {
  return af.site.replace(/\/$/, "");
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const resolved = await resolveLockProofKeyCached(id);
  const canonical = resolved.canonicalKey;
  const data = await getLockOgData(id);
  const site = siteOrigin();
  const title = data.exists
    ? `${data.amountLabel} ${data.symbol} locked · ArcFlows`
    : resolved.lockId
      ? `Lock #${resolved.lockId} · ArcFlows`
      : `Lock proof · ArcFlows`;
  const description = data.exists
    ? `${data.status}. Unlocks ${data.unlockLabel}. ${data.supplyShare} of supply. Proof on ArcFlows.`
    : "Public lock proof on ArcFlows.";
  const url = `${site}/lock/${canonical}`;
  const image = `${site}/lock/${canonical}/opengraph-image`;

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
          width: LOCK_OG_SIZE.width,
          height: LOCK_OG_SIZE.height,
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
          width: LOCK_OG_SIZE.width,
          height: LOCK_OG_SIZE.height,
          alt: title,
        },
      ],
    },
  };
}

export default async function LockLayout({ params, children }: Props) {
  const { id } = await params;
  if (!isTxHash(id)) {
    const resolved = await resolveLockProofKeyCached(id);
    if (resolved.txHash && resolved.canonicalKey !== id) {
      redirect(`/lock/${resolved.txHash}`);
    }
  }
  return children;
}
