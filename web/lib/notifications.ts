import { formatUnits } from "viem";
import type { StoredNotification } from "@/lib/backend";
import type { ArcFlowDecodedLog } from "@/lib/arcflow-logs";
import type { WalletPositionRow } from "@/hooks/useWalletPositions";
import { explorerTxUrl } from "@/lib/chain";
import { dateFmt, shorten } from "@/lib/form-time";
import { proofPath } from "@/lib/proof";

export type NotificationModule =
  | "lock"
  | "vest"
  | "stream"
  | "airdrop"
  | "escrow"
  | "staking"
  | "referral";

export type NotificationKind = "action" | "activity";

export type NotificationDetailField = {
  label: string;
  value: string;
  href?: string;
};

export type AppNotification = {
  id: string;
  module: NotificationModule;
  kind: NotificationKind;
  type: string;
  title: string;
  description: string;
  timestamp: number;
  href: string;
  ctaLabel: string;
  details: NotificationDetailField[];
};

const STORAGE_PREFIX = "arcflows:notifications:read:v1";
const ACTIVITY_WINDOW_SEC = 30 * 24 * 3600;
const UPCOMING_WINDOW_SEC = 48 * 3600;

function readKey(wallet: string) {
  return `${STORAGE_PREFIX}:${wallet.toLowerCase()}`;
}

function storageAvailable() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

export function loadReadIds(wallet?: string): Set<string> {
  if (!wallet || !storageAvailable()) return new Set();
  try {
    const raw = localStorage.getItem(readKey(wallet));
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

export function saveReadIds(wallet: string, ids: Set<string>) {
  if (!storageAvailable()) return;
  localStorage.setItem(readKey(wallet), JSON.stringify([...ids]));
}

export function relativeTime(unix: number): string {
  const diff = Math.max(0, Math.floor(Date.now() / 1000) - unix);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return dateFmt.format(new Date(unix * 1000));
}

function fmtAmount(raw: bigint | string, decimals = 18, symbol = "TOKEN") {
  try {
    const value = typeof raw === "string" ? BigInt(raw) : raw;
    const n = Number(formatUnits(value, decimals));
    const text = n.toLocaleString("en-US", { maximumFractionDigits: 4 });
    return `${text} ${symbol}`;
  } catch {
    return symbol;
  }
}

function fmtUsdc(raw: string) {
  try {
    const cleaned = raw.trim();
    if (!/^\d+$/.test(cleaned)) return "USDC";
    const n = Number(formatUnits(BigInt(cleaned), 6));
    return `${n.toLocaleString("en-US", { maximumFractionDigits: 2 })} USDC`;
  } catch {
    return "USDC";
  }
}

function usdcPositive(raw: string) {
  try {
    const cleaned = raw.trim();
    if (!/^\d+$/.test(cleaned)) return false;
    return BigInt(cleaned) > 0n;
  } catch {
    return false;
  }
}

function tsFrom(raw: unknown): number {
  if (typeof raw === "number") return raw;
  if (typeof raw === "string") {
    const n = Number(raw);
    if (Number.isFinite(n) && n > 1e9) return Math.floor(n);
    const d = Date.parse(raw);
    if (Number.isFinite(d)) return Math.floor(d / 1000);
  }
  return Math.floor(Date.now() / 1000);
}

function withinWindow(ts: number, now: number) {
  return ts >= now - ACTIVITY_WINDOW_SEC;
}

type BackendRow = Record<string, unknown>;

export function buildLockNotifications(
  rows: WalletPositionRow[],
  logs: ArcFlowDecodedLog[],
  wallet: string,
  now = Math.floor(Date.now() / 1000),
): AppNotification[] {
  const out: AppNotification[] = [];
  const needle = wallet.toLowerCase();

  for (const row of rows) {
    const mod: NotificationModule = row.isHardLock ? "lock" : "vest";
    const label = row.isHardLock ? "Lock" : "Vest";
    const id = row.id.toString();
    const amt = fmtAmount(row.claimable > 0n ? row.claimable : row.amount, row.decimals, row.symbol);
    const proof = proofPath("lock", undefined, row.id);
    const baseDetails: NotificationDetailField[] = [
      { label: "Position", value: `#${id}` },
      { label: "Token", value: row.symbol },
      { label: "Amount", value: fmtAmount(row.amount, row.decimals, row.symbol) },
      { label: "Beneficiary", value: shorten(row.beneficiary) },
      { label: "Creator", value: shorten(row.creator) },
      { label: "Unlock", value: dateFmt.format(new Date(Number(row.end) * 1000)) },
    ];

    if (row.status === "Ready" && row.claimable > 0n) {
      out.push({
        id: `lock:claim-ready:${id}`,
        module: mod,
        kind: "action",
        type: "claim_ready",
        title: `${label} #${id} ready to claim`,
        description: `${amt} available now`,
        timestamp: now,
        href: "/dashboard/locks/positions",
        ctaLabel: "Claim now",
        details: [
          ...baseDetails,
          { label: "Claimable", value: amt },
        ],
      });
    }

    if (row.status === "Unlocked") {
      out.push({
        id: `lock:unlocked:${id}`,
        module: mod,
        kind: "action",
        type: "unlocked",
        title: `${label} #${id} fully unlocked`,
        description: "Claim any remaining tokens",
        timestamp: Number(row.end),
        href: "/dashboard/locks/positions",
        ctaLabel: "View position",
        details: baseDetails,
      });
    }

    const cliffSoon = Number(row.cliff) - now;
    const endSoon = Number(row.end) - now;
    if (
      row.status === "Vesting" &&
      cliffSoon > 0 &&
      cliffSoon <= UPCOMING_WINDOW_SEC
    ) {
      out.push({
        id: `lock:cliff-soon:${id}`,
        module: mod,
        kind: "action",
        type: "cliff_soon",
        title: `${label} #${id} cliff approaching`,
        description: `Cliff in ${Math.ceil(cliffSoon / 3600)}h`,
        timestamp: Number(row.cliff),
        href: proof,
        ctaLabel: "View proof",
        details: [
          ...baseDetails,
          { label: "Cliff", value: dateFmt.format(new Date(Number(row.cliff) * 1000)) },
        ],
      });
    }

    if (
      (row.status === "Locked" || row.status === "Vesting") &&
      endSoon > 0 &&
      endSoon <= UPCOMING_WINDOW_SEC
    ) {
      out.push({
        id: `lock:unlock-soon:${id}`,
        module: mod,
        kind: "action",
        type: "unlock_soon",
        title: `${label} #${id} unlocks soon`,
        description: `Unlocks in ${Math.ceil(endSoon / 3600)}h`,
        timestamp: Number(row.end),
        href: proof,
        ctaLabel: "View proof",
        details: baseDetails,
      });
    }
  }

  const lockedByTx = new Map<string, ArcFlowDecodedLog[]>();
  for (const log of logs) {
    if (log.eventName !== "Locked") continue;
    const list = lockedByTx.get(log.txHash) ?? [];
    list.push(log);
    lockedByTx.set(log.txHash, list);
  }

  const seenSplit = new Set<string>();
  for (const log of logs) {
    if (!withinWindow(log.timestamp, now)) continue;

    if (log.eventName === "Locked") {
      const creator = String(log.args.creator ?? "").toLowerCase();
      const beneficiary = String(log.args.beneficiary ?? "").toLowerCase();
      const id = String(log.args.id ?? "");
      const amount = log.args.amount as bigint | undefined;
      const token = String(log.args.token ?? "");
      const splitGroup = lockedByTx.get(log.txHash) ?? [];
      const isSplit = splitGroup.length > 1;

      if (isSplit && creator === needle && !seenSplit.has(log.txHash)) {
        seenSplit.add(log.txHash);
        out.push({
          id: `lock:split:${log.txHash}`,
          module: "lock",
          kind: "activity",
          type: "split_created",
          title: `Split lock created`,
          description: `${splitGroup.length} beneficiaries in one transaction`,
          timestamp: log.timestamp,
          href: proofPath("lock", log.txHash),
          ctaLabel: "View proof",
          details: [
            { label: "Beneficiaries", value: String(splitGroup.length) },
            {
              label: "Transaction",
              value: shorten(log.txHash),
              href: explorerTxUrl(log.txHash),
            },
          ],
        });
        continue;
      }

      if (isSplit) continue;

      if (creator === needle) {
        out.push({
          id: `lock:created:${id}`,
          module: log.args.cliff === log.args.end ? "lock" : "vest",
          kind: "activity",
          type: "created",
          title: `You created ${log.args.cliff === log.args.end ? "lock" : "vest"} #${id}`,
          description: amount ? fmtAmount(amount, 18) : "New position on Arc",
          timestamp: log.timestamp,
          href: proofPath("lock", log.txHash, id),
          ctaLabel: "View proof",
          details: [
            { label: "Position", value: `#${id}` },
            { label: "Beneficiary", value: shorten(String(log.args.beneficiary ?? "")) },
            {
              label: "Transaction",
              value: shorten(log.txHash),
              href: explorerTxUrl(log.txHash),
            },
          ],
        });
      }

      if (beneficiary === needle && creator !== needle) {
        out.push({
          id: `lock:received:${id}`,
          module: log.args.cliff === log.args.end ? "lock" : "vest",
          kind: "activity",
          type: "received",
          title: `New ${log.args.cliff === log.args.end ? "lock" : "vest"} received`,
          description: `From ${shorten(creator)} · #${id}`,
          timestamp: log.timestamp,
          href: proofPath("lock", log.txHash, id),
          ctaLabel: "View proof",
          details: [
            { label: "Position", value: `#${id}` },
            { label: "Creator", value: shorten(creator) },
            {
              label: "Transaction",
              value: shorten(log.txHash),
              href: explorerTxUrl(log.txHash),
            },
          ],
        });
      }
    }

    if (log.eventName === "Claimed") {
      const beneficiary = String(log.args.beneficiary ?? "").toLowerCase();
      const id = String(log.args.id ?? "");
      const amount = log.args.amount as bigint | undefined;
      const pos = rows.find((r) => r.id.toString() === id);

      if (beneficiary === needle) {
        out.push({
          id: `lock:claimed:self:${id}:${log.txHash}`,
          module: pos?.isHardLock ? "lock" : "vest",
          kind: "activity",
          type: "claimed",
          title: `You claimed lock #${id}`,
          description: amount && pos ? fmtAmount(amount, pos.decimals, pos.symbol) : "Tokens claimed",
          timestamp: log.timestamp,
          href: proofPath("lock", log.txHash, id),
          ctaLabel: "View proof",
          details: [
            { label: "Position", value: `#${id}` },
            {
              label: "Transaction",
              value: shorten(log.txHash),
              href: explorerTxUrl(log.txHash),
            },
          ],
        });
      } else if (pos && pos.creator.toLowerCase() === needle) {
        out.push({
          id: `lock:claimed:beneficiary:${id}:${log.txHash}`,
          module: pos.isHardLock ? "lock" : "vest",
          kind: "activity",
          type: "beneficiary_claimed",
          title: `Beneficiary claimed lock #${id}`,
          description: shorten(beneficiary),
          timestamp: log.timestamp,
          href: proofPath("lock", log.txHash, id),
          ctaLabel: "View proof",
          details: [
            { label: "Position", value: `#${id}` },
            { label: "Beneficiary", value: shorten(beneficiary) },
            {
              label: "Transaction",
              value: shorten(log.txHash),
              href: explorerTxUrl(log.txHash),
            },
          ],
        });
      }
    }
  }

  return out;
}

export function buildStreamNotifications(
  sent: BackendRow[],
  received: BackendRow[],
  wallet: string,
  now = Math.floor(Date.now() / 1000),
): AppNotification[] {
  const out: AppNotification[] = [];
  const needle = wallet.toLowerCase();

  for (const row of received) {
    const id = String(row.id ?? "");
    const created = tsFrom(row.created_at);
    if (!withinWindow(created, now)) continue;
    const sender = String(row.sender ?? "");
    out.push({
      id: `stream:received:${id}`,
      module: "stream",
      kind: "activity",
      type: "stream_received",
      title: `Stream #${id} received`,
      description: `From ${shorten(sender)}`,
      timestamp: created,
      href: "/dashboard/streams/positions",
      ctaLabel: "View streams",
      details: [
        { label: "Stream", value: `#${id}` },
        { label: "Sender", value: shorten(sender) },
        { label: "Ends", value: dateFmt.format(new Date(tsFrom(row.end_at) * 1000)) },
      ],
    });
  }

  for (const row of sent) {
    const id = String(row.id ?? "");
    const created = tsFrom(row.created_at);
    if (!withinWindow(created, now)) continue;
    const recipient = String(row.recipient ?? "");
    if (String(row.sender ?? "").toLowerCase() !== needle) continue;
    out.push({
      id: `stream:sent:${id}`,
      module: "stream",
      kind: "activity",
      type: "stream_sent",
      title: `Stream #${id} created`,
      description: `To ${shorten(recipient)}`,
      timestamp: created,
      href: proofPath("stream", row.tx_hash as string | undefined, id),
      ctaLabel: "View proof",
      details: [
        { label: "Stream", value: `#${id}` },
        { label: "Recipient", value: shorten(recipient) },
      ],
    });

    if (row.canceled) {
      out.push({
        id: `stream:canceled:${id}`,
        module: "stream",
        kind: "activity",
        type: "stream_canceled",
        title: `Stream #${id} canceled`,
        description: "Unvested tokens returned to sender",
        timestamp: created,
        href: "/dashboard/streams/positions",
        ctaLabel: "View streams",
        details: [{ label: "Stream", value: `#${id}` }],
      });
    }
  }

  return out;
}

export function buildCampaignNotifications(
  campaigns: BackendRow[],
  wallet: string,
  now = Math.floor(Date.now() / 1000),
): AppNotification[] {
  const out: AppNotification[] = [];

  for (const row of campaigns) {
    const id = String(row.id ?? "");
    const claimStart = tsFrom(row.claim_start ?? row.start_at);
    const claimEnd = tsFrom(row.claim_end ?? row.end_at);
    const created = tsFrom(row.created_at);

    if (withinWindow(created, now)) {
      out.push({
        id: `airdrop:created:${id}`,
        module: "airdrop",
        kind: "activity",
        type: "campaign_created",
        title: `Airdrop campaign #${id} live`,
        description: "Your campaign is active on Arc",
        timestamp: created,
        href: proofPath("airdrop", row.tx_hash as string | undefined, id),
        ctaLabel: "View campaign",
        details: [
          { label: "Campaign", value: `#${id}` },
          { label: "Claim opens", value: dateFmt.format(new Date(claimStart * 1000)) },
          { label: "Claim closes", value: dateFmt.format(new Date(claimEnd * 1000)) },
        ],
      });
    }

    if (now >= claimStart && now < claimEnd && !row.canceled) {
      out.push({
        id: `airdrop:open:${id}`,
        module: "airdrop",
        kind: "action",
        type: "claim_window_open",
        title: `Airdrop #${id} claim window open`,
        description: "Recipients can claim now",
        timestamp: claimStart,
        href: "/dashboard/airdrops/claim",
        ctaLabel: "Open airdrops",
        details: [
          { label: "Campaign", value: `#${id}` },
          { label: "Closes", value: dateFmt.format(new Date(claimEnd * 1000)) },
        ],
      });
    }

    const endSoon = claimEnd - now;
    if (endSoon > 0 && endSoon <= UPCOMING_WINDOW_SEC && !row.canceled) {
      out.push({
        id: `airdrop:closing:${id}`,
        module: "airdrop",
        kind: "action",
        type: "claim_window_closing",
        title: `Airdrop #${id} closing soon`,
        description: `Window ends in ${Math.ceil(endSoon / 3600)}h`,
        timestamp: claimEnd,
        href: "/dashboard/airdrops/manage",
        ctaLabel: "Manage campaign",
        details: [{ label: "Closes", value: dateFmt.format(new Date(claimEnd * 1000)) }],
      });
    }
  }

  return out;
}

export function buildEscrowNotifications(
  deals: BackendRow[],
  wallet: string,
  now = Math.floor(Date.now() / 1000),
): AppNotification[] {
  const out: AppNotification[] = [];
  const needle = wallet.toLowerCase();

  for (const row of deals) {
    const id = String(row.id ?? "");
    const status = String(row.status ?? "active");
    const unlockAt = tsFrom(row.unlock_at ?? row.end_at);
    const created = tsFrom(row.created_at);
    const buyer = String(row.buyer ?? "").toLowerCase();
    const seller = String(row.seller ?? "").toLowerCase();
    const role = buyer === needle ? "buyer" : seller === needle ? "seller" : "";

    if (!role) continue;

    if (withinWindow(created, now)) {
      out.push({
        id: `escrow:created:${id}`,
        module: "escrow",
        kind: "activity",
        type: "escrow_created",
        title: `Escrow #${id} created`,
        description: role === "buyer" ? "You funded an escrow deal" : "New escrow as seller",
        timestamp: created,
        href: proofPath("escrow", row.tx_hash as string | undefined, id),
        ctaLabel: "View escrow",
        details: [
          { label: "Escrow", value: `#${id}` },
          { label: "Role", value: role },
          { label: "Unlock", value: dateFmt.format(new Date(unlockAt * 1000)) },
        ],
      });
    }

    if (status === "active" && role === "buyer" && now >= unlockAt) {
      out.push({
        id: `escrow:refund:${id}`,
        module: "escrow",
        kind: "action",
        type: "refund_available",
        title: `Escrow #${id} refund available`,
        description: "Unlock time passed — refund or release",
        timestamp: unlockAt,
        href: "/dashboard/escrow",
        ctaLabel: "Open escrow",
        details: [
          { label: "Escrow", value: `#${id}` },
          { label: "Seller", value: shorten(String(row.seller ?? "")) },
        ],
      });
    }

    if (status === "active" && role === "seller") {
      out.push({
        id: `escrow:release-pending:${id}`,
        module: "escrow",
        kind: "action",
        type: "release_pending",
        title: `Escrow #${id} awaiting release`,
        description: "Buyer can release funds to you",
        timestamp: created,
        href: "/dashboard/escrow",
        ctaLabel: "View escrow",
        details: [{ label: "Escrow", value: `#${id}` }],
      });
    }

    if (status === "released" || status === "refunded") {
      out.push({
        id: `escrow:done:${id}:${status}`,
        module: "escrow",
        kind: "activity",
        type: `escrow_${status}`,
        title: `Escrow #${id} ${status}`,
        description: status === "released" ? "Funds released to seller" : "Buyer refunded",
        timestamp: tsFrom(row.updated_at ?? created),
        href: proofPath("escrow", row.tx_hash as string | undefined, id),
        ctaLabel: "View proof",
        details: [{ label: "Status", value: status }],
      });
    }
  }

  return out;
}

export function buildPoolNotifications(pools: BackendRow[], now = Math.floor(Date.now() / 1000)): AppNotification[] {
  const out: AppNotification[] = [];

  for (const row of pools) {
    const id = String(row.id ?? "");
    const created = tsFrom(row.created_at);
    if (!withinWindow(created, now)) continue;
    out.push({
      id: `staking:pool:${id}`,
      module: "staking",
      kind: "activity",
      type: "pool_created",
      title: `Staking pool #${id} created`,
      description: "Your pool is live on Arc",
      timestamp: created,
      href: proofPath("staking", row.tx_hash as string | undefined, id),
      ctaLabel: "View pool",
      details: [{ label: "Pool", value: `#${id}` }],
    });
  }

  return out;
}

export function buildReferralNotifications(
  overview: {
    totals: { availableUsdc: string; netUsdc: string };
    referees: { wallet: string; created_at: string; activated_at?: string | null }[];
    earnings: { amount_usdc: string; created_at: string; referee_wallet?: string }[];
  } | null,
  now = Math.floor(Date.now() / 1000),
): AppNotification[] {
  if (!overview) return [];
  const out: AppNotification[] = [];

  if (usdcPositive(overview.totals.availableUsdc || "0")) {
    out.push({
      id: "referral:withdrawable",
      module: "referral",
      kind: "action",
      type: "commission_withdrawable",
      title: "Referral commission ready",
      description: `${fmtUsdc(overview.totals.availableUsdc)} available to withdraw`,
      timestamp: now,
      href: "/dashboard/referral",
      ctaLabel: "Withdraw",
      details: [
        { label: "Available", value: fmtUsdc(overview.totals.availableUsdc) },
        { label: "Total earned", value: fmtUsdc(overview.totals.netUsdc) },
      ],
    });
  }

  for (const ref of overview.referees) {
    const created = tsFrom(ref.created_at);
    if (!withinWindow(created, now)) continue;
    out.push({
      id: `referral:signup:${ref.wallet}`,
      module: "referral",
      kind: "activity",
      type: "referral_signup",
      title: "New referral joined",
      description: shorten(ref.wallet),
      timestamp: created,
      href: "/dashboard/referral",
      ctaLabel: "View referrals",
      details: [{ label: "Wallet", value: shorten(ref.wallet) }],
    });
    if (ref.activated_at) {
      const activated = tsFrom(ref.activated_at);
      if (withinWindow(activated, now)) {
        out.push({
          id: `referral:activated:${ref.wallet}`,
          module: "referral",
          kind: "activity",
          type: "referral_activated",
          title: "Referral activated",
          description: `${shorten(ref.wallet)} created their first lock`,
          timestamp: activated,
          href: "/dashboard/referral",
          ctaLabel: "View referrals",
          details: [{ label: "Wallet", value: shorten(ref.wallet) }],
        });
      }
    }
  }

  for (const earn of overview.earnings) {
    const created = tsFrom(earn.created_at);
    if (!withinWindow(created, now)) continue;
    out.push({
      id: `referral:earn:${created}:${earn.amount_usdc}`,
      module: "referral",
      kind: "activity",
      type: "commission_earned",
      title: "Referral commission earned",
      description: fmtUsdc(earn.amount_usdc),
      timestamp: created,
      href: "/dashboard/referral",
      ctaLabel: "View earnings",
      details: [
        { label: "Amount", value: fmtUsdc(earn.amount_usdc) },
        ...(earn.referee_wallet
          ? [{ label: "From", value: shorten(earn.referee_wallet) }]
          : []),
      ],
    });
  }

  return out;
}

export function notificationFromStored(row: StoredNotification): AppNotification {
  return {
    id: row.id,
    module: row.module as NotificationModule,
    kind: row.kind,
    type: row.type,
    title: row.title,
    description: row.description,
    timestamp: row.timestamp,
    href: row.href,
    ctaLabel: row.ctaLabel,
    details: row.details,
  };
}

export function notificationToStored(item: AppNotification) {
  return {
    id: item.id,
    module: item.module,
    kind: item.kind,
    type: item.type,
    title: item.title,
    description: item.description,
    timestamp: item.timestamp,
    href: item.href,
    ctaLabel: item.ctaLabel,
    details: item.details,
  };
}

export function mergeNotifications(items: AppNotification[]): AppNotification[] {
  const map = new Map<string, AppNotification>();
  for (const item of items) {
    map.set(item.id, item);
  }
  return [...map.values()].sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "action" ? -1 : 1;
    return b.timestamp - a.timestamp;
  });
}

export function groupByDate(notifications: AppNotification[]) {
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() / 1000;
  const startYesterday = startToday - 86400;

  const groups: { label: string; items: AppNotification[] }[] = [
    { label: "Today", items: [] },
    { label: "Yesterday", items: [] },
    { label: "Earlier", items: [] },
  ];

  for (const n of notifications) {
    if (n.timestamp >= startToday) groups[0].items.push(n);
    else if (n.timestamp >= startYesterday) groups[1].items.push(n);
    else groups[2].items.push(n);
  }

  return groups.filter((g) => g.items.length > 0);
}
