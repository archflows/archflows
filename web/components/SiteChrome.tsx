"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { LogoMark } from "@/components/Icons";

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

      <footer className="footer">
        <div className="shell">
          <div className="footer-grid">
            <div>
              <Link href="/" className="brand" style={{ marginBottom: "0.75rem" }}>
                <span className="brand-glyph">
                  <LogoMark size={14} />
                </span>
                ArcFlow
              </Link>
              <p className="dim" style={{ maxWidth: "24rem", margin: "0.75rem 0 0" }}>
                Token locks and vesting in orbit around Arc. Immutable schedules, public proof,
                gas paid in USDC.
              </p>
            </div>

            <div className="footer-col">
              <div className="footer-col-title">// Flight deck</div>
              <Link href="/app">New lock</Link>
              <Link href="/app/locks">My orbit</Link>
              <Link href="/auth">Sign in</Link>
            </div>

            <div className="footer-col">
              <div className="footer-col-title">// Arc network</div>
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
              <div className="footer-col-title">// Ground control</div>
              <a href="/#launch">Launch sequence</a>
              <a href="/#faq">FAQ</a>
              <a href="/#modules">Modules</a>
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
