"use client";

import { CreateLockForm } from "@/components/create-lock-form";

export default function DashboardLocksPage() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6 lg:px-6 min-w-0">
      <CreateLockForm />
    </div>
  );
}
