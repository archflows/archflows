"use client";

import MyLocksPage from "@/components/my-locks";
import { ModuleTabs } from "@/components/module-tabs";

export default function DashboardLockPositionsPage() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6 lg:px-6">
      <ModuleTabs
        items={[
          { href: "/dashboard/locks", label: "Create", exact: true },
          { href: "/dashboard/locks/positions", label: "My positions" },
        ]}
      />
      <div>
        <MyLocksPage createHref="/dashboard/locks" createLabel="Create lock" />
      </div>
    </div>
  );
}
