"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronRightIcon } from "lucide-react";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

export type NavLeaf = {
  title: string;
  url: string;
  items?: NavLeaf[];
};

export type NavItem = {
  title: string;
  url: string;
  icon?: React.ReactNode;
  soon?: boolean;
  /** Expand submenu on first load. Defaults to collapsed. */
  defaultExpanded?: boolean;
  items?: NavLeaf[];
};

function collectUrls(nodes: NavLeaf[] | undefined, into: Set<string>) {
  for (const node of nodes ?? []) {
    into.add(node.url);
    collectUrls(node.items, into);
  }
}

function collectBranchKeys(nodes: NavLeaf[] | undefined, prefix = "", into: string[] = []) {
  for (const node of nodes ?? []) {
    if (!node.items?.length) continue;
    const key = `${prefix}${node.title}`;
    into.push(key);
    collectBranchKeys(node.items, `${key}/`, into);
  }
  return into;
}

function defaultOpenMap(items: NavItem[]) {
  const map: Record<string, boolean> = {};
  for (const item of items) {
    if (!item.items?.length || !item.defaultExpanded) continue;
    map[item.title] = true;
    for (const key of collectBranchKeys(item.items, `${item.title}/`)) {
      map[key] = true;
    }
  }
  return map;
}

function applyActiveExpansion(
  items: NavItem[],
  pathname: string,
  map: Record<string, boolean>,
) {
  const next = { ...map };
  for (const item of items) {
    if (!item.items?.length) continue;
    const active =
      item.items.some((sub) => isBranchActive(pathname, sub)) ||
      pathMatches(pathname, item.url);
    if (!active) continue;
    next[item.title] = true;
    expandActiveBranches(item.items, `${item.title}/`, pathname, next);
  }
  return next;
}

function expandActiveBranches(
  nodes: NavLeaf[],
  prefix: string,
  pathname: string,
  map: Record<string, boolean>,
) {
  for (const node of nodes) {
    if (!node.items?.length) continue;
    const key = `${prefix}${node.title}`;
    if (!isBranchActive(pathname, node)) continue;
    map[key] = true;
    expandActiveBranches(node.items, `${key}/`, pathname, map);
  }
}

function pathMatches(pathname: string, url: string) {
  return pathname === url || pathname.startsWith(`${url}/`);
}

function isBranchActive(pathname: string, node: NavLeaf): boolean {
  if (node.items?.length) {
    return node.items.some((child) => isBranchActive(pathname, child));
  }
  return pathMatches(pathname, node.url);
}

function firstLeafUrl(node: NavLeaf | NavItem): string {
  if (node.items?.length) return firstLeafUrl(node.items[0]!);
  return node.url;
}

function NavSubTree({
  nodes,
  parentUrl,
  depth = 0,
  openMap,
  toggle,
  keyPrefix = "",
}: {
  nodes: NavLeaf[];
  parentUrl: string;
  depth?: number;
  openMap: Record<string, boolean>;
  toggle: (key: string) => void;
  keyPrefix?: string;
}) {
  const pathname = usePathname();

  return (
    <SidebarMenuSub className={cn(depth > 0 && "mx-2 mr-0 border-sidebar-border/70")}>
      {nodes.map((sub) => {
        const key = `${keyPrefix}${sub.title}`;
        const hasNested = Boolean(sub.items?.length);
        const open = hasNested ? Boolean(openMap[key]) : false;
        const leafActive =
          !hasNested &&
          (pathname === sub.url ||
            (sub.url !== parentUrl && pathname.startsWith(`${sub.url}/`)));

        return (
          <SidebarMenuSubItem key={key}>
            <div className="relative flex items-center">
              <SidebarMenuSubButton
                isActive={leafActive}
                className={cn("flex-1 pr-7", hasNested && "font-medium text-sidebar-foreground/80")}
                render={
                  <Link
                    href={hasNested ? firstLeafUrl(sub) : sub.url}
                    prefetch
                  />
                }
              >
                <span>{sub.title}</span>
              </SidebarMenuSubButton>
              {hasNested ? (
                <button
                  type="button"
                  aria-label={open ? `Collapse ${sub.title}` : `Expand ${sub.title}`}
                  aria-expanded={open}
                  className="absolute right-1 flex size-6 items-center justify-center rounded-md text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggle(key);
                  }}
                >
                  <ChevronRightIcon
                    className={cn("size-3.5 transition-transform", open && "rotate-90")}
                  />
                </button>
              ) : null}
            </div>
            {hasNested && open ? (
              <NavSubTree
                nodes={sub.items!}
                parentUrl={sub.url}
                depth={depth + 1}
                openMap={openMap}
                toggle={toggle}
                keyPrefix={`${key}/`}
              />
            ) : null}
          </SidebarMenuSubItem>
        );
      })}
    </SidebarMenuSub>
  );
}

export function NavMain({
  items,
  groupLabel,
}: {
  items: NavItem[];
  groupLabel?: string;
}) {
  const router = useRouter();
  const { state } = useSidebar();
  const pathname = usePathname();
  const [openMap, setOpenMap] = useState<Record<string, boolean>>(() => defaultOpenMap(items));

  useEffect(() => {
    setOpenMap((prev) => applyActiveExpansion(items, pathname, prev));
  }, [items, pathname]);

  useEffect(() => {
    const urls = new Set<string>();
    for (const item of items) {
      if (!item.soon) urls.add(item.url);
      collectUrls(item.items, urls);
    }
    for (const url of urls) router.prefetch(url);
  }, [items, router]);

  function toggle(key: string) {
    setOpenMap((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <SidebarGroup>
      {groupLabel ? <SidebarGroupLabel>{groupLabel}</SidebarGroupLabel> : null}
      <SidebarGroupContent>
        <SidebarMenu className="gap-1">
          {items.map((item) => {
            const hasSub = Boolean(item.items?.length);
            const childActive = item.items?.some((sub) => isBranchActive(pathname, sub));
            const active = hasSub
              ? Boolean(childActive) || pathMatches(pathname, item.url)
              : item.url === "/dashboard"
                ? pathname === "/dashboard"
                : pathMatches(pathname, item.url);

            const open = hasSub && state !== "collapsed" && Boolean(openMap[item.title]);

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
                  isActive={!hasSub && active}
                  className="rounded-lg"
                  render={
                    <Link
                      href={hasSub ? firstLeafUrl(item) : item.url}
                      prefetch
                    />
                  }
                >
                  {item.icon}
                  <span>{item.title}</span>
                </SidebarMenuButton>
                {hasSub && state !== "collapsed" ? (
                  <SidebarMenuAction
                    showOnHover={false}
                    aria-label={open ? `Collapse ${item.title}` : `Expand ${item.title}`}
                    aria-expanded={open}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      toggle(item.title);
                    }}
                  >
                    <ChevronRightIcon
                      className={cn("size-4 transition-transform", open && "rotate-90")}
                    />
                  </SidebarMenuAction>
                ) : null}
                {item.soon ? (
                  <SidebarMenuBadge className="text-[10px] font-medium tracking-wide text-muted-foreground">
                    Soon
                  </SidebarMenuBadge>
                ) : null}
                {hasSub && open ? (
                  <NavSubTree
                    nodes={item.items!}
                    parentUrl={item.url}
                    openMap={openMap}
                    toggle={toggle}
                    keyPrefix={`${item.title}/`}
                  />
                ) : null}
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
