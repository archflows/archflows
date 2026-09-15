"use client";

import { ClaimAirdropForm } from "@/components/claim-airdrop-form";
import { ModuleTabs } from "@/components/module-tabs";

export default function DashboardAirdropClaimPage() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6 lg:px-6">
      <ModuleTabs
        items={[
          { href: "/dashboard/airdrops", label: "Create", exact: true },
          { href: "/dashboard/airdrops/claim", label: "Claim" },
          { href: "/dashboard/airdrops/manage", label: "Manage" },
        ]}
      />
      <ClaimAirdropForm />
    </div>
  );
}
