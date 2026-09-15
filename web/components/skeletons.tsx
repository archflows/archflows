import { Skeleton } from "@/components/ui/skeleton";

function times(n: number) {
  return Array.from({ length: n }, (_, i) => i);
}

export function MetricRibbonSkeleton({ count = 4 }: { count?: number }) {
  return (
    <>
      {times(count).map((i) => (
        <div key={i} className="sk-metric">
          <Skeleton className="sk-line sk-w-16" />
          <Skeleton className="sk-line sk-h-7 sk-w-20" />
        </div>
      ))}
    </>
  );
}

export function ExplorerFeedSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <ol className="ex-feed" aria-hidden>
      {times(rows).map((i) => (
        <li key={i} className="ex-feed-item">
          <span className="ex-feed-rail">
            <Skeleton className="size-2.5 rounded-full" />
            {i < rows - 1 ? <i className="ex-feed-line" /> : null}
          </span>
          <div className="ex-feed-body sk-stack">
            <div className="sk-row">
              <Skeleton className="sk-line sk-w-16 sk-h-5" />
              <Skeleton className="sk-line sk-w-24" />
            </div>
            <Skeleton className="sk-line sk-h-6 sk-w-36" />
            <div className="sk-row">
              <Skeleton className="sk-line sk-w-20" />
              <Skeleton className="sk-line sk-w-24" />
              <Skeleton className="sk-line sk-w-16" />
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function ExplorerLedgerSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="ex-ledger-list" aria-hidden>
      {times(rows).map((i) => (
        <article key={i} className="ex-ledger-row">
          <Skeleton className="sk-line sk-h-5 sk-w-14" />
          <Skeleton className="sk-line sk-w-10" />
          <Skeleton className="sk-line sk-w-24 hide-mobile" />
          <Skeleton className="sk-line sk-h-5 sk-w-28" />
          <Skeleton className="sk-line sk-w-24 hide-mobile" />
          <Skeleton className="sk-line sk-w-16" />
        </article>
      ))}
    </div>
  );
}

export function WaveSkeleton() {
  return (
    <div className="ex-wave sk-wave" aria-hidden>
      <div className="ex-wave-head">
        <Skeleton className="sk-line sk-h-6 sk-w-40" />
        <Skeleton className="sk-line sk-w-56" />
      </div>
      <Skeleton className="sk-wave-plot" />
      <div className="sk-row" style={{ marginTop: "0.75rem" }}>
        <Skeleton className="sk-line sk-w-24" />
      </div>
      <div className="ex-cal-wrap" style={{ pointerEvents: "none" }}>
        <div className="ex-cal">
          {times(35).map((i) => (
            <div key={i} className="ex-cal-day">
              <Skeleton className="sk-line sk-w-10" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function LockProofSkeleton() {
  return (
    <main className="proof" aria-busy="true" aria-label="Loading lock proof">
      <section className="proof-stage">
        <div className="proof-stage-glow" aria-hidden />
        <div className="shell">
          <div className="proof-nav">
            <Skeleton className="sk-line sk-h-5 sk-w-24" />
          </div>
          <div className="proof-hero">
            <div className="proof-hero-copy sk-stack">
              <Skeleton className="sk-line sk-w-40" />
              <Skeleton className="sk-line sk-h-10 sk-w-56" />
              <Skeleton className="sk-line sk-w-48" />
              <Skeleton className="sk-line sk-h-2 sk-w-full" />
              <Skeleton className="sk-line sk-w-28" />
            </div>
            <div className="proof-hero-card">
              <Skeleton className="sk-og" />
            </div>
          </div>
        </div>
      </section>

      <section className="proof-ribbon">
        <div className="shell proof-ribbon-inner">
          <MetricRibbonSkeleton count={4} />
        </div>
      </section>

      <section className="shell proof-body">
        <div className="proof-split">
          <div className="proof-facts sk-stack">
            <Skeleton className="sk-line sk-h-6 sk-w-36" />
            {times(6).map((i) => (
              <div key={i} className="sk-row" style={{ justifyContent: "space-between" }}>
                <Skeleton className="sk-line sk-w-24" />
                <Skeleton className="sk-line sk-w-32" />
              </div>
            ))}
          </div>
          <div className="proof-tokenomics sk-stack">
            <Skeleton className="sk-line sk-h-6 sk-w-32" />
            <div className="proof-tok-pie">
              <Skeleton className="sk-pie" />
              <div className="sk-stack">
                {times(3).map((i) => (
                  <div key={i} className="sk-row">
                    <Skeleton className="size-2.5 rounded-full" />
                    <Skeleton className="sk-line sk-w-28" />
                    <Skeleton className="sk-line sk-w-16" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export function TableRowsSkeleton({ rows = 5, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <>
      {times(rows).map((r) => (
        <tr key={r} className="border-b border-white/5">
          {times(cols).map((c) => (
            <td key={c} className="px-3 py-3.5">
              <Skeleton className={`sk-line ${c === cols - 2 ? "sk-w-20 ml-auto" : "sk-w-24"}`} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export function StatCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      {times(count).map((i) => (
        <div key={i} className="sk-stat-card">
          <Skeleton className="sk-line sk-w-24" />
          <Skeleton className="sk-line sk-h-8 sk-w-16" />
          <Skeleton className="sk-line sk-w-40" />
          <Skeleton className="sk-line sk-w-28" />
        </div>
      ))}
    </div>
  );
}

export function TokenListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="sk-stack" style={{ padding: "0.5rem 0.65rem" }} aria-hidden>
      {times(rows).map((i) => (
        <div key={i} className="sk-row" style={{ padding: "0.45rem 0" }}>
          <Skeleton className="size-8 rounded-full" />
          <div className="sk-stack" style={{ flex: 1, gap: "0.3rem" }}>
            <Skeleton className="sk-line sk-w-20" />
            <Skeleton className="sk-line sk-w-28" />
          </div>
          <Skeleton className="sk-line sk-w-16" />
        </div>
      ))}
    </div>
  );
}

export function ListPanelSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="sk-stack" style={{ gap: "0.65rem" }} aria-hidden>
      {times(rows).map((i) => (
        <div key={i} className="sk-list-row">
          <Skeleton className="size-9 rounded-lg" />
          <div className="sk-stack" style={{ flex: 1, gap: "0.35rem" }}>
            <Skeleton className="sk-line sk-w-36" />
            <Skeleton className="sk-line sk-w-48" />
          </div>
          <Skeleton className="sk-line sk-h-7 sk-w-20" />
        </div>
      ))}
    </div>
  );
}

export function DashboardRouteSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6" aria-busy="true">
      <Skeleton className="h-8 w-40" />
      <StatCardsSkeleton count={4} />
      <Skeleton className="h-[280px] rounded-xl" />
      <Skeleton className="h-48 rounded-xl" />
    </div>
  );
}
