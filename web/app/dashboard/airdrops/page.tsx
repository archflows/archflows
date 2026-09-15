"use client";

import { CreateAirdropForm } from "@/components/create-airdrop-form";

export default function DashboardAirdropsPage() {
  return (
    <div className="flex flex-1 flex-col p-4 md:p-6 lg:px-6">
      <CreateAirdropForm />
    </div>
  );
}
