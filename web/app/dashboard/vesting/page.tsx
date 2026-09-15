"use client";

import { CreateVestForm } from "@/components/create-vest-form";

export default function DashboardVestingPage() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6 lg:px-6 min-w-0">
      <CreateVestForm />
    </div>
  );
}
