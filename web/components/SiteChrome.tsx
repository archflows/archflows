"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { HashNavLink } from "@/components/hash-nav-link";
import { BrandLogo } from "@/components/BrandLogo";
import { SpaceBackdrop } from "@/components/SpaceBackdrop";
import { ARC_CHAIN_ID, EXPLORER_URL, FAUCET_URL, NETWORK_NAME, isTestnet } from "@/lib/chain";

const X_URL = "https://x.com/arcflows_app";
const TELEGRAM_URL = "https://t.me/arcflows";

function IconX({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="currentColor"
        d="M18.244 2H21.5l-7.5 8.57L22.5 22h-6.59l-5.16-6.74L5.2 22H1.94l8.03-9.17L1.5 2h6.74l4.66 6.18L18.244 2Zm-1.16 18h1.81L7.01 3.91H5.07L17.084 20Z"
      />
    </svg>
  );
}

function IconTelegram({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="currentColor"
        d="M21.5 3.4 2.9 10.55c-1.27.5-1.26 1.2-.23 1.52l4.78 1.49 1.85 5.67c.22.6.4.83.86.83.45 0 .65-.2.9-.45l2.23-2.17 4.63 3.42c.85.47 1.47.23 1.68-.79L22.9 4.7c.3-1.2-.46-1.75-1.4-1.3ZM8.3 13.9l9.86-6.22c.49-.3.94-.14.57.2l-8 7.66-.3 3.37-2.13-5Z"
      />
    </svg>
  );
}

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
              <div className="footer-social">
                <a href={X_URL} target="_blank" rel="noreferrer" aria-label="ArcFlows on X">
                  <IconX />
                </a>
                <a href={TELEGRAM_URL} target="_blank" rel="noreferrer" aria-label="ArcFlows on Telegram">
                  <IconTelegram />
                </a>
              </div>
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
            <div className="footer-social footer-social-bottom">
              <a href={X_URL} target="_blank" rel="noreferrer" aria-label="ArcFlows on X">
                <IconX />
              </a>
              <a href={TELEGRAM_URL} target="_blank" rel="noreferrer" aria-label="ArcFlows on Telegram">
                <IconTelegram />
              </a>
            </div>
            <span>
              {NETWORK_NAME} · chain {ARC_CHAIN_ID} · gas in USDC
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
