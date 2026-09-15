"use client";

import * as React from "react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import { useAccount } from "wagmi";

import { useIsMobile } from "@/hooks/use-mobile";
import type { WalletPositionRow } from "@/hooks/useWalletPositions";
import { fetchArcFlowLogsFromExplorer } from "@/lib/arcflow-logs";
import { ARCFLOW_ADDRESS } from "@/lib/chain";
import { ZERO } from "@/lib/form-time";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";

const BRAND = "#6ea8ff";
const MUTED = "#c5d0e0";

const chartConfig = {
  activity: { label: "Activity" },
  locks: { label: "Created", color: BRAND },
  claims: { label: "Claimed", color: MUTED },
} satisfies ChartConfig;

function isoDay(unix: number) {
  const d = new Date(unix * 1000);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function rangeDays(timeRange: string) {
  if (timeRange === "30d") return 30;
  if (timeRange === "7d") return 7;
  return 90;
}

function useClaimedTimestamps(owner?: `0x${string}`) {
  const [times, setTimes] = React.useState<number[]>([]);

  React.useEffect(() => {
    if (!owner || ARCFLOW_ADDRESS === ZERO) {
      setTimes([]);
      return;
    }
    let live = true;
    fetchArcFlowLogsFromExplorer()
      .then((logs) => {
        if (!live) return;
        const needle = owner.toLowerCase();
        setTimes(
          logs
            .filter(
              (log) =>
                log.eventName === "Claimed" &&
                String(log.args.beneficiary ?? "").toLowerCase() === needle,
            )
            .map((log) => log.timestamp)
            .filter((unix) => unix > 0),
        );
      })
      .catch(() => {
        if (live) setTimes([]);
      });
    return () => {
      live = false;
    };
  }, [owner]);

  return times;
}

function buildSeries(
  rows: WalletPositionRow[],
  claimedAt: number[],
  timeRange: string,
) {
  const days = rangeDays(timeRange);
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const start = new Date(today);
  start.setUTCDate(start.getUTCDate() - (days - 1));
  const startSec = Math.floor(start.getTime() / 1000);
  const endSec = Math.floor(today.getTime() / 1000) + 86_400;

  const created = new Map<string, number>();
  const claimed = new Map<string, number>();

  for (const row of rows) {
    const createdAt = Number(row.start);
    if (createdAt >= startSec && createdAt < endSec) {
      const key = isoDay(createdAt);
      created.set(key, (created.get(key) ?? 0) + 1);
    }
  }
  for (const unix of claimedAt) {
    if (unix >= startSec && unix < endSec) {
      const key = isoDay(unix);
      claimed.set(key, (claimed.get(key) ?? 0) + 1);
    }
  }

  const out: { date: string; locks: number; claims: number }[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    const key = isoDay(Math.floor(d.getTime() / 1000));
    out.push({
      date: key,
      locks: created.get(key) ?? 0,
      claims: claimed.get(key) ?? 0,
    });
  }
  return out;
}

export function ChartAreaInteractive({
  rows,
  pending,
}: {
  rows: WalletPositionRow[];
  pending?: boolean;
}) {
  const isMobile = useIsMobile();
  const { address } = useAccount();
  const claimedAt = useClaimedTimestamps(address);
  const [timeRange, setTimeRange] = React.useState("90d");

  React.useEffect(() => {
    if (isMobile) setTimeRange("7d");
  }, [isMobile]);

  const filteredData = React.useMemo(
    () => buildSeries(rows, claimedAt, timeRange),
    [rows, claimedAt, timeRange],
  );
  const hasActivity = filteredData.some((d) => d.locks > 0 || d.claims > 0);

  return (
    <Card className="dash-chart-card @container/card shadow-none ring-0">
      <CardHeader>
        <CardTitle>Lock activity</CardTitle>
        <CardDescription>
          <span className="hidden @[540px]/card:block">
            Locks created vs claimed for this wallet
          </span>
          <span className="@[540px]/card:hidden">This wallet</span>
        </CardDescription>
        <CardAction>
          <ToggleGroup
            multiple={false}
            value={timeRange ? [timeRange] : []}
            onValueChange={(value) => {
              setTimeRange(value[0] ?? "90d");
            }}
            variant="outline"
            className="hidden *:data-[slot=toggle-group-item]:px-4! @[767px]/card:flex"
          >
            <ToggleGroupItem value="90d">Last 3 months</ToggleGroupItem>
            <ToggleGroupItem value="30d">Last 30 days</ToggleGroupItem>
            <ToggleGroupItem value="7d">Last 7 days</ToggleGroupItem>
          </ToggleGroup>
          <Select
            value={timeRange}
            onValueChange={(value) => {
              if (value !== null) setTimeRange(value);
            }}
          >
            <SelectTrigger
              className="flex w-40 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden"
              size="sm"
              aria-label="Select a value"
            >
              <SelectValue placeholder="Last 3 months" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="90d" className="rounded-lg">
                Last 3 months
              </SelectItem>
              <SelectItem value="30d" className="rounded-lg">
                Last 30 days
              </SelectItem>
              <SelectItem value="7d" className="rounded-lg">
                Last 7 days
              </SelectItem>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        {pending ? (
          <div className="h-[250px] animate-pulse rounded-xl bg-muted/40" />
        ) : !hasActivity ? (
          <div className="flex h-[250px] items-center justify-center rounded-xl bg-black/20 text-sm text-white/80">
            No lock activity in this window yet.
          </div>
        ) : (
          <ChartContainer
            config={chartConfig}
            className="aspect-auto h-[250px] w-full [&_.recharts-cartesian-axis-tick_text]:fill-slate-400"
          >
            <AreaChart data={filteredData}>
              <defs>
                <linearGradient id="fillLocks" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={BRAND} stopOpacity={0.55} />
                  <stop offset="100%" stopColor={BRAND} stopOpacity={0.04} />
                </linearGradient>
                <linearGradient id="fillClaims" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={MUTED} stopOpacity={0.28} />
                  <stop offset="100%" stopColor={MUTED} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="rgba(148, 163, 184, 0.14)" />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={32}
                tick={{ fill: "#94a3b8", fontSize: 12 }}
                tickFormatter={(value) => {
                  const date = new Date(`${value}T00:00:00Z`);
                  return date.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    timeZone: "UTC",
                  });
                }}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    labelFormatter={(value) => {
                      return new Date(`${value}T00:00:00Z`).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        timeZone: "UTC",
                      });
                    }}
                    indicator="dot"
                  />
                }
              />
              <Area
                dataKey="claims"
                type="monotone"
                fill="url(#fillClaims)"
                stroke={MUTED}
                strokeWidth={2}
              />
              <Area
                dataKey="locks"
                type="monotone"
                fill="url(#fillLocks)"
                stroke={BRAND}
                strokeWidth={2.5}
              />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
