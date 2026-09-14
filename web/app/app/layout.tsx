"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Clock, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button-variants";

function SideLink({
  href,
  children,
  icon,
}: {
  href: string;
  children: ReactNode;
  icon: ReactNode;
}) {
  const pathname = usePathname();
  const active = href === "/app" ? pathname === "/app" : pathname.startsWith(href);
  return (
    <Link
      href={href}
      className={cn(
        buttonVariants({ variant: active ? "secondary" : "ghost", size: "sm" }),
        "w-full justify-start gap-2",
      )}
    >
      {icon}
      {children}
    </Link>
  );
}

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="grid gap-8 md:grid-cols-[180px_1fr] md:gap-12">
        <aside className="flex flex-wrap gap-1 md:sticky md:top-20 md:flex-col md:self-start">
          <div className="mb-1 hidden w-full px-2 text-xs font-medium text-muted-foreground md:block">
            Modules
          </div>
          <SideLink href="/app" icon={<Lock className="size-4" />}>
            Create lock
          </SideLink>
          <SideLink href="/app/locks" icon={<Clock className="size-4" />}>
            My locks
          </SideLink>
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
