"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, ArrowUpRight, Inbox, Search } from "lucide-react";
import {
  ExplorerFeedSkeleton,
  ExplorerLedgerSkeleton,
  MetricRibbonSkeleton,
  WaveSkeleton,
} from "@/components/skeletons";
import {
  formatExplorerAmount,
  useExplorerData,
  buildMonthGrid,
  type DayBucket,
  type ExplorerKind,
  type ExplorerRow,
} from "@/hooks/useExplorerData";
import { dateFmt, shorten } from "@/lib/form-time";

const PAGE_SIZE = 8;

function kindLabel(kind: ExplorerKind) {
  if (kind === "lock") return "Locked";
  if (kind === "claim") return "Claimed";
  return "Fee";
}

function matchesQuery(row: ExplorerRow, q: string) {
  if (!q) return true;
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  if (/^\d+$/.test(needle) && row.id.toString() === needle) return true;
  if (row.txHash.toLowerCase().includes(needle)) return true;
  if (row.wallet.toLowerCase().includes(needle)) return true;
  if (row.token.toLowerCase().includes(needle)) return true;
  if (row.symbol.toLowerCase().includes(needle)) return true;
  if (`#${row.id}`.includes(needle) || `lock ${row.id}`.includes(needle)) return true;
  return false;
}

function buildWavePath(values: number[], width: number, height: number, pad = 8) {
  const max = Math.max(1, ...values);
  const step = values.length > 1 ? (width - pad * 2) / (values.length - 1) : 0;
  return values
    .map((v, i) => {
      const x = pad + i * step;
      const y = height - pad - (v / max) * (height - pad * 2);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

function FlowWave({
  week,
  month,
  selectedKey,
  onSelectDay,
}: {
  week: DayBucket[];
  month: { title: string; cells: (DayBucket | null)[]; weekdays: string[] };
  selectedKey: string | null;
  onSelectDay: (key: string | null) => void;
}) {
  const w = 520;
  const h = 160;
  const locks = week.map((d) => d.locks);
  const lockPath = buildWavePath(locks, w, h);
  const lockTotal = locks.reduce((a, b) => a + b, 0);

  return (
    <div className="ex-wave">
      <div className="ex-wave-head">
        <h2>Seven-day flow</h2>
        <p>Locks as one continuous pulse on Arc</p>
      </div>
      <svg className="ex-wave-svg" viewBox={`0 0 ${w} ${h}`} role="img" aria-label="7 day lock flow">
        <defs>
          <linearGradient id="ex-lock-stroke" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#0050e0" />
            <stop offset="100%" stopColor="#6ba3ff" />
          </linearGradient>
        </defs>
        <path d={lockPath} fill="none" stroke="url(#ex-lock-stroke)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div className="ex-wave-legend">
        <span>
          <i className="ex-dot-lock" /> Locks · {lockTotal}
        </span>
        <span className="ex-wave-month">{month.title} UTC</span>
      </div>

      <div className="ex-cal-wrap">
        <div className="ex-cal-head" aria-hidden>
          {month.weekdays.map((wd) => (
            <span key={wd}>{wd}</span>
          ))}
        </div>

        <div className="ex-cal" role="listbox" aria-label="Filter locks by date">
          {month.cells.map((d, i) => {
            if (!d) {
              return <div key={`pad-${i}`} className="ex-cal-day is-empty" aria-hidden />;
            }
            const active = selectedKey === d.key;
            return (
              <button
                key={d.key}
                type="button"
                role="option"
                aria-selected={active}
                className={`ex-cal-day${d.isToday ? " is-today" : ""}${active ? " is-active" : ""}${d.locks > 0 ? " has-locks" : ""}`}
                onClick={() => onSelectDay(active ? null : d.key)}
                title={`${d.label} ${d.day} ${d.month} · ${d.locks} lock${d.locks === 1 ? "" : "s"}`}
              >
                <span className="ex-cal-num">{d.day}</span>
                {d.locks > 0 ? <span className="ex-cal-dot" /> : null}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function EmptyData({
  title = "No data",
  hint,
  action,
}: {
  title?: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="ex-empty">
      <span className="ex-empty-icon" aria-hidden>
        <Inbox className="size-5" />
      </span>
      <strong>{title}</strong>
      {hint ? <p>{hint}</p> : null}
      {action}
    </div>
  );
}

export function ExplorerPage() {
  const { rows, loading, error, stats, week, explorerUrl } = useExplorerData();
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [dayKey, setDayKey] = useState<string | null>(null);

  const month = useMemo(() => {
    const n = new Date();
    return buildMonthGrid(n.getUTCFullYear(), n.getUTCMonth(), rows);
  }, [rows]);

  const selectedDay = useMemo(() => {
    if (!dayKey) return null;
    return month.cells.find((d) => d?.key === dayKey) ?? null;
  }, [dayKey, month.cells]);

  const visibleRows = useMemo(
    () => rows.filter((r) => r.kind === "lock"),
    [rows],
  );
  const filtered = useMemo(() => {
    let list = visibleRows.filter((r) => matchesQuery(r, query));
    if (selectedDay) {
      list = list.filter(
        (r) => r.timestamp >= selectedDay.start && r.timestamp < selectedDay.end,
      );
    }
    return list;
  }, [visibleRows, query, selectedDay]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const slice = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);
  const latest = filtered.slice(0, 5);

  return (
    <main className="ex">
      <section className="ex-stage">
        <div className="ex-stage-glow" aria-hidden />
        <div className="ex-stage-arc" aria-hidden />

        <div className="shell">
          <div className="ex-stage-inner">
            <p className="ex-kicker">
              <span className="pulse-dot" />
              Arc Testnet · live vault
            </p>
            <h1>
              Watch the <em>flow</em>
            </h1>
            <p className="ex-lead">
              Every lock on ArcFlows, read from the vault. Public. No login.
            </p>

            <form
              className="ex-find"
              onSubmit={(e) => {
                e.preventDefault();
                setPage(0);
              }}
            >
              <Search className="size-4" aria-hidden />
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(0);
                }}
                placeholder="Find lock ID, wallet, token, or tx hash"
                autoComplete="off"
                spellCheck={false}
                aria-label="Search vault activity"
              />
              {query ? (
                <button
                  type="button"
                  className="ex-find-clear"
                  onClick={() => {
                    setQuery("");
                    setPage(0);
                  }}
                >
                  Clear
                </button>
              ) : null}
            </form>
          </div>
        </div>
      </section>

      <section className="ex-ribbon" aria-label="Vault metrics">
        <div className="shell ex-ribbon-inner">
          {loading ? (
            <MetricRibbonSkeleton count={4} />
          ) : (
            <>
              <div>
                <span>Vault locks</span>
                <strong>{stats.totalLocks}</strong>
              </div>
              <div>
                <span>Still sealed</span>
                <strong>{stats.activeLocks}</strong>
              </div>
              <div>
                <span>Tokens</span>
                <strong>{stats.uniqueTokens}</strong>
              </div>
              <div>
                <span>Avg duration</span>
                <strong>{`${stats.avgLockDays.toFixed(0)}d`}</strong>
              </div>
            </>
          )}
        </div>
      </section>

      <section className="shell ex-body">
        <div className="ex-split">
          <div className="ex-feed-col">
            <header className="ex-col-head">
              <h2>Latest pulse</h2>
              {error ? <span className="ex-status is-warn">{error}</span> : null}
            </header>

            {loading ? (
              <ExplorerFeedSkeleton rows={5} />
            ) : latest.length === 0 ? (
              <EmptyData
                title="No data"
                hint={
                  selectedDay
                    ? `No locks on ${selectedDay.label} ${selectedDay.day} ${selectedDay.month}.`
                    : query
                      ? "Nothing matches this search."
                      : "No vault events yet."
                }
                action={
                  !selectedDay && !query ? (
                    <Link href="/auth" className="ex-empty-link">
                      Create the first lock
                      <ArrowRight className="size-3.5" />
                    </Link>
                  ) : null
                }
              />
            ) : (
              <ol className="ex-feed">
                {latest.map((row, i) => (
                  <li key={`${row.kind}-${row.txHash}-${row.id}`} className="ex-feed-item">
                    <span className="ex-feed-rail" aria-hidden>
                      <i className={`ex-feed-node ex-feed-node-${row.kind}`} />
                      {i < latest.length - 1 ? <i className="ex-feed-line" /> : null}
                    </span>
                    <div className="ex-feed-body">
                      <div className="ex-feed-top">
                        <span className={`ex-kind ex-kind-${row.kind}`}>{kindLabel(row.kind)}</span>
                        <time dateTime={new Date(row.timestamp * 1000).toISOString()}>
                          {row.timestamp ? dateFmt.format(new Date(row.timestamp * 1000)) : "—"}
                        </time>
                      </div>
                      <p className="ex-feed-amount">
                        {formatExplorerAmount(row.amount, row.decimals)}{" "}
                        <em>{row.symbol}</em>
                      </p>
                      <div className="ex-feed-meta">
                        <Link href={`/lock/${row.id}`}>Lock #{row.id.toString()}</Link>
                        <span className="ex-mono">{shorten(row.wallet)}</span>
                        <a href={`${explorerUrl}/tx/${row.txHash}`} target="_blank" rel="noreferrer">
                          Arcscan
                          <ArrowUpRight className="size-3.5" />
                        </a>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>

          {loading ? (
            <WaveSkeleton />
          ) : (
            <FlowWave
              week={week}
              month={month}
              selectedKey={dayKey}
              onSelectDay={(key) => {
                setDayKey(key);
                setPage(0);
              }}
            />
          )}
        </div>

        <div className="ex-ledger">
          <header className="ex-col-head">
            <div>
              <h2>Vault ledger</h2>
              <p>
                {selectedDay
                  ? `${selectedDay.label} ${selectedDay.day} ${selectedDay.month}`
                  : "Lock trail"}
              </p>
            </div>
            <span className="ex-status">
              {loading
                ? "Loading…"
                : `${filtered.length} event${filtered.length === 1 ? "" : "s"}`}
            </span>
          </header>

          {loading ? (
            <ExplorerLedgerSkeleton rows={6} />
          ) : slice.length === 0 ? (
            <EmptyData
              title="No data"
              hint={
                selectedDay
                  ? `No locks on ${selectedDay.label} ${selectedDay.day} ${selectedDay.month}.`
                  : query
                    ? "Nothing matches this search."
                    : "No locks in the ledger yet."
              }
            />
          ) : (
            <div className="ex-ledger-list">
              {slice.map((row) => (
                <article key={`${row.kind}-${row.txHash}-ledger-${row.id}`} className="ex-ledger-row">
                  <span className={`ex-kind ex-kind-${row.kind}`}>{kindLabel(row.kind)}</span>
                  <Link className="ex-mono" href={`/lock/${row.id}`}>
                    #{row.id.toString()}
                  </Link>
                  <span className="ex-mono hide-mobile">{shorten(row.wallet)}</span>
                  <strong>
                    {formatExplorerAmount(row.amount, row.decimals)} {row.symbol}
                  </strong>
                  <time className="hide-mobile">
                    {row.timestamp ? dateFmt.format(new Date(row.timestamp * 1000)) : "—"}
                  </time>
                  <div className="ex-ledger-actions">
                    <a href={`${explorerUrl}/tx/${row.txHash}`} target="_blank" rel="noreferrer">
                      Tx
                      <ArrowUpRight className="size-3.5" />
                    </a>
                    <Link href={`/lock/${row.id}`}>
                      Proof
                      <ArrowRight className="size-3.5" />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}

          <footer className="ex-pager">
            <span>
              {loading || filtered.length === 0
                ? "0"
                : `${safePage * PAGE_SIZE + 1}–${Math.min((safePage + 1) * PAGE_SIZE, filtered.length)}`}{" "}
              / {loading ? "…" : filtered.length}
            </span>
            <div className="ex-pager-btns">
              <button
                type="button"
                className="btn ghost sm"
                disabled={loading || safePage <= 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                Prev
              </button>
              <button
                type="button"
                className="btn ghost sm"
                disabled={loading || safePage >= pageCount - 1}
                onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              >
                Next
              </button>
            </div>
          </footer>
        </div>
      </section>

      <section className="shell ex-close">
        <h2>Seal the next schedule</h2>
        <p>Immutable locks and linear vesting on Arc. Gas in USDC.</p>
        <div className="ex-close-actions">
          <Link className="btn" href="/auth">
            Launch app
            <ArrowRight className="size-4" />
          </Link>
          <Link className="btn ghost" href="/">
            Back home
          </Link>
        </div>
      </section>
    </main>
  );
}
