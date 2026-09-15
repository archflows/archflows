"use client";

import Link from "next/link";
import { useAccount } from "wagmi";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useLiveStats } from "@/hooks/useLiveStats";
import { formatAmount, formatUnlock, moduleLabel, shortenAddr } from "@/lib/live-format";
import { TxExplorerLink } from "@/components/TxExplorerLink";
import { activityProofPath } from "@/lib/proof";
import { Bone } from "@/components/page-skeleton";

export function ActivityTable() {
  const { address } = useAccount();
  const { data: stats, isLoading } = useLiveStats(address);
  const rows = stats?.activity ?? [];

  return (
    <Card className="mx-4 shadow-none ring-0 lg:mx-6">
      <CardHeader>
        <CardTitle>Live activity</CardTitle>
        <CardDescription>Recent locks, streams, and campaigns</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Module</TableHead>
              <TableHead>Id</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Wallet</TableHead>
              <TableHead>Unlock</TableHead>
              <TableHead>Explorer</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && !stats ? (
              Array.from({ length: 5 }, (_, i) => (
                <TableRow key={`sk-${i}`}>
                  {Array.from({ length: 7 }, (_, j) => (
                    <TableCell key={j}>
                      <Bone className="h-3.5 w-full max-w-24" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : null}
            {!isLoading && rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-muted-foreground">
                  No indexed activity yet. Create a lock, stream, or campaign.
                </TableCell>
              </TableRow>
            ) : null}
            {rows.map((row) => {
              const href = activityProofPath(row);
              const lockHash = row.tx_hash;
              const unlockHash = row.unlock_tx_hash;
              const same =
                Boolean(lockHash && unlockHash) &&
                lockHash!.toLowerCase() === unlockHash!.toLowerCase();
              return (
                <TableRow key={`${row.module}-${row.id}`}>
                  <TableCell>
                    <Badge variant="outline">
                      {row.module === "lock" && row.subtype === "vest"
                        ? "Vest"
                        : moduleLabel(row.module)}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono">
                    {href ? (
                      <Link href={href} className="hover:underline">
                        #{row.id}
                      </Link>
                    ) : (
                      `#${row.id}`
                    )}
                  </TableCell>
                  <TableCell className="capitalize">{row.subtype}</TableCell>
                  <TableCell className="tabular-nums">{formatAmount(row.amount)}</TableCell>
                  <TableCell className="font-mono">{shortenAddr(row.wallet)}</TableCell>
                  <TableCell>{formatUnlock(row.end_at)}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1.5">
                      <TxExplorerLink hash={same ? undefined : lockHash}>
                        {row.module === "lock" ? "Lock" : "Explorer"}
                      </TxExplorerLink>
                      {row.module === "lock" ? (
                        <TxExplorerLink hash={unlockHash}>Unlock</TxExplorerLink>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
