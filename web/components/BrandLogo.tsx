"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  /** Visual height of the logo in px. Width scales from the wide wordmark. */
  height?: number;
  priority?: boolean;
};

/** Official ArcFlow wordmark (lightweight PNG). */
export function BrandLogo({ className, height = 52, priority = false }: Props) {
  const width = Math.round(height * (1448 / 336));

  return (
    <Image
      src="/logo-arc-png.png"
      alt="ArcFlow"
      width={width}
      height={height}
      priority={priority}
      className={cn("brand-logo", className)}
      style={{ height, width: "auto" }}
    />
  );
}
