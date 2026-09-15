"use client";

import Link from "next/link";
import { BookUserIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useContacts } from "@/hooks/useContacts";
import { shorten } from "@/lib/form-time";

export function RecentContactsAside({
  limit = 6,
  title = "Recently added",
}: {
  limit?: number;
  title?: string;
}) {
  const { contacts, ready, resolveCategoryLabel } = useContacts();

  const recent = [...contacts]
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, limit);

  return (
    <div className="panel">
      <div className="panel-head">
        <span>{title}</span>
        {contacts.length > limit ? (
          <Link href="/dashboard/contacts/list" className="dim text-xs hover:text-primary">
            View all
          </Link>
        ) : null}
      </div>
      <div className="panel-body panel-body--flush-top">
        {!ready ? (
          <p className="panel-intro" style={{ margin: 0 }}>Loading…</p>
        ) : recent.length === 0 ? (
          <div className="mgmt-empty">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <BookUserIcon className="size-3.5" />
            </span>
            <p>No contacts saved yet.</p>
          </div>
        ) : (
          <div className="mgmt-list">
            {recent.map((contact) => (
              <div key={contact.id} className="mgmt-item">
                <div className="mgmt-item-main">
                  <div className="flex items-center gap-2">
                    <p className="mgmt-item-title truncate">{contact.name}</p>
                    <Badge variant="outline" className="shrink-0 text-[10px]">
                      {resolveCategoryLabel(contact.category)}
                    </Badge>
                  </div>
                  <p className="mgmt-item-meta truncate font-mono">{shorten(contact.wallet)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
