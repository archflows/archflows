"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  /** Visual height of the logo in px. Width scales from the wordmark. */
  height?: number;
  priority?: boolean;
};

/** Official ArcFlows wordmark (transparent PNG). */
export function BrandLogo({ className, height = 52, priority = false }: Props) {
  const width = Math.round(height * (1024 / 234));

  return (
    <Image
      src="/logoarcflows-v2.png"
      alt="ArcFlows"
      width={width}
      height={height}
      priority={priority}
      unoptimized
      className={cn("brand-logo", className)}
      style={{ height, width: "auto", background: "transparent" }}
    />
  );
}
