import type { Metadata } from "next";
import { getLockOgData } from "@/lib/lock-og";

const SITE = "https://archflows.finance";

type Props = {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const data = await getLockOgData(id);
  const title = data.exists
    ? `${data.amountLabel} ${data.symbol} locked · ArcFlows`
    : `Lock #${id} · ArcFlows`;
  const description = data.exists
    ? `${data.status}. Unlocks ${data.unlockLabel}. ${data.supplyShare} of supply. Proof on ArcFlows.`
    : "Public lock proof on ArcFlows.";
  const url = `${SITE}/lock/${id}`;
  const image = `${SITE}/lock/${id}/opengraph-image`;

  return {
    metadataBase: new URL(SITE),
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
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

export default function LockLayout({ children }: { children: React.ReactNode }) {
  return children;
}
