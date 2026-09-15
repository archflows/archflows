"use client";

import { AddContactForm } from "@/components/contacts/add-contact-form";

export default function DashboardContactsAddPage() {
  return (
    <div className="flex flex-1 flex-col p-2 md:p-4 lg:px-4 min-w-0">
      <AddContactForm />
    </div>
  );
}
