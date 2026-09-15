"use client";

import { CreateStreamForm } from "@/components/create-stream-form";

export default function DashboardStreamPayrollPage() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6 lg:px-6 min-w-0">
      <CreateStreamForm mode="payroll" />
    </div>
  );
}
