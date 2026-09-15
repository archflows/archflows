"use client";

import { CreateStakingForm } from "@/components/create-staking-form";
import { ModuleTabs } from "@/components/module-tabs";

export default function DashboardStakingPage() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6 lg:px-6">
      <ModuleTabs
        items={[
          { href: "/dashboard/staking", label: "Create pool", exact: true },
          { href: "/dashboard/staking/pools", label: "Stake" },
        ]}
      />
      <CreateStakingForm />
    </div>
  );
}
