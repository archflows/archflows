"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function ModuleTabs({
  items,
}: {
  items: { href: string; label: string; exact?: boolean }[];
}) {
  const pathname = usePathname();

  return (
    <div className={cn("seg", items.length === 2 ? "seg-2" : "seg-3")} style={{ maxWidth: "28rem" }}>
      {items.map((item) => {
        const active = item.exact
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn("seg-btn", active && "on")}
            style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
