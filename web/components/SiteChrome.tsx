"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { HashNavLink } from "@/components/hash-nav-link";
import { BrandLogo } from "@/components/BrandLogo";
import { SpaceBackdrop } from "@/components/SpaceBackdrop";
import { ARC_CHAIN_ID, EXPLORER_URL, FAUCET_URL, NETWORK_NAME, isTestnet } from "@/lib/chain";

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
              <Link href="/" className="brand brand-logo-link" style={{ marginBottom: "0.75rem" }} aria-label="ArcFlows home">
                <BrandLogo height={28} />
              </Link>
              <p className="dim" style={{ maxWidth: "24rem", margin: "0.75rem 0 0" }}>
                Token operations on Arc. Immutable locks, linear vesting, streams, airdrops,
                escrow, and staking, with a public proof page for every position.
              </p>
            </div>

            <div className="footer-col">
              <div className="footer-col-title">Product</div>
              <Link href="/explorer">Explorer</Link>
              <Link href="/docs">Docs</Link>
              <Link href="/litepaper">Litepaper</Link>
              <Link href="/dashboard/locks">Locks</Link>
<Link href="/dashboard/vesting">Vesting</Link>
              <Link href="/dashboard/streams">Streams</Link>
              <Link href="/dashboard">Dashboard</Link>
              <Link href="/auth">Sign in</Link>
            </div>

            <div className="footer-col">
              <div className="footer-col-title">Network</div>
              {isTestnet ? (
                <a href={FAUCET_URL} target="_blank" rel="noreferrer">
                  USDC faucet
                </a>
              ) : null}
              <a href={EXPLORER_URL} target="_blank" rel="noreferrer">
                Arcscan
              </a>
              <a href="https://docs.arc.io" target="_blank" rel="noreferrer">
                Arc docs
              </a>
            </div>

            <div className="footer-col">
              <div className="footer-col-title">Company</div>
              <HashNavLink href="/#product">Product</HashNavLink>
              <HashNavLink href="/#how">How it works</HashNavLink>
              <HashNavLink href="/#faq">FAQ</HashNavLink>
              <Link href="/docs">Docs</Link>
              <Link href="/litepaper">Litepaper</Link>
              <Link href="/privacy">Privacy Policy</Link>
              <Link href="/terms">Terms &amp; Conditions</Link>
            </div>
          </div>

          <div className="footer-bottom">
<span>© {new Date().getFullYear()} arcflows — Lock. Vest. Stream. On Arc.</span>
            <span>
              {NETWORK_NAME} · chain {ARC_CHAIN_ID} · gas in USDC
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
