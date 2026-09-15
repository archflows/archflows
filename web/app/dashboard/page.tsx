"use client";

import dynamic from "next/dynamic";
import { SectionCards } from "@/components/section-cards";
import { HomeLocksTable } from "@/components/home-locks-table";
import { useWalletPositions } from "@/hooks/useWalletPositions";

const ChartAreaInteractive = dynamic(
  () => import("@/components/chart-area-interactive").then((m) => m.ChartAreaInteractive),
  {
    ssr: false,
    loading: () => <div className="skeleton h-[220px] rounded-xl" />,
  },
);

export default function DashboardPage() {
  const { rows, pending } = useWalletPositions();

  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <SectionCards />
        <div className="px-4 lg:px-6">
          <ChartAreaInteractive rows={rows} pending={pending} />
        </div>
<HomeLocksTable rows={rows} pending={pending} />
      </div>
    </div>
  );
}
