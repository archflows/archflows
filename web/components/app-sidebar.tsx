"use client";

import Link from "next/link";
import { LogoMark } from "@/components/Icons";
import { NavDocuments } from "@/components/nav-documents";
import { NavMain } from "@/components/nav-main";
import { NavSecondary } from "@/components/nav-secondary";
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
  Settings2Icon,
  CircleHelpIcon,
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
    title: "Airdrops",
    url: "/dashboard/airdrops",
    icon: <GiftIcon />,
  },
  {
    title: "Staking",
    url: "/dashboard/staking",
    icon: <LayersIcon />,
  },
];

const navSecondary = [
  {
    title: "Settings",
    url: "/dashboard",
    icon: <Settings2Icon />,
  },
  {
    title: "FAQ",
    url: "/#faq",
    icon: <CircleHelpIcon />,
  },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="data-[slot=sidebar-menu-button]:p-1.5!"
              render={<Link href="/dashboard" />}
            >
              <LogoMark size={18} />
              <span className="text-base font-semibold">ArcFlow</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
        <NavDocuments />
        <NavSecondary items={navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
