"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { BrandLogo } from "@/components/BrandLogo";
import { SpaceBackdrop } from "@/components/SpaceBackdrop";

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
      <SpaceBackdrop />
      <SiteHeader />
      <div className="flex-1">{children}</div>

      <footer className="footer">
        <div className="shell">
          <div className="footer-grid">
            <div>
              <Link href="/" className="brand brand-logo-link" style={{ marginBottom: "0.75rem" }} aria-label="ArcFlow home">
                <BrandLogo height={36} />
              </Link>
              <p className="dim" style={{ maxWidth: "24rem", margin: "0.75rem 0 0" }}>
                Token operations on Arc. Immutable locks, linear vesting, streams, airdrops,
                escrow, and staking — with a public proof page for every position.
              </p>
            </div>

            <div className="footer-col">
              <div className="footer-col-title">Product</div>
              <Link href="/dashboard/locks">Locks</Link>
              <Link href="/dashboard/vesting">Vesting</Link>
              <Link href="/dashboard">Dashboard</Link>
              <Link href="/auth">Sign in</Link>
            </div>

            <div className="footer-col">
              <div className="footer-col-title">Network</div>
              <a href="https://faucet.circle.com" target="_blank" rel="noreferrer">
                USDC faucet
              </a>
              <a href="https://testnet.arcscan.app" target="_blank" rel="noreferrer">
                Arcscan
              </a>
              <a href="https://docs.arc.io" target="_blank" rel="noreferrer">
                Arc docs
              </a>
            </div>

            <div className="footer-col">
              <div className="footer-col-title">Company</div>
              <a href="/#product">Product</a>
              <a href="/#how">How it works</a>
              <a href="/#faq">FAQ</a>
            </div>
          </div>

          <div className="footer-bottom">
            <span>© {new Date().getFullYear()} ArcFlow — Lock. Vest. Stream. On Arc.</span>
            <span>Arc Testnet · chain 5042002 · gas in USDC</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
