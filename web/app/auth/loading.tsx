import { Skeleton } from "@/components/ui/skeleton";

export default function AuthLoading() {
  return (
    <div className="auth-shell" aria-busy="true">
      <div className="auth-glow" aria-hidden />
      <header className="auth-nav">
        <Skeleton className="h-7 w-36" />
        <Skeleton className="h-4 w-24" />
      </header>
      <main className="auth-main">
        <div className="auth-card sk-stack" style={{ gap: "0.85rem" }}>
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-11 w-full rounded-xl" />
        </div>
      </main>
    </div>
  );
}
