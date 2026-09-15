"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";
import { ModuleWorkspace } from "@/components/module-workspace";
import { LockVestDiff } from "@/components/lock-vest-diff";
import { FormSkeleton, ListRowSkeleton, ModulePageSkeleton } from "@/components/page-skeleton";

const CreateVestForm = dynamic(
  () => import("@/components/create-vest-form").then((m) => m.CreateVestForm),
  { loading: () => <FormSkeleton /> },
);

const MyLocksPage = dynamic(() => import("@/components/my-locks"), {
  loading: () => <ListRowSkeleton count={4} />,
});

function VestingWorkspace() {
  return (
    <ModuleWorkspace
      defaultTab="create"
      lead={<LockVestDiff kind="vest" />}
      tabs={[
        { id: "create", label: "Create vest" },
        { id: "positions", label: "My vests" },
      ]}
      panels={{
        create: <CreateVestForm />,
        positions: (
          <MyLocksPage kind="vest" createHref="/dashboard/vesting" createLabel="Create vest" />
        ),
      }}
    />
  );
}

export default function DashboardVestingPage() {
  return (
    <Suspense fallback={<ModulePageSkeleton />}>
      <VestingWorkspace />
    </Suspense>
  );
}
