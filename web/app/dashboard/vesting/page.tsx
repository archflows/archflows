"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";
import { ModuleWorkspace } from "@/components/module-workspace";

const CreateVestForm = dynamic(
  () => import("@/components/create-vest-form").then((m) => m.CreateVestForm),
  { loading: () => <div className="h-72 animate-pulse rounded-xl bg-muted/40" /> },
);

const MyLocksPage = dynamic(() => import("@/components/my-locks"), {
  loading: () => <div className="h-56 animate-pulse rounded-xl bg-muted/40" />,
});

function VestingWorkspace() {
  return (
    <ModuleWorkspace
      defaultTab="create"
      tabs={[
        { id: "create", label: "Create" },
        { id: "positions", label: "My positions" },
      ]}
      panels={{
        create: <CreateVestForm />,
        positions: (
          <MyLocksPage createHref="/dashboard/vesting" createLabel="Create vest" />
        ),
      }}
    />
  );
}

export default function DashboardVestingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 flex-col gap-6 p-4 md:p-6 lg:px-6">
          <div className="h-10 w-64 animate-pulse rounded-md bg-muted/50" />
          <div className="h-72 animate-pulse rounded-xl bg-muted/40" />
        </div>
      }
    >
      <VestingWorkspace />
    </Suspense>
  );
}
