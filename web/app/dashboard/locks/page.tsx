"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";
import { ModuleWorkspace } from "@/components/module-workspace";
import { LockVestDiff } from "@/components/lock-vest-diff";
import { FormSkeleton, ListRowSkeleton, ModulePageSkeleton } from "@/components/page-skeleton";

const CreateLockForm = dynamic(
  () => import("@/components/create-lock-form").then((m) => m.CreateLockForm),
  { loading: () => <FormSkeleton /> },
);

const MyLocksPage = dynamic(() => import("@/components/my-locks"), {
  loading: () => <ListRowSkeleton count={4} />,
});

function LocksWorkspace() {
  return (
    <ModuleWorkspace
      defaultTab="create"
      lead={<LockVestDiff kind="lock" />}
      tabs={[
        { id: "create", label: "Create lock" },
        { id: "positions", label: "My locks" },
      ]}
      panels={{
        create: <CreateLockForm />,
        positions: (
          <MyLocksPage kind="lock" createHref="/dashboard/locks" createLabel="Create lock" />
        ),
      }}
    />
  );
}

export default function DashboardLocksPage() {
  return (
    <Suspense fallback={<ModulePageSkeleton />}>
      <LocksWorkspace />
    </Suspense>
  );
}
