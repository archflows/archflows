"use client";

import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  HomeIcon,
  LockIcon,
  HourglassIcon,
  GiftIcon,
  LayersIcon,
} from "lucide-react";

const navMain = [
  {
    title: "Home",
    url: "/dashboard",
    icon: <HomeIcon />,
  },
  {
    title: "Locks",
    url: "/dashboard/locks",
    icon: <LockIcon />,
  },
  {
    title: "Vesting",
    url: "/dashboard/vesting",
    icon: <HourglassIcon />,
  },
  {
    title: "Staking",
    url: "/dashboard/staking",
    icon: <LayersIcon />,
  },
  {
    title: "Airdrops",
    url: "/dashboard/airdrops",
    icon: <GiftIcon />,
  },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="h-10 justify-center data-[slot=sidebar-menu-button]:p-1.5!"
              render={<Link href="/dashboard" aria-label="ArcFlow dashboard" />}
            >
              <BrandLogo height={28} className="mx-auto" />
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
