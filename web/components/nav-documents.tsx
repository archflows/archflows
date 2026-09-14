"use client";

import Link from "next/link";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { BookOpenIcon, DropletsIcon, ExternalLinkIcon } from "lucide-react";

const links = [
  {
    name: "Arc docs",
    url: "https://docs.arc.io",
    icon: <BookOpenIcon />,
  },
  {
    name: "USDC faucet",
    url: "https://faucet.circle.com",
    icon: <DropletsIcon />,
  },
  {
    name: "Arcscan",
    url: "https://testnet.arcscan.app",
    icon: <ExternalLinkIcon />,
  },
];

export function NavDocuments() {
  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>Resources</SidebarGroupLabel>
      <SidebarMenu>
        {links.map((item) => (
          <SidebarMenuItem key={item.name}>
            <SidebarMenuButton render={<a href={item.url} target="_blank" rel="noreferrer" />}>
              {item.icon}
              <span>{item.name}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
        <SidebarMenuItem>
          <SidebarMenuButton render={<Link href="/" />}>
            <ExternalLinkIcon />
            <span>Marketing site</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroup>
  );
}
