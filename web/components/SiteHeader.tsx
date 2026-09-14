"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ConnectButton } from "@/components/ConnectButton";
import { LogoMark } from "@/components/Icons";
import { cn } from "@/lib/utils";

const MARKETING = [
  { href: "/#mission", label: "Mission" },
  { href: "/#modules", label: "Modules" },
  { href: "/#launch", label: "Launch sequence" },
  { href: "/#faq", label: "FAQ" },
];

const APP = [
  { href: "/app", label: "New lock" },
  { href: "/app/locks", label: "My orbit" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const inApp = pathname.startsWith("/app") || pathname.startsWith("/lock");
  const links = inApp ? APP : MARKETING;
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <header className="nav">
      <div className="shell nav-row">
        <Link href="/" className="brand">
          <span className="brand-glyph">
            <LogoMark size={14} />
          </span>
          ArcFlow
        </Link>

        <nav className="nav-mid">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "nav-link",
                inApp &&
                  (link.href === "/app"
                    ? pathname === "/app"
                    : pathname.startsWith(link.href)) &&
                  "active",
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="nav-end">
          <span className="live live-accent hide-mobile">
            <span className="pulse-dot" />
            Testnet
          </span>
          <ConnectButton />
          {!inApp ? (
            <Link href="/app" className="btn sm hide-mobile">
              Launch app
            </Link>
          ) : null}

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
          {links.map((link) => (
            <Link key={link.href} href={link.href}>
              {link.label}
            </Link>
          ))}
          <Link href="/app" className="btn" style={{ marginTop: "0.75rem" }}>
            Launch app
          </Link>
        </div>
      </div>
    </header>
  );
}
