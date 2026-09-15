"use client";

import { CreateLockForm } from "@/components/create-lock-form";

export default function DashboardCreatePage() {
  return (
    <div className="flex flex-1 flex-col p-4 md:p-6 lg:px-6">
      <CreateLockForm />
    </div>
  );
}
