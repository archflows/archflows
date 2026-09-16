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
import { EXPLORER_URL, FAUCET_URL, isTestnet } from "@/lib/chain";

const links = [
  {
    name: "Arc docs",
    url: "https://docs.arc.io",
    icon: <BookOpenIcon />,
  },
  ...(isTestnet
    ? [
        {
          name: "USDC faucet",
          url: FAUCET_URL,
          icon: <DropletsIcon />,
        },
      ]
    : []),
  {
    name: "Arcscan",
    url: EXPLORER_URL,
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
          <SidebarMenuButton render={<Link href="/" prefetch={false} />}>
            <ExternalLinkIcon />
            <span>Marketing site</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroup>
  );
}
