"use client";

import type { ReactNode } from "react";
import { EllipsisVerticalIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export const ACTION_BTN =
  "relative z-10 border-white/30 bg-black/60 text-white hover:bg-black/80 hover:text-white";

export type RowActionItem = {
  id: string;
  label: string;
  icon?: ReactNode;
  onSelect?: () => void;
  disabled?: boolean;
  destructive?: boolean;
  hidden?: boolean;
  separatorBefore?: boolean;
};

export function RowActions({
  primary,
  items,
  busy,
}: {
  primary?: ReactNode;
  items: RowActionItem[];
  busy?: boolean;
}) {
  const visible = items.filter((item) => !item.hidden);
  if (!primary && visible.length === 0) return null;

  return (
    <div className="relative z-10 flex shrink-0 flex-wrap items-center justify-end gap-2">
      {primary}
      {visible.length > 0 ? (
        <DropdownMenu>
          <DropdownMenuTrigger
            disabled={busy}
            render={
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={cn(ACTION_BTN, "px-2")}
                aria-label="Actions"
              />
            }
          >
            <EllipsisVerticalIcon className="size-3.5" />
            <span className="sr-only">Actions</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-44">
            {visible.map((item) => (
              <div key={item.id}>
                {item.separatorBefore ? <DropdownMenuSeparator /> : null}
                <DropdownMenuItem
                  disabled={item.disabled || busy}
                  variant={item.destructive ? "destructive" : "default"}
                  onClick={() => {
                    if (item.disabled || busy) return;
                    item.onSelect?.();
                  }}
                >
                  {item.icon}
                  {item.label}
                </DropdownMenuItem>
              </div>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </div>
  );
}
