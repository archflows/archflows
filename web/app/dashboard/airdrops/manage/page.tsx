"use client";

import { MyCampaignsPanel } from "@/components/my-campaigns-panel";
import { ModuleTabs } from "@/components/module-tabs";

export default function DashboardAirdropManagePage() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6 lg:px-6">
      <ModuleTabs
        items={[
          { href: "/dashboard/airdrops", label: "Create", exact: true },
          { href: "/dashboard/airdrops/claim", label: "Claim" },
          { href: "/dashboard/airdrops/manage", label: "Manage" },
        ]}
      />
      <div>
        <h2 className="mb-4 text-sm font-medium text-muted-foreground">Your campaigns</h2>
        <MyCampaignsPanel />
      </div>
    </div>
  );
}
