import { Skeleton } from "@/components/ui/skeleton";
import {
  ExplorerFeedSkeleton,
  ExplorerLedgerSkeleton,
  MetricRibbonSkeleton,
  WaveSkeleton,
} from "@/components/skeletons";

export default function ExplorerLoading() {
  return (
    <main className="ex" aria-busy="true" aria-label="Loading explorer">
      <section className="ex-stage">
        <div className="shell">
          <div className="ex-stage-inner sk-stack">
            <Skeleton className="sk-line sk-w-40" />
            <Skeleton className="sk-line sk-h-10 sk-w-56" />
            <Skeleton className="sk-line sk-w-48" />
            <Skeleton className="h-11 max-w-[420px] rounded-full" />
          </div>
        </div>
      </section>
      <section className="ex-ribbon">
        <div className="shell ex-ribbon-inner">
          <MetricRibbonSkeleton count={4} />
        </div>
      </section>
      <section className="shell ex-body">
        <div className="ex-split">
          <div className="ex-feed-col">
            <header className="ex-col-head">
              <h2>Latest pulse</h2>
            </header>
            <ExplorerFeedSkeleton rows={5} />
          </div>
          <WaveSkeleton />
        </div>
        <div className="ex-ledger">
          <header className="ex-col-head">
            <div>
              <h2>Vault ledger</h2>
              <p>Lock trail</p>
            </div>
          </header>
          <ExplorerLedgerSkeleton rows={6} />
        </div>
      </section>
    </main>
  );
}
