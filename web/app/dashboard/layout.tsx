"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type CSSProperties, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { useAccount, useSwitchChain } from "wagmi";
import { AppSidebar } from "@/components/app-sidebar";
import { DashboardHeader } from "@/components/dashboard-header";
import { ARC_TESTNET } from "@/lib/chain";
import { useMounted } from "@/hooks/useMounted";
import { Button } from "@/components/ui/button";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const mounted = useMounted();
  const router = useRouter();
  const pathname = usePathname();
  const { isConnected, chainId, isConnecting, isReconnecting } = useAccount();
  const { switchChain } = useSwitchChain();

  const wrongChain = mounted && isConnected && chainId !== ARC_TESTNET.id;
  const checking = !mounted || isConnecting || isReconnecting;

  useEffect(() => {
    if (!mounted) return;
    if (!isConnecting && !isReconnecting && !isConnected) {
      router.replace(`/auth?next=${encodeURIComponent(pathname)}`);
    }
  }, [mounted, isConnecting, isReconnecting, isConnected, pathname, router]);

  if (checking || !isConnected) {
    return (
      <div className="flex min-h-svh items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Checking session…
      </div>
    );
  }

  if (wrongChain) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-4 px-4 text-center">
        <h1 className="text-lg font-semibold">Wrong network</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Switch to Arc Testnet to use the admin dashboard.
        </p>
        <Button onClick={() => switchChain({ chainId: ARC_TESTNET.id })}>Switch to Arc</Button>
      </div>
    );
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <DashboardHeader />
        <div className="dashboard-main flex flex-1 flex-col">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
