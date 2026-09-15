"use client";

import { ContactsPanel } from "@/components/contacts-panel";

export default function DashboardContactsPage() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6 lg:px-6 min-w-0">
      <ContactsPanel />
    </div>
  );
}
