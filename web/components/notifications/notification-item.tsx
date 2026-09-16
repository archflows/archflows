"use client";

import {
  ChevronRightIcon,
  CoinsIcon,
  GiftIcon,
  HandshakeIcon,
  LockIcon,
  TrendingUpIcon,
  UsersIcon,
  WavesIcon,
} from "lucide-react";
import type { AppNotification, NotificationModule } from "@/lib/notifications";
import { relativeTime } from "@/lib/notifications";
import { cn } from "@/lib/utils";

const MODULE_ICON: Record<NotificationModule, typeof LockIcon> = {
  lock: LockIcon,
  vest: TrendingUpIcon,
  stream: WavesIcon,
  airdrop: GiftIcon,
  escrow: HandshakeIcon,
  staking: CoinsIcon,
  referral: UsersIcon,
};

const MODULE_LABEL: Record<NotificationModule, string> = {
  lock: "Lock",
  vest: "Vest",
  stream: "Stream",
  airdrop: "Airdrop",
  escrow: "Escrow",
  staking: "Staking",
  referral: "Referral",
};

export function NotificationModuleIcon({
  module,
  className,
}: {
  module: NotificationModule;
  className?: string;
}) {
  const Icon = MODULE_ICON[module];
  return <Icon className={cn("size-3.5 shrink-0", className)} aria-hidden />;
}

export function NotificationListItem({
  item,
  unread,
  active,
  compact,
  interactive = true,
  onSelect,
}: {
  item: AppNotification;
  unread?: boolean;
  active?: boolean;
  compact?: boolean;
  interactive?: boolean;
  onSelect?: () => void;
}) {
  return (
    <div
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={interactive ? onSelect : undefined}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect?.();
              }
            }
          : undefined
      }
      className={cn(
        "notif-card",
        compact && "notif-card-compact",
        active && "notif-card-active",
        unread && "notif-card-unread",
      )}
    >
      <span className="notif-item-icon" data-module={item.module}>
        <NotificationModuleIcon module={item.module} />
      </span>

      <span className="notif-card-body">
        <span className="notif-card-top">
          <span className="notif-card-title">{item.title}</span>
          <span className="notif-card-time">{relativeTime(item.timestamp)}</span>
        </span>
        <span className="notif-card-desc">{item.description}</span>
        {!compact ? (
          <span className="notif-card-meta">
            <span className="notif-pill" data-module={item.module}>{MODULE_LABEL[item.module]}</span>
            {item.kind === "action" ? <span className="notif-pill notif-pill-action">Action</span> : null}
          </span>
        ) : null}
      </span>

      {interactive ? (
        <ChevronRightIcon className="notif-card-chevron size-3.5 shrink-0" aria-hidden />
      ) : unread ? (
        <span className="notif-unread-dot" aria-hidden />
      ) : null}
    </div>
  );
}
