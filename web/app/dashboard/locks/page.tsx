"use client";

import { CreateLockForm } from "@/components/create-lock-form";
import { ModuleTabs } from "@/components/module-tabs";

export default function DashboardLocksPage() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6 lg:px-6 min-w-0">
      <ModuleTabs
        items={[
          { href: "/dashboard/locks", label: "Create", exact: true },
          { href: "/dashboard/locks/positions", label: "My positions" },
        ]}
      />
      <CreateLockForm />
    </div>
  );
}
