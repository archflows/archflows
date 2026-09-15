"use client";

import { AddContactForm } from "@/components/contacts/add-contact-form";

export default function DashboardContactsAddPage() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6 lg:px-6 min-w-0">
      <AddContactForm />
    </div>
  );
}
