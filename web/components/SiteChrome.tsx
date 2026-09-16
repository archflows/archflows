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
            <div className="footer-brand">
              <Link href="/" className="brand brand-logo-link" aria-label="ArcFlows home">
                <BrandLogo height={28} />
              </Link>
              <p>
                Token operations on Arc Chain. Locks, vesting, streams, and public proof
                for every position.
              </p>
            </div>

            <nav className="footer-nav" aria-label="Footer">
              <div className="footer-col">
                <div className="footer-col-title">Product</div>
                <div className="footer-col-links">
                  <div>
                    <Link href="/explorer">Explorer</Link>
                    <Link href="/dashboard/locks">Locks</Link>
                    <Link href="/dashboard/vesting">Vesting</Link>
                  </div>
                  <div>
                    <Link href="/dashboard/streams">Streams</Link>
                    <Link href="/docs">Docs</Link>
                    <Link href="/litepaper">Litepaper</Link>
                  </div>
                </div>
              </div>

              <div className="footer-col">
                <div className="footer-col-title">Company</div>
                <div className="footer-col-links">
                  <div>
                    <HashNavLink href="/#how">How it works</HashNavLink>
                    <HashNavLink href="/#faq">FAQ</HashNavLink>
                    <a href={EXPLORER_URL} target="_blank" rel="noreferrer">
                      Arcscan
                    </a>
                    <a href="https://docs.arc.io" target="_blank" rel="noreferrer">
                      Arc docs
                    </a>
                  </div>
                  <div>
                    {isTestnet ? (
                      <a href={FAUCET_URL} target="_blank" rel="noreferrer">
                        USDC faucet
                      </a>
                    ) : null}
                    <Link href="/privacy">Privacy</Link>
                    <Link href="/terms">Terms</Link>
                  </div>
                </div>
              </div>
            </nav>
          </div>

          <div className="footer-bottom">
            <span suppressHydrationWarning>
              © {new Date().getFullYear()} ArcFlows — Lock. Vest. Stream. On Arc.
            </span>
            <span>
              {NETWORK_NAME} · chain {ARC_CHAIN_ID} · gas in USDC
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
