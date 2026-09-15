"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/** Hash targets on `/` use a native `#id` so the page actually scrolls. */
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
  const onHome = pathname === "/";

  if (onHome && hash.startsWith("#")) {
    return (
      <a href={hash} className={className} onClick={onClick}>
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={className} onClick={onClick}>
      {children}
    </Link>
  );
}
