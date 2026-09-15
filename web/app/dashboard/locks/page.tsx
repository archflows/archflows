"use client";

import { CreateLockForm } from "@/components/create-lock-form";
import MyLocksPage from "@/app/app/locks/page";

export default function DashboardLocksPage() {
  return (
    <div className="flex flex-1 flex-col gap-8 p-4 md:p-6 lg:px-6">
      <CreateLockForm />
      <div className="border-t border-border pt-6">
        <h2 className="mb-4 text-sm font-medium text-muted-foreground">Your lock positions</h2>
        <MyLocksPage />
      </div>
    </div>
  );
}
