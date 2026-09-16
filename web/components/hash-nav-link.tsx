"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { MouseEvent, ReactNode } from "react";

/** Same markup on server and client. Hash targets on `/` scroll in-place. */
export function HashNavLink({
  href,
  className,
  children,
  onClick,
}: {
  href: string;
  className?: string;
  children: ReactNode;
  onClick?: () => void;
}) {
  const pathname = usePathname();
  const hash = href.startsWith("/#") ? href.slice(1) : href;

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (pathname === "/" && hash.startsWith("#")) {
      const el = document.getElementById(hash.slice(1));
      if (el) {
        event.preventDefault();
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        window.history.replaceState(null, "", hash);
      }
    }
    onClick?.();
  };

  return (
    <Link href={href} className={className} onClick={handleClick}>
      {children}
    </Link>
  );
}
