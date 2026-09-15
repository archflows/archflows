export default function DashboardLoading() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
      <div className="h-8 w-40 animate-pulse rounded-md bg-muted/60" />
      <div className="h-48 animate-pulse rounded-xl bg-muted/40" />
      <div className="h-32 animate-pulse rounded-xl bg-muted/30" />
    </div>
  );
}
