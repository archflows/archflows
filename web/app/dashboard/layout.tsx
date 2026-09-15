"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { useAccount, useSwitchChain } from "wagmi";
import { AppSidebar } from "@/components/app-sidebar";
import { DashboardHeader } from "@/components/dashboard-header";
import { DashboardBootSkeleton } from "@/components/page-skeleton";
import { arcChain } from "@/lib/chain";
import { pingBackend } from "@/lib/backend";
import { useMounted } from "@/hooks/useMounted";
import { Button } from "@/components/ui/button";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const mounted = useMounted();
  const router = useRouter();
  const pathname = usePathname();
  const { isConnected, chainId, isConnecting, isReconnecting } = useAccount();
  const { switchChain } = useSwitchChain();
  const [shellReady, setShellReady] = useState(false);

  const wrongChain = mounted && isConnected && chainId !== arcChain.id;

  // Only block the first wallet settle. Do not tear down the shell on brief
  // isReconnecting flickers — that made every in-dashboard nav feel like a reload.
  const bootstrapping =
    !mounted || ((!isConnected) && (isConnecting || isReconnecting));

  useEffect(() => {
    if (mounted && isConnected) setShellReady(true);
  }, [mounted, isConnected]);

  useEffect(() => {
    if (!mounted) return;
    if (!isConnecting && !isReconnecting && !isConnected) {
      router.replace(`/auth?next=${encodeURIComponent(pathname)}`);
    }
  }, [mounted, isConnecting, isReconnecting, isConnected, pathname, router]);

  useEffect(() => {
    if (!mounted || !isConnected) return;
    void pingBackend();
  }, [mounted, isConnected]);

  if (!shellReady && (bootstrapping || !isConnected)) {
    return <DashboardBootSkeleton />;
  }

  if (wrongChain) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-4 px-4 text-center">
        <h1 className="text-lg font-semibold">Wrong network</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Switch to the Arc network to use the dashboard.
        </p>
        <Button onClick={() => switchChain({ chainId: arcChain.id })}>Switch network</Button>
      </div>
    );
  }

  return (
    <SidebarProvider
      className="bg-background"
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
