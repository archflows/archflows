"use client";

import { useState } from "react";
import { BellIcon } from "lucide-react";
import { NotificationInboxSheet } from "@/components/notifications/notification-inbox-sheet";
import { Button } from "@/components/ui/button";
import { useNotifications } from "@/hooks/useNotifications";
import { cn } from "@/lib/utils";

export function NotificationBell() {
  const {
    address,
    notifications,
    unreadCount,
    pending,
    isRead,
    markRead,
    markAllRead,
  } = useNotifications();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled={!address}
        className="relative text-white/85 hover:text-white"
        aria-label="Notifications"
        onClick={() => {
          setSelectedId(null);
          setSheetOpen(true);
        }}
      >
        <span className="notif-bell-wrap">
          <BellIcon className="size-5" strokeWidth={2} />
          {unreadCount > 0 ? (
            <span
              className={cn(
                "notif-bell-dot",
                unreadCount > 1 && "notif-bell-dot-count",
              )}
              aria-hidden
            >
              {unreadCount > 9 ? "9+" : unreadCount > 1 ? unreadCount : ""}
            </span>
          ) : null}
        </span>
      </Button>

      <NotificationInboxSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        notifications={notifications}
        pending={pending}
        selectedId={selectedId}
        onSelectId={setSelectedId}
        isRead={isRead}
        markRead={markRead}
        markAllRead={markAllRead}
      />
    </>
  );
}
