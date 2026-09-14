"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Clock3, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

const MODULES = [
  { href: "/app", label: "New lock", icon: Lock },
  { href: "/app/locks", label: "My orbit", icon: Clock3 },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const onLocks = pathname.startsWith("/app/locks");

  return (
    <div className="shell" style={{ paddingTop: "2.25rem", paddingBottom: "3.5rem" }}>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "end",
          justifyContent: "space-between",
          gap: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        <div>
          <p className="tag tag-accent">// FLIGHT DECK</p>
          <h1
            style={{
              margin: 0,
              fontSize: "clamp(1.4rem, 3vw, 1.9rem)",
              letterSpacing: "-0.03em",
              fontWeight: 700,
            }}
          >
            {onLocks ? "Positions in orbit" : "Set a new trajectory"}
          </h1>
          <p className="mono dim" style={{ margin: "0.4rem 0 0", fontSize: "0.76rem" }}>
            {onLocks
              ? "// every position read live from the contract"
              : "// approve, lock, then share the proof URL"}
          </p>
        </div>

        <nav className="seg seg-2" style={{ maxWidth: "20rem", width: "100%" }}>
          {MODULES.map((m) => {
            const active = m.href === "/app" ? pathname === "/app" : pathname.startsWith(m.href);
            return (
              <Link
                key={m.href}
                href={m.href}
                className={cn("seg-btn", active && "on")}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.4rem",
                }}
              >
                <m.icon className="size-3.5" />
                {m.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {children}
    </div>
  );
}
