"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { HashNavLink } from "@/components/hash-nav-link";
import { cn } from "@/lib/utils";

const MARKETING = [
  { href: "/explorer", label: "Explorer" },
  { href: "/docs", label: "Docs" },
  { href: "/litepaper", label: "Litepaper" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const onLockProof = pathname.startsWith("/lock") || pathname.startsWith("/explorer");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <header className="nav">
      <div className="shell nav-row">
        <Link href="/" className="brand brand-logo-link" aria-label="ArcFlows home">
          <BrandLogo height={26} priority />
        </Link>

        <nav className="nav-mid">
          {MARKETING.map((link) => (
<HashNavLink key={link.href} href={link.href} className={cn("nav-link", pathname.startsWith(link.href) && "active")}>
              {link.label}
            </HashNavLink>
          ))}
        </nav>

        <div className="nav-end">
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
