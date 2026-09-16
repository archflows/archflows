"use client";

import { ReferralPanel } from "@/components/referral/referral-panel";

export default function DashboardReferralPage() {
  return (
    <div className="flex flex-1 flex-col p-2 md:p-4 lg:px-4 min-w-0">
      <ReferralPanel />
    </div>
  );
}
