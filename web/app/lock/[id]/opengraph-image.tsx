import { ImageResponse } from "next/og";
import { LockOgCardImage, LockOgFallbackImage, LOCK_OG_SIZE } from "@/lib/lock-og-card";
import { getLockOgData } from "@/lib/lock-og";
import { loadOgAssets } from "./og-assets-loader";

export const runtime = "nodejs";
export const alt = "ArcFlow lock proof";
export const size = LOCK_OG_SIZE;
export const contentType = "image/png";
export const revalidate = 300;

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const [data, assets] = await Promise.all([getLockOgData(id), loadOgAssets()]);

    return new ImageResponse(
      <LockOgCardImage
        data={data}
        backgroundSrc={assets.backgroundSrc}
        logoSrc={assets.logoSrc}
      />,
      { ...LOCK_OG_SIZE, fonts: assets.fonts },
    );
  } catch (error) {
    console.error("[opengraph-image] render failed", error);

    let logoSrc: string | undefined;
    try {
      logoSrc = (await loadOgAssets()).logoSrc;
    } catch {
      // omit logo on fallback
    }

    return new ImageResponse(<LockOgFallbackImage id={id} logoSrc={logoSrc} />, {
      ...LOCK_OG_SIZE,
    });
  }
}
