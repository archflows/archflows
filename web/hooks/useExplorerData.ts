"use client";

import { useEffect, useMemo, useState } from "react";
import { formatUnits, type Hex } from "viem";
import { usePublicClient, useReadContract } from "wagmi";
import { arcFlowAbi, erc20Abi } from "@/lib/abi";
import { fetchArcFlowLogsFromExplorer } from "@/lib/arcflow-logs";
import { ARCFLOW_ADDRESS, EXPLORER_URL, USDC_ADDRESS, USDC_DECIMALS } from "@/lib/chain";
import { ZERO } from "@/lib/form-time";

export type ExplorerKind = "lock" | "claim" | "fee";

export type ExplorerRow = {
  kind: ExplorerKind;
  id: bigint;
  txHash: Hex;
  blockNumber: bigint;
  timestamp: number;
  wallet: `0x${string}`;
  token: `0x${string}`;
  amount: bigint;
  decimals: number;
  symbol: string;
  start?: number;
  end?: number;
};

export type DayBucket = {
  key: string;
  label: string;
  /** UTC day-of-month, e.g. 15 */
  day: number;
  /** UTC month short, e.g. Sept */
  month: string;
  start: number;
  end: number;
  isToday: boolean;
  locks: number;
  claims: number;
  lockVolume: number;
  claimVolume: number;
};

type TokenMeta = { symbol: string; decimals: number };

function dayKey(unix: number) {
  const d = new Date(unix * 1000);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function dayLabel(unix: number) {
  return new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "UTC" }).format(
    new Date(unix * 1000),
  );
}

function monthLabel(unix: number) {
  return new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" }).format(
    new Date(unix * 1000),
  );
}

function monthTitle(year: number, monthIndex: number) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, monthIndex, 1)));
}

function startOfUtcDay(unix: number) {
  const d = new Date(unix * 1000);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) / 1000;
}

function isToday(unix: number, now = Math.floor(Date.now() / 1000)) {
  return dayKey(unix) === dayKey(now);
}

function bucketForDay(start: number, rows: ExplorerRow[], todayStart: number): DayBucket {
  const end = start + 86400;
  const dayLocks = rows.filter((r) => r.kind === "lock" && r.timestamp >= start && r.timestamp < end);
  const dayClaims = rows.filter(
    (r) => r.kind === "claim" && r.timestamp >= start && r.timestamp < end,
  );
  return {
    key: dayKey(start),
    label: dayLabel(start),
    day: new Date(start * 1000).getUTCDate(),
    month: monthLabel(start),
    start,
    end,
    isToday: start === todayStart,
    locks: dayLocks.length,
    claims: dayClaims.length,
    lockVolume: dayLocks.reduce((s, r) => s + Number(formatUnits(r.amount, r.decimals)), 0),
    claimVolume: dayClaims.reduce((s, r) => s + Number(formatUnits(r.amount, r.decimals)), 0),
  };
}

/** Full UTC month grid (Sun–Sat). Leading/trailing cells are null. */
export function buildMonthGrid(
  year: number,
  monthIndex: number,
  rows: ExplorerRow[],
): { title: string; cells: (DayBucket | null)[]; weekdays: string[] } {
  const todayStart = startOfUtcDay(Math.floor(Date.now() / 1000));
  const first = Date.UTC(year, monthIndex, 1) / 1000;
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const lead = new Date(first * 1000).getUTCDay(); // 0 = Sun
  const cells: (DayBucket | null)[] = [];

  for (let i = 0; i < lead; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const start = Date.UTC(year, monthIndex, d) / 1000;
    cells.push(bucketForDay(start, rows, todayStart));
  }
  while (cells.length % 7 !== 0) cells.push(null);

  return {
    title: monthTitle(year, monthIndex),
    cells,
    weekdays: ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"],
  };
}

export function compactNumber(n: number) {
  if (!Number.isFinite(n) || n === 0) return "0";
  return new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);
}

export function formatExplorerAmount(amount: bigint, decimals: number) {
  const raw = Number(formatUnits(amount, decimals));
  if (!Number.isFinite(raw)) return "0";
  if (raw >= 1000) return compactNumber(raw);
  return raw.toLocaleString("en-US", { maximumFractionDigits: 4 });
}

export function useExplorerData() {
  const client = usePublicClient();
  const notDeployed = ARCFLOW_ADDRESS === ZERO;

  const { data: nextId } = useReadContract({
    address: ARCFLOW_ADDRESS,
    abi: arcFlowAbi,
    functionName: "nextId",
    query: { enabled: !notDeployed },
  });

  const [rows, setRows] = useState<ExplorerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (notDeployed) {
      setRows([]);
      setLoading(false);
      setError("Vault not deployed");
      return;
    }

    let live = true;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const logs = await fetchArcFlowLogsFromExplorer();

        const tokenById = new Map<string, `0x${string}`>();
        for (const log of logs) {
          if (log.eventName !== "Locked") continue;
          const id = log.args.id as bigint | undefined;
          const token = log.args.token as `0x${string}` | undefined;
          if (id != null && token) tokenById.set(id.toString(), token);
        }

        const tokenAddrs = [
          ...new Set([
            ...logs
              .filter((l) => l.eventName === "Locked")
              .map((l) => l.args.token as `0x${string}` | undefined)
              .filter((t): t is `0x${string}` => Boolean(t)),
            USDC_ADDRESS,
          ]),
        ];

        const meta = new Map<string, TokenMeta>();
        if (client) {
          const entries = await Promise.all(
            tokenAddrs.map(async (token) => {
              try {
                const [symbol, decimals] = await Promise.all([
                  client.readContract({ address: token, abi: erc20Abi, functionName: "symbol" }),
                  client.readContract({ address: token, abi: erc20Abi, functionName: "decimals" }),
                ]);
                return [token.toLowerCase(), { symbol: String(symbol), decimals: Number(decimals) }] as const;
              } catch {
                return [
                  token.toLowerCase(),
                  { symbol: `${token.slice(0, 6)}…`, decimals: 18 },
                ] as const;
              }
            }),
          );
          for (const [k, v] of entries) meta.set(k, v);
        } else {
          for (const token of tokenAddrs) {
            meta.set(token.toLowerCase(), {
              symbol: token === USDC_ADDRESS ? "USDC" : `${token.slice(0, 6)}…`,
              decimals: token === USDC_ADDRESS ? USDC_DECIMALS : 18,
            });
          }
        }

        const built: ExplorerRow[] = [];

        for (const log of logs) {
          if (log.eventName === "Locked") {
            const id = log.args.id as bigint;
            const token = log.args.token as `0x${string}`;
            const creator = log.args.creator as `0x${string}`;
            const amount = log.args.amount as bigint;
            const m = meta.get(token.toLowerCase()) ?? { symbol: "TOKEN", decimals: 18 };
            built.push({
              kind: "lock",
              id,
              txHash: log.txHash,
              blockNumber: log.blockNumber,
              timestamp: log.timestamp,
              wallet: creator,
              token,
              amount,
              decimals: m.decimals,
              symbol: m.symbol,
              start: log.args.start != null ? Number(log.args.start as bigint) : undefined,
              end: log.args.end != null ? Number(log.args.end as bigint) : undefined,
            });
          } else if (log.eventName === "Claimed") {
            const id = log.args.id as bigint;
            const beneficiary = log.args.beneficiary as `0x${string}`;
            const amount = log.args.amount as bigint;
            const token = tokenById.get(id.toString()) ?? ZERO;
            const m =
              token === ZERO
                ? { symbol: "TOKEN", decimals: 18 }
                : (meta.get(token.toLowerCase()) ?? { symbol: "TOKEN", decimals: 18 });
            built.push({
              kind: "claim",
              id,
              txHash: log.txHash,
              blockNumber: log.blockNumber,
              timestamp: log.timestamp,
              wallet: beneficiary,
              token,
              amount,
              decimals: m.decimals,
              symbol: m.symbol,
            });
          } else if (log.eventName === "FeePaid") {
            const id = log.args.id as bigint;
            const from = log.args.from as `0x${string}`;
            const amount = log.args.amount as bigint;
            built.push({
              kind: "fee",
              id,
              txHash: log.txHash,
              blockNumber: log.blockNumber,
              timestamp: log.timestamp,
              wallet: from,
              token: USDC_ADDRESS,
              amount,
              decimals: USDC_DECIMALS,
              symbol: "USDC",
            });
          }
        }

        built.sort((a, b) => b.timestamp - a.timestamp || Number(b.blockNumber - a.blockNumber));
        if (live) {
          setRows(built);
          setLoading(false);
        }
      } catch (e) {
        if (live) {
          const raw = e instanceof Error ? e.message : "";
          setError(
            !raw || raw === "Failed to fetch" || raw.includes("Failed to fetch")
              ? "Could not load vault activity from Arcscan"
              : raw,
          );
          setRows([]);
          setLoading(false);
        }
      }
    })();

    return () => {
      live = false;
    };
  }, [client, notDeployed]);

  const stats = useMemo(() => {
    const now = Math.floor(Date.now() / 1000);
    const locks = rows.filter((r) => r.kind === "lock");
    const claims = rows.filter((r) => r.kind === "claim");
    const fees = rows.filter((r) => r.kind === "fee");

    const uniqueTokens = new Set(locks.map((r) => r.token.toLowerCase()));
    const uniqueCreators = new Set(locks.map((r) => r.wallet.toLowerCase()));
    const locksToday = locks.filter((r) => isToday(r.timestamp, now));
    const claimsToday = claims.filter((r) => isToday(r.timestamp, now));
    const active = locks.filter((r) => (r.end ?? 0) > now);

    const durations = locks
      .map((r) => (r.end != null && r.start != null ? r.end - r.start : 0))
      .filter((d) => d > 0);
    const avgLockSec =
      durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;

    const feeTotal = fees.reduce((sum, r) => sum + Number(formatUnits(r.amount, r.decimals)), 0);
    const totalLocks = nextId != null ? Math.max(0, Number(nextId) - 1) : locks.length;

    return {
      totalLocks,
      locksToday: locksToday.length,
      uniqueTokens: uniqueTokens.size,
      uniqueCreators: uniqueCreators.size,
      totalClaims: claims.length,
      claimsToday: claimsToday.length,
      activeLocks: active.length,
      avgLockDays: avgLockSec / 86400,
      feeTotalUsdc: feeTotal,
    };
  }, [rows, nextId]);

  const week = useMemo(() => {
    const now = Math.floor(Date.now() / 1000);
    const todayStart = startOfUtcDay(now);
    const buckets: DayBucket[] = [];
    for (let i = 6; i >= 0; i--) {
      const start = todayStart - i * 86400;
      buckets.push(bucketForDay(start, rows, todayStart));
    }
    return buckets;
  }, [rows]);

  return {
    rows,
    loading,
    error,
    stats,
    week,
    explorerUrl: EXPLORER_URL,
    vault: ARCFLOW_ADDRESS,
  };
}
