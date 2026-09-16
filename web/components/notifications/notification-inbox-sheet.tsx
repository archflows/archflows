"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeftIcon, BellIcon, ExternalLinkIcon } from "lucide-react";
import type { AppNotification, NotificationKind } from "@/lib/notifications";
import { groupByDate, relativeTime } from "@/lib/notifications";
import { dateFmt } from "@/lib/form-time";
import { NotificationListItem, NotificationModuleIcon } from "@/components/notifications/notification-item";
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type Filter = "all" | NotificationKind;

const FILTER_LABEL: Record<Filter, string> = {
  all: "All",
  action: "Action",
  activity: "Activity",
};

export function NotificationInboxSheet({
  open,
  onOpenChange,
  notifications,
  pending,
  selectedId,
  onSelectId,
  isRead,
  markRead,
  markAllRead,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notifications: AppNotification[];
  pending?: boolean;
  selectedId?: string | null;
  onSelectId: (id: string | null) => void;
  isRead: (id: string) => boolean;
  markRead: (id: string) => void;
  markAllRead: () => void;
}) {
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = useMemo(() => {
    if (filter === "all") return notifications;
    return notifications.filter((n) => n.kind === filter);
  }, [filter, notifications]);

  const selected = useMemo(
    () => notifications.find((n) => n.id === selectedId) ?? null,
    [notifications, selectedId],
  );

  const unreadCount = useMemo(
    () => notifications.filter((n) => !isRead(n.id)).length,
    [notifications, isRead],
  );

  useEffect(() => {
    if (!open) {
      onSelectId(null);
      setFilter("all");
    }
  }, [open, onSelectId]);

  useEffect(() => {
    if (selectedId && !filtered.some((n) => n.id === selectedId)) {
      onSelectId(null);
    }
  }, [filtered, onSelectId, selectedId]);

  const groups = groupByDate(filtered);
  const showDetail = Boolean(selected);

  function selectItem(item: AppNotification) {
    onSelectId(item.id);
    markRead(item.id);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="notif-sheet flex h-full w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-[22rem]"
      >
        {showDetail && selected ? (
          <div className="notif-detail-view">
            <div className="notif-sheet-toolbar">
              <button type="button" className="notif-back-btn" onClick={() => onSelectId(null)}>
                <ArrowLeftIcon className="size-3.5" />
                Back
              </button>
            </div>

            <div className="notif-sheet-scroll flex min-h-0 flex-1 flex-col">
              <div className="notif-detail-hero" data-module={selected.module}>
                <span className="notif-item-icon notif-item-icon-lg" data-module={selected.module}>
                  <NotificationModuleIcon module={selected.module} className="size-4" />
                </span>
                <div className="notif-detail-hero-meta">
                  <span className="notif-pill" data-module={selected.module}>{selected.module}</span>
                  {selected.kind === "action" ? (
                    <span className="notif-pill notif-pill-action">Action</span>
                  ) : null}
                </div>
                <h3 className="notif-detail-title">{selected.title}</h3>
                <p className="notif-detail-lead">{selected.description}</p>
                <p className="notif-detail-time">
                  {relativeTime(selected.timestamp)} ·{" "}
                  {dateFmt.format(new Date(selected.timestamp * 1000))}
                </p>
              </div>

              {selected.details.length > 0 ? (
                <div className="notif-detail-panel">
                  <div className="notif-detail-panel-title">Details</div>
                  {selected.details.map((field) => (
                    <div key={`${field.label}:${field.value}`} className="notif-detail-row">
                      <span className="notif-detail-label">{field.label}</span>
                      {field.href ? (
                        <a
                          href={field.href}
                          target="_blank"
                          rel="noreferrer"
                          className="notif-detail-value notif-detail-link"
                        >
                          {field.value}
                          <ExternalLinkIcon className="size-3" />
                        </a>
                      ) : (
                        <span className="notif-detail-value">{field.value}</span>
                      )}
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="notif-detail-foot">
                <Link
                  href={selected.href}
                  className="btn sm w-full justify-center"
                  onClick={() => onOpenChange(false)}
                >
                  {selected.ctaLabel}
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="notif-list-view">
            <div className="notif-sheet-hero">
              <div className="notif-sheet-hero-row">
                <span className="notif-sheet-hero-icon">
                  <BellIcon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="notif-sheet-title">Notifications</h2>
                    {unreadCount > 0 ? (
                      <span className="notif-sheet-count">{unreadCount}</span>
                    ) : null}
                  </div>
                  <p className="notif-sheet-subtitle">Locks, streams, claims &amp; more</p>
                </div>
                {notifications.length > 0 ? (
                  <button type="button" className="notif-mark-read" onClick={markAllRead}>
                    Clear
                  </button>
                ) : null}
              </div>

              <div className="notif-segment" role="tablist" aria-label="Filter notifications">
                {(["all", "action", "activity"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    role="tab"
                    aria-selected={filter === tab}
                    onClick={() => setFilter(tab)}
                    className={cn("notif-segment-btn", filter === tab && "notif-segment-btn-active")}
                  >
                    {FILTER_LABEL[tab]}
                  </button>
                ))}
              </div>
            </div>

            <div className="notif-sheet-scroll min-h-0 flex-1 overflow-y-auto">
              {pending ? (
                <div className="notif-skeleton-list">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="skeleton notif-skeleton-card" />
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div className="notif-empty">
                  <span className="notif-empty-icon">
                    <BellIcon className="size-4" />
                  </span>
                  <p className="notif-empty-title">All caught up</p>
                  <p className="notif-empty-desc">
                    {filter === "all"
                      ? "New activity from your positions will appear here."
                      : `No ${filter} items right now.`}
                  </p>
                </div>
              ) : (
                <div className="notif-groups">
                  {groups.map((group) => (
                    <section key={group.label} className="notif-group">
                      <div className="notif-group-label">{group.label}</div>
                      <div className="notif-group-list">
                        {group.items.map((item) => (
                          <NotificationListItem
                            key={item.id}
                            item={item}
                            unread={!isRead(item.id)}
                            active={item.id === selectedId}
                            onSelect={() => selectItem(item)}
                          />
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
