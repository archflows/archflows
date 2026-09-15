"use client";

import { usePathname } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";

function titleFromPath(pathname: string) {
  if (pathname.startsWith("/dashboard/create")) return "Create lock";
  if (pathname.startsWith("/dashboard/locks/positions")) return "Lock positions";
  if (pathname.startsWith("/dashboard/locks")) return "Locks";
  if (pathname.startsWith("/dashboard/vesting/positions")) return "Vesting positions";
  if (pathname.startsWith("/dashboard/vesting")) return "Vesting";
  if (pathname.startsWith("/dashboard/airdrops/claim")) return "Claim airdrop";
  if (pathname.startsWith("/dashboard/airdrops/manage")) return "Airdrop campaigns";
  if (pathname.startsWith("/dashboard/airdrops")) return "Airdrops";
  if (pathname.startsWith("/dashboard/staking/pools")) return "Stake";
  if (pathname.startsWith("/dashboard/staking")) return "Staking";
  return "Home";
}

export function DashboardHeader() {
  const pathname = usePathname();
  const title = titleFromPath(pathname);

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 h-4 data-vertical:self-auto"
        />
        <h1 className="text-base font-medium">{title}</h1>
        <Badge variant="outline" className="ml-auto font-mono text-[10px]">
          Arc Testnet
        </Badge>
      </div>
    </header>
  );
}
