"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

export function NavMain({
  items,
}: {
  items: {
    title: string;
    url: string;
    icon?: React.ReactNode;
    soon?: boolean;
  }[];
}) {
  const pathname = usePathname();
  const { state } = useSidebar();

  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <SidebarMenu className="gap-1">
          {items.map((item) => {
            const active =
              item.url === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.url);
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  tooltip={
                    state === "collapsed"
                      ? item.soon
                        ? `${item.title} · Coming soon`
                        : item.title
                      : undefined
                  }
                  isActive={active}
                  className="rounded-lg"
                  render={<Link href={item.url} prefetch={false} />}
                >
                  {item.icon}
                  <span>{item.title}</span>
                </SidebarMenuButton>
                {item.soon ? (
                  <SidebarMenuBadge className="text-[10px] font-medium tracking-wide text-muted-foreground">
                    Soon
                  </SidebarMenuBadge>
                ) : null}
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
