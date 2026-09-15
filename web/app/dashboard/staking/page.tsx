"use client";

import { CreateStakingForm } from "@/components/create-staking-form";

export default function DashboardStakingPage() {
  return (
    <div className="flex flex-1 flex-col p-4 md:p-6 lg:px-6">
      <CreateStakingForm />
    </div>
  );
}
