"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { ConnectButton } from "@/components/ConnectButton";
import { LogoMark } from "@/components/Icons";
import { buttonVariants } from "@/components/ui/button-variants";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const marketingLinks = [
  { href: "/#how", label: "How it works" },
  { href: "/#modules", label: "Modules" },
  { href: "/#faq", label: "FAQ" },
  { href: "/auth", label: "Sign in" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const inApp = pathname.startsWith("/app") || pathname.startsWith("/lock");

  return (
    <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          <LogoMark size={18} />
          ArcFlow
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {inApp ? (
            <>
              <Link
                href="/app"
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground",
                  pathname === "/app" && "bg-muted text-foreground",
                )}
              >
                Create lock
              </Link>
              <Link
                href="/app/locks"
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground",
                  pathname.startsWith("/app/locks") && "bg-muted text-foreground",
                )}
              >
                My locks
              </Link>
            </>
          ) : (
            marketingLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
              >
                {link.label}
              </Link>
            ))
          )}
        </nav>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="hidden font-mono text-[10px] sm:inline-flex">
            Testnet
          </Badge>
          <ConnectButton />
          {!inApp ? (
            <Link
              href="/auth"
              className={cn(buttonVariants({ size: "sm" }), "hidden sm:inline-flex")}
            >
              Open dashboard
            </Link>
          ) : null}

          {!inApp ? (
            <Sheet>
              <SheetTrigger
                className={cn(buttonVariants({ variant: "outline", size: "icon-sm" }), "md:hidden")}
                aria-label="Open menu"
              >
                <Menu className="size-4" />
              </SheetTrigger>
              <SheetContent side="right" className="w-[280px]">
                <SheetHeader>
                  <SheetTitle>Menu</SheetTitle>
                </SheetHeader>
                <div className="mt-6 flex flex-col gap-1">
                  {marketingLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={cn(buttonVariants({ variant: "ghost" }), "justify-start")}
                    >
                      {link.label}
                    </Link>
                  ))}
                  <Link href="/auth" className={cn(buttonVariants(), "mt-4")}>
                    Open dashboard
                  </Link>
                </div>
              </SheetContent>
            </Sheet>
          ) : null}
        </div>
      </div>
    </header>
  );
}
