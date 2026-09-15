"use client";

import { ContactsListPanel } from "@/components/contacts/list-panel";

export default function DashboardContactsListPage() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6 lg:px-6 min-w-0">
      <ContactsListPanel />
    </div>
  );
}
