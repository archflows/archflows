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
  WavesIcon,
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
    title: "Streams",
    url: "/dashboard/streams",
    icon: <WavesIcon />,
  },
  {
    title: "Staking",
    url: "/dashboard/staking",
    icon: <LayersIcon />,
    soon: true,
  },
  {
    title: "Airdrops",
    url: "/dashboard/airdrops",
    icon: <GiftIcon />,
    soon: true,
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
              render={<Link href="/dashboard" prefetch={false} aria-label="ArcFlow dashboard" />}
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
