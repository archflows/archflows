"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookUserIcon, ListIcon, PlusIcon, TagsIcon } from "lucide-react";
import { useContacts } from "@/hooks/useContacts";
import { cn } from "@/lib/utils";

const links = [
  { href: "/dashboard/contacts/add", label: "Add contact", icon: PlusIcon },
  { href: "/dashboard/contacts/list", label: "Contact list", icon: ListIcon },
  { href: "/dashboard/contacts/categories", label: "Category settings", icon: TagsIcon },
];

export function ContactsQuickActionsAside() {
  const pathname = usePathname();
  const { contacts, categories } = useContacts();

  return (
    <div className="panel">
      <div className="panel-head">
        <span className="flex items-center gap-2">
          <BookUserIcon className="size-3.5 text-primary" />
          Contacts
        </span>
      </div>
      <div className="panel-body panel-body--flush-top">
        <nav className="mgmt-nav">
          {links.map((link) => {
            const active = pathname === link.href;
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn("mgmt-nav-link", active && "on")}
              >
                <Icon className="size-3.5 shrink-0" />
                {link.label}
              </Link>
            );
          })}
        </nav>
        <p className="mgmt-aside-foot">
          {contacts.length} contact{contacts.length === 1 ? "" : "s"} · {categories.length} categories
        </p>
      </div>
    </div>
  );
}
