import { query, withClient } from "../db.js";
import { badRequest } from "../errors.js";
import { parsePaging } from "./validate.js";

const MODULES = new Set(["lock", "vest", "stream", "airdrop", "escrow", "staking", "referral"]);
const KINDS = new Set(["action", "activity"]);

function shortenAddress(value) {
  if (typeof value !== "string" || value.length < 10) return value || "";
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

function tsFromRow(value) {
  if (value == null) return Math.floor(Date.now() / 1000);
  if (typeof value === "number") return value;
  const parsed = Date.parse(String(value));
  return Number.isFinite(parsed) ? Math.floor(parsed / 1000) : Math.floor(Date.now() / 1000);
}

function proofHref(module, txHash, fallbackId) {
  if (typeof txHash === "string" && /^0x[a-fA-F0-9]{64}$/.test(txHash)) {
    return `/${module}/${txHash.toLowerCase()}`;
  }
  if (fallbackId != null && String(fallbackId) !== "") return `/${module}/${String(fallbackId)}`;
  return `/${module}`;
}

export function rowToApi(row) {
  return {
    id: row.id,
    module: row.module,
    kind: row.kind,
    type: row.type,
    title: row.title,
    description: row.description,
    timestamp: Number(row.event_at),
    href: row.href,
    ctaLabel: row.cta_label,
    details: row.details ?? [],
    read: row.read_at != null,
    readAt: row.read_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizeItem(item) {
  if (!item || typeof item !== "object") throw badRequest("Each notification must be an object");
  const module = String(item.module ?? "");
  const kind = String(item.kind ?? "");
  if (!MODULES.has(module)) throw badRequest(`Invalid notification module: ${module}`);
  if (!KINDS.has(kind)) throw badRequest(`Invalid notification kind: ${kind}`);
  const eventAt = Number(item.timestamp ?? item.event_at);
  if (!Number.isFinite(eventAt) || eventAt <= 0) throw badRequest("notification timestamp/event_at is required");

  return {
    id: String(item.id ?? ""),
    module,
    kind,
    type: String(item.type ?? ""),
    title: String(item.title ?? ""),
    description: String(item.description ?? ""),
    event_at: Math.floor(eventAt),
    href: String(item.href ?? "/dashboard"),
    cta_label: String(item.ctaLabel ?? item.cta_label ?? "Open"),
    details: Array.isArray(item.details) ? item.details : [],
  };
}

const UPSERT_SQL = `INSERT INTO notifications (
  wallet, id, module, kind, type, title, description, event_at, href, cta_label, details, read_at
) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12)
ON CONFLICT (wallet, id) DO UPDATE SET
  module = EXCLUDED.module,
  kind = EXCLUDED.kind,
  type = EXCLUDED.type,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  event_at = EXCLUDED.event_at,
  href = EXCLUDED.href,
  cta_label = EXCLUDED.cta_label,
  details = EXCLUDED.details,
  read_at = COALESCE(notifications.read_at, EXCLUDED.read_at),
  updated_at = NOW()
RETURNING *`;

export async function upsertNotification(wallet, item, readAt = null) {
  const normalized = normalizeItem(item);
  if (!normalized.id) throw badRequest("notification id is required");
  const { rows } = await query(UPSERT_SQL, [
    wallet,
    normalized.id,
    normalized.module,
    normalized.kind,
    normalized.type,
    normalized.title,
    normalized.description,
    normalized.event_at,
    normalized.href,
    normalized.cta_label,
    JSON.stringify(normalized.details),
    readAt,
  ]);
  return rowToApi(rows[0]);
}

export async function syncNotifications(wallet, items, readIds = []) {
  if (!Array.isArray(items)) throw badRequest("items must be an array");
  if (items.length > 500) throw badRequest("Cannot sync more than 500 notifications at once");
  const readSet = new Set(readIds.map(String));

  const saved = await withClient(async (client) => {
    await client.query("BEGIN");
    try {
      const rows = [];
      for (const item of items) {
        const normalized = normalizeItem(item);
        const readAt = readSet.has(normalized.id) ? new Date() : null;
        const result = await client.query(UPSERT_SQL, [
          wallet,
          normalized.id,
          normalized.module,
          normalized.kind,
          normalized.type,
          normalized.title,
          normalized.description,
          normalized.event_at,
          normalized.href,
          normalized.cta_label,
          JSON.stringify(normalized.details),
          readAt,
        ]);
        rows.push(result.rows[0]);
      }
      await client.query("COMMIT");
      return rows;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  });

  const apiItems = saved.map(rowToApi).sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "action" ? -1 : 1;
    return b.timestamp - a.timestamp;
  });

  const unread = apiItems.filter((item) => !item.read).length;
  return { items: apiItems, unread };
}

export async function listNotifications(wallet, qs = {}) {
  const { limit, offset } = parsePaging(qs);
  const clauses = ["wallet = $1"];
  const values = [wallet];

  if (qs.kind && KINDS.has(String(qs.kind))) {
    values.push(String(qs.kind));
    clauses.push(`kind = $${values.length}`);
  }

  if (qs.unread === "true" || qs.unread === "1") {
    clauses.push("read_at IS NULL");
  }

  const where = `WHERE ${clauses.join(" AND ")}`;
  const countSql = `SELECT COUNT(*)::int AS total FROM notifications ${where}`;
  const listSql = `SELECT * FROM notifications ${where}
    ORDER BY
      CASE kind WHEN 'action' THEN 0 ELSE 1 END,
      event_at DESC,
      id DESC
    LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;

  const listRes = await query(listSql, [...values, limit, offset]);
  if (offset === 0 && listRes.rows.length < limit) {
    return {
      items: listRes.rows.map(rowToApi),
      page: { total: listRes.rows.length, limit, offset },
      unread: listRes.rows.filter((row) => !row.read_at).length,
    };
  }

  const countRes = await query(countSql, values);
  const unreadRes = await query(
    `SELECT COUNT(*)::int AS total FROM notifications WHERE wallet = $1 AND read_at IS NULL`,
    [wallet],
  );
  return {
    items: listRes.rows.map(rowToApi),
    page: { total: countRes.rows[0].total, limit, offset },
    unread: unreadRes.rows[0].total,
  };
}

export async function markNotificationRead(wallet, id) {
  const { rows } = await query(
    `UPDATE notifications
     SET read_at = COALESCE(read_at, NOW()), updated_at = NOW()
     WHERE wallet = $1 AND id = $2
     RETURNING *`,
    [wallet, String(id)],
  );
  return rows[0] ? rowToApi(rows[0]) : null;
}

export async function markAllNotificationsRead(wallet) {
  const { rowCount } = await query(
    `UPDATE notifications
     SET read_at = COALESCE(read_at, NOW()), updated_at = NOW()
     WHERE wallet = $1 AND read_at IS NULL`,
    [wallet],
  );
  return { updated: rowCount ?? 0 };
}

export async function notifyStreamUpserted(row) {
  const id = String(row.id);
  const created = tsFromRow(row.created_at);
  const sender = String(row.sender);
  const recipient = String(row.recipient);
  const href = proofHref("stream", row.tx_hash, id);

  await Promise.all([
    upsertNotification(sender, {
      id: `stream:sent:${id}`,
      module: "stream",
      kind: "activity",
      type: "stream_sent",
      title: `Stream #${id} created`,
      description: `To ${shortenAddress(recipient)}`,
      timestamp: created,
      href,
      ctaLabel: "View proof",
      details: [
        { label: "Stream", value: `#${id}` },
        { label: "Recipient", value: shortenAddress(recipient) },
      ],
    }),
    upsertNotification(recipient, {
      id: `stream:received:${id}`,
      module: "stream",
      kind: "activity",
      type: "stream_received",
      title: `Stream #${id} received`,
      description: `From ${shortenAddress(sender)}`,
      timestamp: created,
      href: "/dashboard/streams/positions",
      ctaLabel: "View streams",
      details: [
        { label: "Stream", value: `#${id}` },
        { label: "Sender", value: shortenAddress(sender) },
      ],
    }),
  ]);
}

export async function notifyCampaignUpserted(row) {
  const id = String(row.id);
  const created = tsFromRow(row.created_at);
  const claimStart = Number(row.claim_start);
  await upsertNotification(String(row.funder), {
    id: `airdrop:created:${id}`,
    module: "airdrop",
    kind: "activity",
    type: "campaign_created",
    title: `Airdrop campaign #${id} live`,
    description: "Your campaign is active on Arc",
    timestamp: created,
    href: proofHref("airdrop", row.tx_hash, id),
    ctaLabel: "View campaign",
    details: [
      { label: "Campaign", value: `#${id}` },
      { label: "Claim opens", value: new Date(claimStart * 1000).toISOString() },
    ],
  });
}

export async function notifyEscrowUpserted(row) {
  const id = String(row.id);
  const created = tsFromRow(row.created_at);
  const unlockAt = Number(row.unlock_at);
  const buyer = String(row.buyer);
  const seller = String(row.seller);
  const href = proofHref("escrow", row.tx_hash, id);

  await Promise.all([
    upsertNotification(buyer, {
      id: `escrow:created:${id}`,
      module: "escrow",
      kind: "activity",
      type: "escrow_created",
      title: `Escrow #${id} created`,
      description: "You funded an escrow deal",
      timestamp: created,
      href,
      ctaLabel: "View escrow",
      details: [
        { label: "Escrow", value: `#${id}` },
        { label: "Role", value: "buyer" },
      ],
    }),
    upsertNotification(seller, {
      id: `escrow:created:${id}`,
      module: "escrow",
      kind: "activity",
      type: "escrow_created",
      title: `Escrow #${id} created`,
      description: "New escrow as seller",
      timestamp: created,
      href,
      ctaLabel: "View escrow",
      details: [
        { label: "Escrow", value: `#${id}` },
        { label: "Role", value: "seller" },
        { label: "Unlock", value: new Date(unlockAt * 1000).toISOString() },
      ],
    }),
  ]);
}

export async function notifyPoolUpserted(row) {
  const id = String(row.id);
  const created = tsFromRow(row.created_at);
  await upsertNotification(String(row.owner), {
    id: `staking:pool:${id}`,
    module: "staking",
    kind: "activity",
    type: "pool_created",
    title: `Staking pool #${id} created`,
    description: "Your pool is live on Arc",
    timestamp: created,
    href: proofHref("staking", row.tx_hash, id),
    ctaLabel: "View pool",
    details: [{ label: "Pool", value: `#${id}` }],
  });
}

export async function notifyReferralSignup(referrer, referee) {
  const created = Math.floor(Date.now() / 1000);
  await upsertNotification(referrer, {
    id: `referral:signup:${referee}`,
    module: "referral",
    kind: "activity",
    type: "referral_signup",
    title: "New referral joined",
    description: shortenAddress(referee),
    timestamp: created,
    href: "/dashboard/referral",
    ctaLabel: "View referrals",
    details: [{ label: "Wallet", value: shortenAddress(referee) }],
  });
}

export async function notifyReferralEarning(referrer, referee, amountUsdc) {
  const created = Math.floor(Date.now() / 1000);
  await upsertNotification(referrer, {
    id: `referral:earn:${created}:${amountUsdc}`,
    module: "referral",
    kind: "activity",
    type: "commission_earned",
    title: "Referral commission earned",
    description: `${amountUsdc} USDC`,
    timestamp: created,
    href: "/dashboard/referral",
    ctaLabel: "View earnings",
    details: [
      { label: "Amount", value: `${amountUsdc} USDC` },
      { label: "From", value: shortenAddress(referee) },
    ],
  });
}
