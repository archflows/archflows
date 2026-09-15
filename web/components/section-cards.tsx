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
import { StatCardsSkeleton } from "@/components/skeletons";
import { ARCFLOW_ADDRESS, EXPLORER_URL } from "@/lib/chain";
import { arcFlowAbi } from "@/lib/abi";
import { shorten } from "@/lib/form-time";
import { useAccount, useReadContract } from "wagmi";
import { EXPLORER_URL as _EXPLORER_URL } from "@/lib/chain";
import { useLiveConfig, useLiveStats } from "@/hooks/useLiveStats";
import { useAccount as useWagmiAccount } from "wagmi";
import { TrendingDownIcon, TrendingUpIcon } from "lucide-react";
import { Bone } from "@/components/page-skeleton";

const CARD = "@container/card dash-stat-card relative overflow-hidden text-base shadow-none ring-0";
const FOOTER = "flex-col items-start gap-1 border-white/8 bg-transparent";
const BADGE = "h-6 border-white/15 bg-black/30 px-2.5 text-[0.7rem] text-white";

export function SectionCards() {
  const { address } = useAccount();
  const { data: apiConfig } = useLiveConfig();
  const { data: stats, isLoading } = useLiveStats(address);
  const contracts = (apiConfig as { contracts?: { lock?: string } } | null)?.contracts;
  const lockAddr = contracts?.lock;

  const { data: createdCount, isPending: createdPending } = useReadContract({
    address: ARCFLOW_ADDRESS,
    abi: arcFlowAbi,
    functionName: "creatorLockCount",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address && !notDeployed) },
  });
  const { data: receivedCount, isPending: receivedPending } = useReadContract({
    address: ARCFLOW_ADDRESS,
    abi: arcFlowAbi,
    functionName: "beneficiaryLockCount",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address && !notDeployed) },
  });

  const countsPending = Boolean(address && !notDeployed && (createdPending || receivedPending));

  if (countsPending) {
    return <StatCardsSkeleton count={4} />;
  }

  const created = notDeployed ? "—" : String(Number(createdCount ?? 0n));
  const receiving = notDeployed ? "—" : String(Number(receivedCount ?? 0n));
  const active = notDeployed
    ? "—"
    : String(Number(createdCount ?? 0n) + Number(receivedCount ?? 0n));

  return (
    <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      <Card className={CARD}>
        <CardHeader>
          <CardDescription className="text-[0.8rem] font-medium tracking-wide text-white">
            Locks created
          </CardDescription>
          <CardTitle className="text-3xl font-semibold tracking-tight tabular-nums">
            {isLoading && !stats ? <Bone className="h-8 w-16" /> : dash(created)}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className={BADGE}>
              <TrendingUpIcon />
              Live
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className={FOOTER}>
          <div className="line-clamp-1 flex items-center gap-2 text-[0.95rem] font-medium">
            Positions you authored <TrendingUpIcon className="size-4 shrink-0" />
          </div>
          <div className="text-[0.8rem] leading-snug text-white">Locks you created</div>
        </CardFooter>
      </Card>

      <Card className={CARD}>
        <CardHeader>
          <CardDescription className="text-[0.8rem] font-medium tracking-wide text-white">
            Locks receiving
          </CardDescription>
          <CardTitle className="text-3xl font-semibold tracking-tight tabular-nums">
            {isLoading && !stats ? <Bone className="h-8 w-16" /> : dash(receiving)}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className={BADGE}>
              <TrendingUpIcon />
              Vesting
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className={FOOTER}>
          <div className="line-clamp-1 flex items-center gap-2 text-[0.95rem] font-medium">
            Beneficiary positions <TrendingUpIcon className="size-4 shrink-0" />
          </div>
          <div className="text-[0.8rem] leading-snug text-white">Locks sent to you</div>
        </CardFooter>
      </Card>

      <Card className={CARD}>
        <CardHeader>
          <CardDescription className="text-[0.8rem] font-medium tracking-wide text-white">
            Protocol records
          </CardDescription>
          <CardTitle className="text-3xl font-semibold tracking-tight tabular-nums">
            {isLoading && !stats ? <Bone className="h-8 w-16" /> : dash(protocol)}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className={BADGE}>
              <TrendingDownIcon />
              Indexed
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className={FOOTER}>
          <div className="line-clamp-1 text-[0.95rem] font-medium">Locks · streams · campaigns</div>
          <div className="text-[0.8rem] leading-snug text-white">
{stats
              ? `${stats.totals.locks} locks · ${stats.totals.streams} streams · ${stats.totals.campaigns} airdrops`
              : "Live protocol totals"}
          </div>
        </CardFooter>
      </Card>

      <Card className={CARD}>
        <CardHeader>
          <CardDescription className="text-[0.8rem] font-medium tracking-wide text-white">
            Status
          </CardDescription>
          <CardTitle className="text-3xl font-semibold tracking-tight">
            {isLoading && !stats ? <Bone className="h-8 w-24" /> : apiLive ? "Online" : "Offline"}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className={BADGE}>
              {apiLive ? "Ready" : "Wait"}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className={FOOTER}>
<div className="text-[0.95rem] font-medium">Service health</div>
          {lockAddr ? (
            <a
              href={`${EXPLORER_URL}/address/${lockAddr}`}
              target="_blank"
              rel="noreferrer"
              className="text-[0.8rem] leading-snug text-white hover:text-white"
            >
              View lock contract
            </a>
          ) : (
            <div className="text-[0.8rem] leading-snug text-white">Connecting…</div>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
