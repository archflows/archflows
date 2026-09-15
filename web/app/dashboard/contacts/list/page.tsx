"use client";

import { ContactsListPanel } from "@/components/contacts/list-panel";

export default function DashboardContactsListPage() {
  return (
    <div className="flex flex-1 flex-col p-2 md:p-4 lg:px-4 min-w-0">
      <ContactsListPanel />
    </div>
  );
}
