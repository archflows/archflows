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
import {
  CalendarClockIcon,
  FileCode2Icon,
  LockIcon,
  TrendingDownIcon,
  TrendingUpIcon,
  WalletIcon,
} from "lucide-react";
import { DashStatCardIcon } from "@/components/dash-stat-card-icon";

const ZERO = "0x0000000000000000000000000000000000000000";

const CARD = "@container/card dash-stat-card relative overflow-hidden text-base shadow-none ring-0";

const FOOTER =
  "flex-col items-start gap-1 border-white/8 bg-transparent";

const BADGE =
  "h-6 border-white/25 bg-white/10 px-2.5 text-[0.7rem] text-white backdrop-blur-sm";

export function SectionCards() {
  const { address } = useAccount();
  const notDeployed = ARCFLOW_ADDRESS === ZERO;

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
        <DashStatCardIcon icon={LockIcon} />
        <CardHeader>
          <CardDescription className="text-[0.8rem] font-medium tracking-wide text-muted-foreground">
            Locks created
          </CardDescription>
          <CardTitle className="text-3xl font-semibold tracking-tight tabular-nums">
            {created}
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
          <div className="text-[0.8rem] leading-snug text-muted-foreground">
            On-chain creator index
          </div>
        </CardFooter>
      </Card>

      <Card className={CARD}>
        <DashStatCardIcon icon={WalletIcon} />
        <CardHeader>
          <CardDescription className="text-[0.8rem] font-medium tracking-wide text-muted-foreground">
            Locks receiving
          </CardDescription>
          <CardTitle className="text-3xl font-semibold tracking-tight tabular-nums">
            {receiving}
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
          <div className="text-[0.8rem] leading-snug text-muted-foreground">
            Tokens vesting to this wallet
          </div>
        </CardFooter>
      </Card>

      <Card className={CARD}>
        <DashStatCardIcon icon={CalendarClockIcon} />
        <CardHeader>
          <CardDescription className="text-[0.8rem] font-medium tracking-wide text-muted-foreground">
            Active schedules
          </CardDescription>
          <CardTitle className="text-3xl font-semibold tracking-tight tabular-nums">
            {active}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className={BADGE}>
              <TrendingDownIcon />
              Combined
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className={FOOTER}>
          <div className="line-clamp-1 text-[0.95rem] font-medium">Created + receiving</div>
          <div className="text-[0.8rem] leading-snug text-muted-foreground">
            Total exposure on ArcFlows
          </div>
        </CardFooter>
      </Card>

      <Card className={CARD}>
        <DashStatCardIcon icon={FileCode2Icon} />
        <CardHeader>
          <CardDescription className="text-[0.8rem] font-medium tracking-wide text-muted-foreground">
            Contract
          </CardDescription>
          <CardTitle className="text-3xl font-semibold tracking-tight">
            {notDeployed ? "Pending" : "Live"}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className={BADGE}>
              {notDeployed ? "Setup" : "Ready"}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className={FOOTER}>
          <div className="text-[0.95rem] font-medium">
            {notDeployed ? "Deploy ArcFlows first" : "Arc Testnet"}
          </div>
          {notDeployed ? (
            <div className="text-[0.8rem] leading-snug text-muted-foreground">
              Vault address not set
            </div>
          ) : (
            <a
              href={`${EXPLORER_URL}/address/${ARCFLOW_ADDRESS}`}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-[0.8rem] leading-snug text-white hover:text-white"
            >
              {shorten(ARCFLOW_ADDRESS)}
            </a>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
