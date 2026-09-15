"use client";

import dynamic from "next/dynamic";
import { SectionCards } from "@/components/section-cards";

const ChartAreaInteractive = dynamic(
  () => import("@/components/chart-area-interactive").then((m) => m.ChartAreaInteractive),
  {
    ssr: false,
    loading: () => <div className="skeleton h-[220px] rounded-xl" />,
  },
);

const ActivityTable = dynamic(
  () => import("@/components/activity-table").then((m) => m.ActivityTable),
  {
    ssr: false,
    loading: () => (
      <div className="mx-4 rounded-xl border border-white/8 bg-black/20 p-4 lg:mx-6">
        <div className="skeleton mb-4 h-4 w-32" />
        <div className="grid gap-3">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="skeleton h-8 w-full rounded-md" />
          ))}
        </div>
      </div>
    ),
  },
);

export default function DashboardPage() {
  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <SectionCards />
        <div className="px-4 lg:px-6">
          <ChartAreaInteractive />
        </div>
        <ActivityTable />
      </div>
    </div>
  );
}
