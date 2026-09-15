"use client";

import { AccountPanel } from "@/components/account-panel";

export default function DashboardAccountPage() {
  return (
    <div className="flex flex-1 flex-col p-2 md:p-4 lg:px-4 min-w-0">
      <AccountPanel />
    </div>
  );
}
