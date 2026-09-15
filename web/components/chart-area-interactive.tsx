"use client";

import * as React from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAccount } from "wagmi";
import { useLiveStats } from "@/hooks/useLiveStats";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export function ChartAreaInteractive() {
  const isMobile = useIsMobile();
  const [timeRange, setTimeRange] = React.useState("30d");
  const { address } = useAccount();
  const { data: stats } = useLiveStats(address);
  const series = stats?.series ?? [];

  React.useEffect(() => {
    if (isMobile) setTimeRange("7d");
  }, [isMobile]);

  const filteredData = React.useMemo(() => {
    const days = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 90;
    return series.slice(-days);
  }, [series, timeRange]);

  const max = Math.max(1, ...filteredData.map((row) => (row.locks ?? 0) + (row.claims ?? 0)));

  return (
    <Card className="@container/card shadow-none ring-0">
      <CardHeader>
        <CardTitle>Lock activity</CardTitle>
        <CardDescription>
          <span className="hidden @[540px]/card:block">Locks created vs claims</span>
          <span className="@[540px]/card:hidden">Live activity</span>
        </CardDescription>
        <CardAction>
          <div className="hidden items-center gap-1 rounded-lg border border-border p-0.5 @[767px]/card:flex">
            {(
              [
                ["90d", "Last 3 months"],
                ["30d", "Last 30 days"],
                ["7d", "Last 7 days"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={cn(
                  "cursor-pointer rounded-md px-3 py-1 text-sm",
                  timeRange === value
                    ? "bg-muted font-medium text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
                onClick={() => setTimeRange(value)}
              >
                {label}
              </button>
            ))}
          </div>
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
              <SelectValue placeholder="Last 30 days" />
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
        {filteredData.length === 0 ? (
          <div className="flex h-[180px] items-center justify-center text-sm text-white/70">
            No activity in this window yet.
          </div>
        ) : (
          <div className="flex h-[180px] items-end gap-px sm:gap-0.5">
            {filteredData.map((row) => {
              const locks = row.locks ?? 0;
              const claims = row.claims ?? 0;
              const lockH = Math.max(locks ? 6 : 0, Math.round((locks / max) * 160));
              const claimH = Math.max(claims ? 4 : 0, Math.round((claims / max) * 160));
              return (
                <div
                  key={row.date}
                  className="flex min-w-0 flex-1 flex-col justify-end gap-px"
                  title={`${row.date}: ${locks} locks, ${claims} claims`}
                >
                  <div
                    className="w-full rounded-sm bg-white/25"
                    style={{ height: claimH }}
                  />
                  <div
                    className="w-full rounded-sm bg-[#0050e0]"
                    style={{ height: lockH }}
                  />
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
