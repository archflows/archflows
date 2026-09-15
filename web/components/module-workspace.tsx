"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

export type ModuleTab = {
  id: string;
  label: string;
};

type Props = {
  tabs: ModuleTab[];
  defaultTab: string;
  panels: Record<string, ReactNode>;
  lead?: ReactNode;
};

/**
 * Keep the default (create) tab mounted so form state survives. Other tabs
 * unmount when hidden so RPC watches do not keep running in the background.
 */
export function ModuleWorkspace({ tabs, defaultTab, panels, lead }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlTab = searchParams.get("tab");
  const active = tabs.some((t) => t.id === urlTab) ? (urlTab as string) : defaultTab;

  const [mounted, setMounted] = useState<Record<string, boolean>>(() => ({
    [active]: true,
  }));

  useEffect(() => {
    setMounted((prev) => (prev[active] ? prev : { ...prev, [active]: true }));
  }, [active]);

  function select(id: string) {
    setMounted((prev) => ({ ...prev, [id]: true }));
    const params = new URLSearchParams(searchParams.toString());
    if (id === defaultTab) params.delete("tab");
    else params.set("tab", id);
    const q = params.toString();
    router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6 lg:px-6 min-w-0">
      {lead}
      <div
        className={cn("seg", tabs.length === 2 ? "seg-2" : "seg-3")}
        style={{ maxWidth: "28rem" }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={cn("seg-btn", active === tab.id && "on")}
            onClick={() => select(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {tabs.map((tab) => {
        const keepForm = tab.id === defaultTab && mounted[tab.id];
        if (!mounted[tab.id] || (active !== tab.id && !keepForm)) return null;
        return (
          <div
            key={tab.id}
            hidden={active !== tab.id}
            className={active === tab.id ? "min-w-0" : undefined}
          >
            {panels[tab.id]}
          </div>
        );
      })}
    </div>
  );
}
