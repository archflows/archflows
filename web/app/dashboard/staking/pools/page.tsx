"use client";

import { StakePoolPanel } from "@/components/stake-pool-panel";
import { ModuleTabs } from "@/components/module-tabs";

export default function DashboardStakingPoolsPage() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6 lg:px-6">
      <ModuleTabs
        items={[
          { href: "/dashboard/staking", label: "Create pool", exact: true },
          { href: "/dashboard/staking/pools", label: "Stake" },
        ]}
      />
      <div>
        <h2 className="mb-4 text-sm font-medium text-muted-foreground">Stake into a pool</h2>
        <StakePoolPanel />
      </div>
    </div>
  );
}
