"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ConnectButton } from "@/components/ConnectButton";
import { BrandLogo } from "@/components/BrandLogo";
import { HashNavLink } from "@/components/hash-nav-link";
import { NETWORK_BADGE } from "@/lib/chain";
import { cn } from "@/lib/utils";

const MARKETING = [
  { href: "/#product", label: "Product" },
  { href: "/#proof", label: "Proof" },
  { href: "/#how", label: "How it works" },
  { href: "/#faq", label: "FAQ" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const onLockProof = pathname.startsWith("/lock");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <header className="nav">
      <div className="shell nav-row">
        <Link href="/" className="brand brand-logo-link" aria-label="ArcFlow home">
          <BrandLogo height={26} priority />
        </Link>

        <nav className="nav-mid">
          {MARKETING.map((link) => (
            <HashNavLink key={link.href} href={link.href} className="nav-link">
              {link.label}
            </HashNavLink>
          ))}
        </nav>

        <div className="nav-end">
          <span className="live live-accent hide-mobile">
            <span className="pulse-dot" />
            {NETWORK_BADGE}
          </span>
          <ConnectButton />
          <Link href="/auth" className="btn sm hide-mobile">
            {onLockProof ? "Dashboard" : "Launch app"}
          </Link>

          <button
            className="menu-toggle"
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            <span className={open ? "is-open" : ""} />
          </button>
        </div>
      </div>

      <div className={cn("mobile-drawer", open && "open")}>
        <div className="shell mobile-drawer-inner">
          {MARKETING.map((link) => (
            <HashNavLink key={link.href} href={link.href} onClick={() => setOpen(false)}>
              {link.label}
            </HashNavLink>
          ))}
          <Link href="/auth" className="btn" style={{ marginTop: "0.75rem" }}>
            Launch app
          </Link>
        </div>
      </div>
    </header>
  );
}
