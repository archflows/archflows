"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";
import { ModuleWorkspace } from "@/components/module-workspace";
import { FormSkeleton, ListRowSkeleton, ModulePageSkeleton } from "@/components/page-skeleton";

const CreateStreamForm = dynamic(
  () => import("@/components/create-stream-form").then((m) => m.CreateStreamForm),
  { loading: () => <FormSkeleton /> },
);
const MyStreamsPanel = dynamic(
  () => import("@/components/my-streams-panel").then((m) => m.MyStreamsPanel),
  { loading: () => <ListRowSkeleton count={4} /> },
);

function StreamsWorkspace() {
  return (
    <ModuleWorkspace
      defaultTab="create"
      tabs={[
        { id: "create", label: "Create" },
        { id: "positions", label: "My streams" },
      ]}
      panels={{
        create: <CreateStreamForm />,
        positions: <MyStreamsPanel />,
      }}
    />
  );
}

export default function DashboardStreamsPage() {
  return (
    <Suspense fallback={<ModulePageSkeleton />}>
      <StreamsWorkspace />
    </Suspense>
  );
}
