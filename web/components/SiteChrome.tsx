"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { SiteHeader } from "@/components/SiteHeader";

export function SiteChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const bare =
    pathname.startsWith("/auth") ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/login");

  if (bare) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <div className="flex-1">{children}</div>
      <footer className="border-t">
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-10 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
          <div className="space-y-2">
            <div className="text-sm font-semibold tracking-tight">ArcFlow</div>
            <p className="text-sm text-muted-foreground">
              Token locks and vesting on Arc — public proof, USDC gas.
            </p>
          </div>
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground">Product</div>
            <Link className="block text-sm hover:underline" href="/auth">
              Sign in
            </Link>
            <Link className="block text-sm hover:underline" href="/dashboard">
              Dashboard
            </Link>
            <a className="block text-sm hover:underline" href="/#modules">
              Modules
            </a>
          </div>
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground">Network</div>
            <a
              className="block text-sm hover:underline"
              href="https://faucet.circle.com"
              target="_blank"
              rel="noreferrer"
            >
              Faucet
            </a>
            <a
              className="block text-sm hover:underline"
              href="https://testnet.arcscan.app"
              target="_blank"
              rel="noreferrer"
            >
              Arcscan
            </a>
            <a
              className="block text-sm hover:underline"
              href="https://docs.arc.io"
              target="_blank"
              rel="noreferrer"
            >
              Arc docs
            </a>
          </div>
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground">Help</div>
            <a className="block text-sm hover:underline" href="/#how">
              How it works
            </a>
            <a className="block text-sm hover:underline" href="/#faq">
              FAQ
            </a>
          </div>
        </div>
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between border-t px-4 py-4 text-xs text-muted-foreground sm:px-6">
          <span>© {new Date().getFullYear()} ArcFlow</span>
          <span className="font-mono">Arc Testnet · 5042002</span>
        </div>
      </footer>
    </div>
  );
}
