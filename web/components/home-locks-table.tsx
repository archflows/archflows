"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { formatUnits } from "viem";
import { CircleCheckIcon, LoaderIcon, PlusIcon } from "lucide-react";
import type { WalletPositionRow } from "@/hooks/useWalletPositions";
import { shorten } from "@/lib/form-time";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Tab = "all" | "hard" | "vest" | "claimable";

const dateOnly = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

function amountLabel(row: WalletPositionRow) {
  return Number(formatUnits(row.amount, row.decimals)).toLocaleString("en-US", {
    maximumFractionDigits: 4,
  });
}

export function HomeLocksTable({
  rows,
  pending,
}: {
  rows: WalletPositionRow[];
  pending?: boolean;
}) {
  const [tab, setTab] = useState<Tab>("all");

  const counts = useMemo(() => {
    const hard = rows.filter((r) => r.isHardLock).length;
    const vest = rows.filter((r) => !r.isHardLock).length;
    const claimable = rows.filter((r) => r.status === "Ready").length;
    return { hard, vest, claimable };
  }, [rows]);

  const visible = useMemo(() => {
    if (tab === "hard") return rows.filter((r) => r.isHardLock);
    if (tab === "vest") return rows.filter((r) => !r.isHardLock);
    if (tab === "claimable") return rows.filter((r) => r.status === "Ready");
    return rows;
  }, [rows, tab]);

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 lg:px-6">
        <Tabs value={tab} onValueChange={(value) => setTab((value as Tab) ?? "all")}>
          <TabsList className="h-auto flex-wrap bg-transparent p-0">
            <TabsTrigger value="all" className="px-3">
              All locks
            </TabsTrigger>
            <TabsTrigger value="hard" className="px-3">
              Hard locks
              {counts.hard ? (
                <Badge variant="secondary" className="h-5 px-1.5">
                  {counts.hard}
                </Badge>
              ) : null}
            </TabsTrigger>
            <TabsTrigger value="vest" className="px-3">
              Linear vests
              {counts.vest ? (
                <Badge variant="secondary" className="h-5 px-1.5">
                  {counts.vest}
                </Badge>
              ) : null}
            </TabsTrigger>
            <TabsTrigger value="claimable" className="px-3">
              Claimable
              {counts.claimable ? (
                <Badge variant="secondary" className="h-5 px-1.5">
                  {counts.claimable}
                </Badge>
              ) : null}
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={<Link href="/dashboard/locks" />}
        >
          <PlusIcon />
          Create lock
        </Button>
      </div>

      <div className="px-4 lg:px-6">
        <div className="dash-table-wrap overflow-hidden rounded-2xl bg-black/20">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Lock</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Unlock</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Beneficiary</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pending ? (
                Array.from({ length: 5 }, (_, i) => (
                  <TableRow key={`sk-${i}`} className="hover:bg-transparent">
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-18" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Skeleton className="ml-auto h-4 w-20" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Skeleton className="ml-auto h-4 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                  </TableRow>
                ))
              ) : visible.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-white/70">
                    {rows.length === 0
                      ? "No positions for this wallet yet."
                      : "Nothing in this filter."}
                  </TableCell>
                </TableRow>
              ) : (
                visible.map((row) => {
                  const ready = row.status === "Ready" || row.status === "Claimed";
                  return (
                    <TableRow key={row.id.toString()}>
                      <TableCell>
                        <Link
                          href={`/lock/${row.id.toString()}`}
                          className="font-medium text-foreground hover:underline"
                        >
                          #{row.id.toString()}, {row.symbol}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="px-1.5 font-normal text-white">
                          {row.isHardLock ? "Hard lock" : "Linear vest"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="gap-1 px-1.5 font-normal text-white">
                          {ready ? (
                            <CircleCheckIcon className="size-3.5 fill-green-500 dark:fill-green-400" />
                          ) : (
                            <LoaderIcon className="size-3.5" />
                          )}
                          {row.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-white">
                        {dateOnly.format(new Date(Number(row.end) * 1000))}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-white">
                        {amountLabel(row)}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-white">
                        {shorten(row.beneficiary)}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
        {!pending && rows.length > 0 ? (
          <p className="px-1 pt-3 text-xs text-white/55">
            {visible.length} of {rows.length} on-chain position{rows.length === 1 ? "" : "s"}
          </p>
        ) : null}
      </div>
    </div>
  );
}
