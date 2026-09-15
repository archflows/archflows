"use client";

import dynamic from "next/dynamic";
import { SectionCards } from "@/components/section-cards";
import data from "./data.json";

const ChartAreaInteractive = dynamic(
  () =>
    import("@/components/chart-area-interactive").then((m) => m.ChartAreaInteractive),
  {
    ssr: false,
    loading: () => <div className="h-[280px] animate-pulse rounded-xl bg-muted/40" />,
  },
);

const DataTable = dynamic(
  () => import("@/components/data-table").then((m) => m.DataTable),
  {
    ssr: false,
    loading: () => <div className="h-[320px] animate-pulse rounded-xl bg-muted/30" />,
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
        <DataTable data={data} />
      </div>
    </div>
  );
}
