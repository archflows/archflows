"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  BarChart3Icon,
  CheckCircle2Icon,
  CoinsIcon,
  CopyIcon,
  HourglassIcon,
  ShareIcon,
  UsersIcon,
  WalletIcon,
  XCircleIcon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { DashStatCardIcon } from "@/components/dash-stat-card-icon";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatCardsSkeleton, TableRowsSkeleton } from "@/components/skeletons";
import { TxExplorerLink } from "@/components/TxExplorerLink";
import { ContactsWalletGate } from "@/components/contacts/wallet-gate";
import { WithdrawCard } from "@/components/referral/withdraw-card";
import { useReferral } from "@/hooks/useReferral";
import { copyToClipboard } from "@/lib/clipboard";
import { bpsToPercent, formatUsdc, referralLink } from "@/lib/referral";
import { referralTweetText } from "@/lib/referral-share";
import { shorten } from "@/lib/form-time";

const CARD =
  "@container/card dash-stat-card relative h-full overflow-hidden text-base shadow-none ring-0 [--card-spacing:--spacing(3)] sm:[--card-spacing:--spacing(4)]";
const BADGE =
  "h-5 border-[var(--dash-border)] bg-sidebar px-2 text-[0.62rem] font-medium text-white sm:h-6 sm:px-2.5 sm:text-[0.7rem]";

const dateFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

function when(value: string | null | undefined) {
  if (!value) return "—";
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? "—" : dateFmt.format(new Date(ms));
}

function StatusBadge({ status }: { status: "pending" | "paid" | "failed" }) {
  const map = {
    paid: { icon: CheckCircle2Icon, label: "Paid" },
    pending: { icon: HourglassIcon, label: "Sending" },
    failed: { icon: XCircleIcon, label: "Failed" },
  } as const;
  const { icon: Icon, label } = map[status];
  return (
    <Badge variant="outline" className={BADGE}>
      <Icon className="size-3" />
      {label}
    </Badge>
  );
}

export function ReferralPanel() {
  const { data, loading, withdrawing, isConnected, refresh, withdraw } = useReferral();
  const [origin, setOrigin] = useState<string | undefined>(undefined);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const link = useMemo(
    () => (data ? referralLink(data.account.code, origin) : ""),
    [data, origin],
  );

  if (!isConnected) {
    return (
      <div className="contacts-mgmt min-w-0 w-full">
        <ContactsWalletGate title="Referral" nextPath="/dashboard/referral" />
      </div>
    );
  }

  if (!data) {
    return <StatCardsSkeleton count={4} />;
  }

  const { account, rates, totals, referees, earnings, withdrawals, referredBy } = data;
  /** Gross 15% of the fee the referee kept. $10 lock and $15 split. */
  const perStandardLock = (10_000_000n * BigInt(rates.rateBps)) / 10_000n;
  const perSplitLock = (15_000_000n * BigInt(rates.rateBps)) / 10_000n;

  const stats: {
    label: string;
    value: string;
    hint: string;
    icon: LucideIcon;
    badge: ReactNode;
  }[] = [
    {
      label: "Available",
      value: `$${formatUsdc(totals.availableUsdc)}`,
      hint: `Min $${formatUsdc(rates.minWithdrawUsdc)}`,
      icon: WalletIcon,
      badge: (
        <>
          <WalletIcon className="size-3" />
          USDC
        </>
      ),
    },
    {
      label: "Lifetime earned",
      value: `$${formatUsdc(totals.netUsdc)}`,
      hint: `$${formatUsdc(totals.paidUsdc)} paid · $${formatUsdc(totals.platformUsdc)} cut`,
      icon: CoinsIcon,
      badge: `${bpsToPercent(rates.effectiveBps)} net`,
    },
    {
      label: "Referrals",
      value: String(totals.signups),
      hint: `${totals.activated} locked`,
      icon: UsersIcon,
      badge: (
        <>
          <UsersIcon className="size-3" />
          Joined
        </>
      ),
    },
    {
      label: "Fee volume",
      value: `$${formatUsdc(totals.feeVolumeUsdc)}`,
      hint: earnings.length ? "From referred locks" : "No locks yet",
      icon: BarChart3Icon,
      badge: earnings.length ? "Live" : "—",
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className={CARD}>
            <DashStatCardIcon icon={stat.icon} />
            <CardHeader className="gap-1 pb-2 sm:pb-3">
              <CardDescription>{stat.label}</CardDescription>
              <CardTitle className="font-semibold tabular-nums lg:font-bold">
                {stat.value}
              </CardTitle>
              <CardAction>
                <Badge variant="outline" className={BADGE}>
                  {stat.badge}
                </Badge>
              </CardAction>
            </CardHeader>
            <CardContent className="mt-auto pt-0">{stat.hint}</CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="shadow-none ring-0 lg:col-span-2">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <ShareIcon className="size-4 text-primary" />
              Your referral link
            </CardTitle>
            <CardDescription>
              Anyone who opens this link and then creates a lock earns you{" "}
              {bpsToPercent(rates.rateBps)} of the USDC fee they pay — ${" "}
              {formatUsdc(perStandardLock)} on a $10 lock, ${" "}
              {formatUsdc(perSplitLock)} on a $15 split.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 pt-6">
            <div className="flex flex-wrap items-center gap-2">
              <code className="mono dash-well rounded-md px-3 py-2 text-lg font-semibold tracking-[0.2em]">
                {account.code}
              </code>
              <button
                type="button"
                className="btn ghost sm"
                onClick={() => void copyToClipboard(account.code, "Referral code copied")}
              >
                <CopyIcon className="size-3.5" />
                Copy code
              </button>
              {account.tier === "partner" ? (
                <Badge variant="outline" className={BADGE}>
                  Partner tier
                </Badge>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="mono dash-well min-w-0 flex-1 truncate px-3 py-2 text-[0.82rem] text-white/80">
                {link}
              </span>
              <button
                type="button"
                className="btn sm shrink-0"
                onClick={() => void copyToClipboard(link, "Referral link copied")}
              >
                <CopyIcon className="size-3.5" />
                Copy link
              </button>
              <a
                className="btn ghost sm shrink-0"
                href={`https://x.com/intent/tweet?text=${encodeURIComponent(referralTweetText(link))}`}
                target="_blank"
                rel="noreferrer"
              >
                Share on X
              </a>
            </div>

            <dl className="grid grid-cols-2 gap-3 text-[0.8rem] sm:grid-cols-4">
              <div>
                <dt className="text-white/60">Commission</dt>
                <dd className="font-semibold">{bpsToPercent(rates.rateBps)} of fee</dd>
              </div>
              <div>
                <dt className="text-white/60">Platform cut</dt>
                <dd className="font-semibold">{bpsToPercent(rates.platformBps)} of commission</dd>
              </div>
              <div>
                <dt className="text-white/60">You keep</dt>
                <dd className="font-semibold">{bpsToPercent(rates.effectiveBps)} of fee</dd>
              </div>
              <div>
                <dt className="text-white/60">Payout</dt>
                <dd className="font-semibold">Auto-approved</dd>
              </div>
            </dl>

            {referredBy ? (
              <p className="text-[0.78rem] text-white/60">
                You joined through code <span className="mono">{referredBy.code}</span> (
                {shorten(referredBy.wallet)}).
              </p>
            ) : null}
          </CardContent>
        </Card>

        <WithdrawCard
          availableUnits={BigInt(totals.availableUsdc)}
          minUnits={BigInt(rates.minWithdrawUsdc)}
          payoutsEnabled={rates.payoutsEnabled}
          busy={withdrawing}
          onWithdraw={withdraw}
          onDone={refresh}
        />
      </div>

      <Card className="shadow-none ring-0">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2">
            <UsersIcon className="size-4 text-primary" />
            Your referrals
          </CardTitle>
          <CardDescription>
            Wallets bound to your code. They stay yours for every lock they ever create.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 pt-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Wallet</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>First lock</TableHead>
                <TableHead className="text-right">Locks</TableHead>
                <TableHead className="pr-6 text-right">Earned</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && !referees.length ? (
                <TableRowsSkeleton rows={3} cols={5} />
              ) : referees.length ? (
                referees.map((r) => (
                  <TableRow key={r.wallet}>
                    <TableCell className="mono pl-6">{shorten(r.wallet)}</TableCell>
                    <TableCell>{when(r.created_at)}</TableCell>
                    <TableCell>
                      {r.activated_at ? (
                        when(r.activated_at)
                      ) : (
                        <span className="text-white/50">Not yet</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{r.locks}</TableCell>
                    <TableCell className="pr-6 text-right tabular-nums">
                      ${formatUsdc(r.earned_usdc)}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-white/60">
                    No referrals yet. Share your link to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card className="shadow-none ring-0">
          <CardHeader className="border-b">
            <CardTitle>Commission history</CardTitle>
            <CardDescription>
              One entry per create. Commission is paid on the fee arcflows keeps, after any
              split refund.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-0 pt-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Referral</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Locks</TableHead>
                  <TableHead className="text-right">Fee kept</TableHead>
                  <TableHead className="pr-6 text-right">You earned</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {earnings.length ? (
                  earnings.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="mono pl-6">{shorten(e.referee)}</TableCell>
                      <TableCell>{when(e.created_at)}</TableCell>
                      <TableCell className="text-right tabular-nums text-white/70">
                        {e.lock_count}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-white/70">
                        ${formatUsdc(e.fee_usdc)}
                      </TableCell>
                      <TableCell className="pr-6 text-right font-medium tabular-nums">
                        ${formatUsdc(e.net_usdc)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-white/60">
                      No commission yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="shadow-none ring-0">
          <CardHeader className="border-b">
            <CardTitle>Withdrawals</CardTitle>
            <CardDescription>
              Auto-approved and paid straight from the arcflows fee wallet.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-0 pt-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="pr-6 text-right">Tx</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {withdrawals.length ? (
                  withdrawals.map((w) => (
                    <TableRow key={w.id}>
                      <TableCell className="pl-6">{when(w.created_at)}</TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        ${formatUsdc(w.amount_usdc)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={w.status} />
                      </TableCell>
                      <TableCell className="pr-6 text-right">
                        {w.tx_hash ? (
                          <TxExplorerLink hash={w.tx_hash} variant="text">
                            View
                          </TxExplorerLink>
                        ) : (
                          <span className="text-white/50">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="py-10 text-center text-white/60">
                      No withdrawals yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
