"use client";

import MyLocksPage from "@/components/my-locks";

export default function DashboardLockPositionsPage() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6 lg:px-6 min-w-0">
      <MyLocksPage kind="lock" createHref="/dashboard/locks" createLabel="Create lock" />
    </div>
  );
}
