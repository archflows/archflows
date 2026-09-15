"use client";

import { CreateVestForm } from "@/components/create-vest-form";
import { ModuleTabs } from "@/components/module-tabs";

export default function DashboardVestingPage() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6 lg:px-6">
      <ModuleTabs
        items={[
          { href: "/dashboard/vesting", label: "Create", exact: true },
          { href: "/dashboard/vesting/positions", label: "My positions" },
        ]}
      />
      <CreateVestForm />
    </div>
  );
}
