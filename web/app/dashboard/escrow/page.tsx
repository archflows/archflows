"use client";

import { CreateEscrowForm, MyEscrowsPanel } from "@/components/create-escrow-form";

export default function DashboardEscrowPage() {
  return (
    <div className="flex flex-1 flex-col gap-8 p-4 md:p-6 lg:px-6">
      <CreateEscrowForm />
      <div className="border-t border-border pt-6">
        <h2 className="mb-4 text-sm font-medium text-muted-foreground">Your deals</h2>
        <MyEscrowsPanel />
      </div>
    </div>
  );
}
