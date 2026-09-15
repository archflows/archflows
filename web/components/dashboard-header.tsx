"use client";

import { usePathname } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

function titleFromPath(pathname: string) {
  if (pathname.startsWith("/dashboard/contacts")) return "Contacts";
  if (pathname.startsWith("/dashboard/create")) return "Create lock";
  if (pathname === "/dashboard/locks/positions") return "My locks";
  if (pathname.startsWith("/dashboard/locks")) return "Create lock";
  if (pathname === "/dashboard/vesting/positions") return "My vests";
  if (pathname.startsWith("/dashboard/vesting")) return "Create vest";
  if (pathname === "/dashboard/streams/positions") return "My streams";
  if (pathname === "/dashboard/streams/payroll") return "Payroll CSV";
  if (pathname.startsWith("/dashboard/streams")) return "Single stream";
  if (pathname.startsWith("/dashboard/escrow")) return "Escrow";
  if (pathname.startsWith("/dashboard/airdrops")) return "Airdrops";
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
      </div>
    </header>
  );
}
