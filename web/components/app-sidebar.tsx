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
    items: [
      { title: "Create lock", url: "/dashboard/locks" },
      { title: "My locks", url: "/dashboard/locks/positions" },
    ],
  },
  {
    title: "Vesting",
    url: "/dashboard/vesting",
    icon: <HourglassIcon />,
    items: [
      { title: "Create vest", url: "/dashboard/vesting" },
      { title: "My vests", url: "/dashboard/vesting/positions" },
    ],
  },
  {
    title: "Streams",
    url: "/dashboard/streams",
    icon: <WavesIcon />,
    items: [
      {
        title: "Create stream",
        url: "/dashboard/streams",
        items: [
          { title: "Single stream", url: "/dashboard/streams" },
          { title: "Payroll CSV", url: "/dashboard/streams/payroll" },
        ],
      },
      { title: "My streams", url: "/dashboard/streams/positions" },
    ],
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
              render={<Link href="/dashboard" prefetch aria-label="ArcFlow dashboard" />}
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
