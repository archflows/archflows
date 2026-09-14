"use client";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ARCFLOW_ADDRESS } from "@/lib/chain";
import { arcFlowAbi } from "@/lib/abi";
import { useAccount, useReadContract } from "wagmi";
import { TrendingUpIcon, TrendingDownIcon } from "lucide-react";

const ZERO = "0x0000000000000000000000000000000000000000";

export function SectionCards() {
  const { address } = useAccount();
  const notDeployed = ARCFLOW_ADDRESS === ZERO;

  const { data: createdCount } = useReadContract({
    address: ARCFLOW_ADDRESS,
    abi: arcFlowAbi,
    functionName: "creatorLockCount",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address && !notDeployed) },
  });
  const { data: receivedCount } = useReadContract({
    address: ARCFLOW_ADDRESS,
    abi: arcFlowAbi,
    functionName: "beneficiaryLockCount",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address && !notDeployed) },
  });

  const created = notDeployed ? "—" : String(Number(createdCount ?? 0n));
  const receiving = notDeployed ? "—" : String(Number(receivedCount ?? 0n));
  const active = notDeployed
    ? "—"
    : String(Number(createdCount ?? 0n) + Number(receivedCount ?? 0n));

  return (
    <div className="grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4 dark:*:data-[slot=card]:bg-card">
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Locks created</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {created}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <TrendingUpIcon />
              Live
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Positions you authored <TrendingUpIcon className="size-4" />
          </div>
          <div className="text-muted-foreground">On-chain creator index</div>
        </CardFooter>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Locks receiving</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {receiving}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <TrendingUpIcon />
              Vesting
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Beneficiary positions <TrendingUpIcon className="size-4" />
          </div>
          <div className="text-muted-foreground">Tokens vesting to this wallet</div>
        </CardFooter>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Active schedules</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {active}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <TrendingDownIcon />
              Combined
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">Created + receiving</div>
          <div className="text-muted-foreground">Total exposure on ArcFlow</div>
        </CardFooter>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Contract</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {notDeployed ? "Pending" : "Live"}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">{notDeployed ? "Setup" : "Ready"}</Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {notDeployed ? "Deploy ArcFlow first" : "Arc Testnet"}
          </div>
          <div className="text-muted-foreground">NEXT_PUBLIC_ARCFLOW_ADDRESS</div>
        </CardFooter>
      </Card>
    </div>
  );
}
