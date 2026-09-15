"use client";

import { ExternalLink } from "lucide-react";
import { explorerTxUrl } from "@/lib/chain";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button-variants";

export function TxExplorerLink({
  hash,
  className,
  variant = "button",
  children = "Explorer",
}: {
  hash?: string | null;
  className?: string;
  variant?: "button" | "text";
  children?: React.ReactNode;
}) {
  if (!hash) return null;
  const href = explorerTxUrl(hash);

  if (variant === "text") {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className={cn(
          "inline-flex items-center gap-1 text-[0.78rem] font-medium text-foreground underline-offset-4 hover:underline",
          className,
        )}
      >
        {children}
        <ExternalLink className="size-3" />
      </a>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={cn(
        buttonVariants({ variant: "outline", size: "sm" }),
        "relative z-10 border-white/30 bg-black/60 text-white hover:bg-black/80 hover:text-white",
        className,
      )}
    >
      {children}
      <ExternalLink className="size-3.5" />
    </a>
  );
}
