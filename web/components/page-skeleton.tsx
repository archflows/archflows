import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

export function Bone({
  className,
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return <div className={cn("skeleton", className)} style={style} aria-hidden />;
}

export function ListRowSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-2" aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex items-center gap-4 rounded-xl bg-black/25 px-4 py-3">
          <Bone className="size-9 shrink-0 rounded-lg" />
          <div className="grid flex-1 gap-2">
            <Bone className="h-3.5 w-36 max-w-[70%]" />
            <Bone className="h-2.5 w-48 max-w-[90%]" />
          </div>
          <Bone className="h-8 w-16 shrink-0 rounded-md" />
        </div>
      ))}
    </div>
  );
}

export function TokenListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <ul className="grid gap-1 p-1.5" aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <li key={i} className="flex items-center gap-3 rounded-lg px-3 py-2.5">
          <Bone className="size-8 shrink-0 rounded-md" />
          <div className="grid min-w-0 flex-1 gap-1.5">
            <Bone className="h-3.5 w-20" />
            <Bone className="h-2.5 w-40 max-w-full" />
          </div>
          <Bone className="h-3.5 w-12 shrink-0" />
        </li>
      ))}
    </ul>
  );
}

export function FormSkeleton() {
  return (
    <div className="create-grid" aria-busy="true" aria-label="Loading form">
      <div className="panel">
        <div className="panel-head">
          <Bone className="h-4 w-28" />
          <Bone className="h-5 w-24 rounded-full" />
        </div>
        <div className="panel-body">
          <div className="field">
            <Bone className="h-3 w-16" />
            <Bone className="h-11 w-full rounded-lg" />
          </div>
          <div className="field">
            <Bone className="h-3 w-24" />
            <Bone className="h-11 w-full rounded-lg" />
          </div>
          <div className="field">
            <Bone className="h-3 w-20" />
            <Bone className="h-10 w-full rounded-lg" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Bone className="h-11 rounded-lg" />
            <Bone className="h-11 rounded-lg" />
            <Bone className="h-11 rounded-lg" />
          </div>
          <Bone className="mt-4 h-11 w-full rounded-lg" />
        </div>
      </div>
      <aside>
        <div className="panel">
          <div className="panel-head">
            <Bone className="h-4 w-24" />
          </div>
          <div className="grid gap-0">
            {Array.from({ length: 6 }, (_, i) => (
              <div className="kv" key={i} style={{ padding: "0.7rem 0.9rem" }}>
                <Bone className="h-3 w-16" />
                <Bone className="h-3 w-24" />
              </div>
            ))}
          </div>
        </div>
        <Bone className="h-36 w-full rounded-xl" />
      </aside>
    </div>
  );
}

export function ModulePageSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6 lg:px-6" aria-busy="true">
      <Bone className="h-10 w-full max-w-md rounded-lg" />
      <FormSkeleton />
    </div>
  );
}

export function DashboardHomeSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6" aria-busy="true" aria-label="Loading dashboard">
      <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-4 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="rounded-xl border border-white/8 bg-black/20 p-4">
            <Bone className="mb-4 h-3 w-24" />
            <Bone className="mb-6 h-8 w-16" />
            <Bone className="h-3 w-32" />
          </div>
        ))}
      </div>
      <Bone className="h-[220px] w-full rounded-xl" />
      <div className="rounded-xl border border-white/8 bg-black/20 p-4">
        <Bone className="mb-4 h-4 w-32" />
        <ListRowSkeleton count={5} />
      </div>
    </div>
  );
}

export function DashboardBootSkeleton() {
  return (
    <div
      className="flex min-h-svh bg-background"
      aria-busy="true"
      aria-label="Loading dashboard"
    >
      <div className="hidden w-72 shrink-0 border-r border-white/8 p-4 md:flex md:flex-col">
        <Bone className="mb-8 h-8 w-28" />
        <div className="grid gap-2">
          {Array.from({ length: 7 }, (_, i) => (
            <Bone key={i} className="h-9 w-full rounded-lg" />
          ))}
        </div>
        <div className="mt-auto grid gap-2 pt-8">
          <Bone className="h-10 w-full rounded-lg" />
        </div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-12 items-center justify-between border-b border-white/8 px-4">
          <Bone className="h-7 w-40" />
          <Bone className="h-8 w-28 rounded-lg" />
        </div>
        <div className="dashboard-main flex flex-1 flex-col">
          <ModulePageSkeleton />
        </div>
      </div>
    </div>
  );
}

export function ProofPageSkeleton() {
  return (
    <main className="shell" style={{ maxWidth: "52rem", padding: "2.5rem 0 4rem" }} aria-busy="true">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="grid gap-3">
          <Bone className="h-3 w-40" />
          <Bone className="h-8 w-56" />
        </div>
        <Bone className="h-8 w-32 rounded-lg" />
      </div>
      <div className="panel">
        <div className="panel-body" style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
          <Bone className="size-28 shrink-0 rounded-full" />
          <div className="grid min-w-0 flex-1 gap-3">
            <Bone className="h-3 w-24" />
            <Bone className="h-10 w-48" />
            <Bone className="h-2 w-full rounded-full" />
          </div>
        </div>
      </div>
      <div className="stat-grid stat-grid-2" style={{ marginTop: "1rem" }}>
        {Array.from({ length: 4 }, (_, i) => (
          <div className="stat" key={i}>
            <Bone className="mb-2 h-3 w-20" />
            <Bone className="h-6 w-24" />
          </div>
        ))}
      </div>
      <div className="panel" style={{ marginTop: "1rem" }}>
        <div className="panel-head">
          <Bone className="h-4 w-32" />
        </div>
        {Array.from({ length: 6 }, (_, i) => (
          <div className="kv" key={i}>
            <Bone className="h-3 w-20" />
            <Bone className="h-3 w-36" />
          </div>
        ))}
      </div>
    </main>
  );
}

export function HomePageSkeleton() {
  return (
    <div className="shell" style={{ padding: "3rem 0" }} aria-busy="true" aria-label="Loading">
      <Bone className="mb-4 h-4 w-40" />
      <Bone className="mb-3 h-12 w-[min(28rem,90%)]" />
      <Bone className="mb-8 h-5 w-[min(22rem,80%)]" />
      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(16rem, 1fr))" }}>
        {Array.from({ length: 3 }, (_, i) => (
          <Bone key={i} className="h-40 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
