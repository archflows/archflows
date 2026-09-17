"use client";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StatCardsSkeleton } from "@/components/skeletons";
import { ARCFLOW_ADDRESS, EXPLORER_URL } from "@/lib/chain";
import { arcFlowAbi } from "@/lib/abi";
import { shorten } from "@/lib/form-time";
import { useAccount, useReadContract } from "wagmi";
import { CalendarClockIcon, FileCode2Icon, LockIcon, WalletIcon } from "lucide-react";
import { DashStatCardIcon } from "@/components/dash-stat-card-icon";

const ZERO = "0x0000000000000000000000000000000000000000";

const CARD =
  "@container/card dash-stat-card relative h-full overflow-hidden text-base shadow-none ring-0 [--card-spacing:--spacing(3)] sm:[--card-spacing:--spacing(4)]";

const BADGE =
  "h-5 border-white/25 bg-white/10 px-2 text-[0.62rem] font-medium text-white backdrop-blur-sm sm:h-6 sm:px-2.5 sm:text-[0.7rem]";

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
    <div className="grid grid-cols-2 gap-3 px-4 lg:grid-cols-4 lg:px-6">
      <Card className={CARD}>
        <DashStatCardIcon icon={LockIcon} />
        <CardHeader className="gap-1 pb-2 sm:pb-3">
          <CardDescription>Locks created</CardDescription>
          <CardTitle className="font-semibold tabular-nums lg:font-bold">{created}</CardTitle>
          <CardAction>
            <Badge variant="outline" className={BADGE}>
              Live
            </Badge>
          </CardAction>
        </CardHeader>
        <CardContent className="mt-auto pt-0">Created on-chain</CardContent>
      </Card>

      <Card className={CARD}>
        <DashStatCardIcon icon={WalletIcon} />
        <CardHeader className="gap-1 pb-2 sm:pb-3">
          <CardDescription>Locks receiving</CardDescription>
          <CardTitle className="font-semibold tabular-nums lg:font-bold">{receiving}</CardTitle>
          <CardAction>
            <Badge variant="outline" className={BADGE}>
              Vesting
            </Badge>
          </CardAction>
        </CardHeader>
        <CardContent className="mt-auto pt-0">Incoming to this wallet</CardContent>
      </Card>

      <Card className={CARD}>
        <DashStatCardIcon icon={CalendarClockIcon} />
        <CardHeader className="gap-1 pb-2 sm:pb-3">
          <CardDescription>Active schedules</CardDescription>
          <CardTitle className="font-semibold tabular-nums lg:font-bold">{active}</CardTitle>
          <CardAction>
            <Badge variant="outline" className={BADGE}>
              Combined
            </Badge>
          </CardAction>
        </CardHeader>
        <CardContent className="mt-auto pt-0">Created + receiving</CardContent>
      </Card>

      <Card className={CARD}>
        <DashStatCardIcon icon={FileCode2Icon} />
        <CardHeader className="gap-1 pb-2 sm:pb-3">
          <CardDescription>Contract</CardDescription>
          <CardTitle className="font-semibold lg:font-bold">
            {notDeployed ? "Pending" : "Live"}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className={BADGE}>
              {notDeployed ? "Setup" : "Ready"}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardContent className="mt-auto pt-0">
          {notDeployed ? (
            "Vault address not set"
          ) : (
            <a
              href={`${EXPLORER_URL}/address/${ARCFLOW_ADDRESS}`}
              target="_blank"
              rel="noreferrer"
              className="font-mono font-normal text-white/75 hover:text-white"
            >
              {shorten(ARCFLOW_ADDRESS)}
            </a>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
