import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/** Arc Testnet chain id — keep explicit so multi-chain stays possible later. */
export const ARC_CHAIN_ID = 5042002;

/** ERC-20 metadata cache (symbol/decimals/logo). Source of truth for logos is off-chain. */
export const tokens = pgTable(
  "tokens",
  {
    chainId: integer("chain_id").notNull().default(ARC_CHAIN_ID),
    address: text("address").notNull(),
    symbol: text("symbol").notNull(),
    name: text("name").notNull(),
    decimals: integer("decimals").notNull().default(18),
    logoUrl: text("logo_url"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("tokens_chain_address_uidx").on(t.chainId, t.address)],
);

/**
 * Indexed vault activity for explorer / dashboards.
 * On-chain remains authoritative; this table is a query cache.
 */
export const vaultEvents = pgTable(
  "vault_events",
  {
    id: serial("id").primaryKey(),
    chainId: integer("chain_id").notNull().default(ARC_CHAIN_ID),
    kind: text("kind").notNull(), // lock | claim | fee
    lockId: bigint("lock_id", { mode: "bigint" }).notNull(),
    txHash: text("tx_hash").notNull(),
    logIndex: integer("log_index").notNull().default(0),
    blockNumber: bigint("block_number", { mode: "bigint" }).notNull(),
    blockTime: timestamp("block_time", { withTimezone: true }).notNull(),
    wallet: text("wallet").notNull(),
    token: text("token").notNull(),
    amount: numeric("amount", { precision: 78, scale: 0 }).notNull(),
    startAt: timestamp("start_at", { withTimezone: true }),
    cliffAt: timestamp("cliff_at", { withTimezone: true }),
    endAt: timestamp("end_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("vault_events_tx_log_uidx").on(t.chainId, t.txHash, t.logIndex),
    index("vault_events_kind_time_idx").on(t.kind, t.blockTime),
    index("vault_events_wallet_idx").on(t.wallet),
    index("vault_events_lock_id_idx").on(t.lockId),
  ],
);

/** Off-chain merkle campaign payload (CSV → tree). Root is also on-chain. */
export const airdropCampaigns = pgTable(
  "airdrop_campaigns",
  {
    id: serial("id").primaryKey(),
    chainId: integer("chain_id").notNull().default(ARC_CHAIN_ID),
    onchainId: bigint("onchain_id", { mode: "bigint" }),
    token: text("token").notNull(),
    merkleRoot: text("merkle_root").notNull(),
    csvHash: text("csv_hash"),
    createdBy: text("created_by"),
    meta: jsonb("meta").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("airdrop_campaigns_root_uidx").on(t.chainId, t.merkleRoot),
    index("airdrop_campaigns_onchain_idx").on(t.onchainId),
  ],
);

export const airdropLeaves = pgTable(
  "airdrop_leaves",
  {
    id: serial("id").primaryKey(),
    campaignId: integer("campaign_id")
      .notNull()
      .references(() => airdropCampaigns.id, { onDelete: "cascade" }),
    leafIndex: integer("leaf_index").notNull(),
    account: text("account").notNull(),
    amount: numeric("amount", { precision: 78, scale: 0 }).notNull(),
    proof: jsonb("proof").$type<string[]>().notNull().default([]),
  },
  (t) => [
    uniqueIndex("airdrop_leaves_campaign_index_uidx").on(t.campaignId, t.leafIndex),
    index("airdrop_leaves_account_idx").on(t.account),
  ],
);

/** Indexer / sync cursors (e.g. last Arcscan page or block). */
export const syncCursors = pgTable("sync_cursors", {
  key: text("key").primaryKey(),
  lastBlock: bigint("last_block", { mode: "bigint" }),
  cursor: text("cursor"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Optional wallet custom token list (tokens user added manually). */
export const walletTokens = pgTable(
  "wallet_tokens",
  {
    id: serial("id").primaryKey(),
    wallet: text("wallet").notNull(),
    chainId: integer("chain_id").notNull().default(ARC_CHAIN_ID),
    token: text("token").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("wallet_tokens_uidx").on(t.wallet, t.chainId, t.token)],
);

export type Token = typeof tokens.$inferSelect;
export type VaultEvent = typeof vaultEvents.$inferSelect;
export type AirdropCampaign = typeof airdropCampaigns.$inferSelect;
