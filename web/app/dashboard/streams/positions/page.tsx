"use client";

import { MyStreamsPanel } from "@/components/my-streams-panel";

export default function DashboardStreamPositionsPage() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6 lg:px-6 min-w-0">
      <MyStreamsPanel />
    </div>
  );
}
