import { sql } from "drizzle-orm";
import { fetchArcFlowLogsFromExplorer } from "@/lib/arcflow-logs";
import { requireDb } from "@/lib/db";
import { ARC_CHAIN_ID, syncCursors, tokens, vaultEvents } from "@/lib/db/schema";

function asAddress(v: unknown): string {
  return String(v ?? "").toLowerCase();
}

function unixToDate(sec: number | undefined | null) {
  if (sec == null || !Number.isFinite(sec)) return null;
  return new Date(sec * 1000);
}

/** Pull Arcscan logs into Postgres. Safe to re-run (upsert on tx+log). */
export async function syncVaultEventsFromExplorer(maxPages = 20) {
  const database = requireDb();
  const logs = await fetchArcFlowLogsFromExplorer(maxPages);

  const rows = logs.map((log, i) => {
    const kind =
      log.eventName === "Locked" ? "lock" : log.eventName === "Claimed" ? "claim" : "fee";
    const lockId = BigInt(String(log.args.id ?? 0));
    const amount = String(log.args.amount ?? log.args.fee ?? 0);
    const wallet =
      kind === "lock"
        ? asAddress(log.args.creator ?? log.args.beneficiary)
        : kind === "claim"
          ? asAddress(log.args.beneficiary ?? log.args.from)
          : asAddress(log.args.from ?? log.args.beneficiary);
    const token = asAddress(log.args.token ?? "0x0000000000000000000000000000000000000000");

    return {
      chainId: ARC_CHAIN_ID,
      kind,
      lockId,
      txHash: log.txHash.toLowerCase(),
      logIndex: i, // Arcscan page has no log_index; stable within sync batch via order
      blockNumber: log.blockNumber,
      blockTime: new Date(log.timestamp * 1000),
      wallet,
      token,
      amount,
      startAt: unixToDate(Number(log.args.start ?? NaN)),
      cliffAt: unixToDate(Number(log.args.cliff ?? NaN)),
      endAt: unixToDate(Number(log.args.end ?? NaN)),
    };
  });

  // Prefer unique (tx, kind, lockId) when log_index is approximate
  let inserted = 0;
  for (const row of rows) {
    const result = await database
      .insert(vaultEvents)
      .values(row)
      .onConflictDoNothing()
      .returning({ id: vaultEvents.id });
    inserted += result.length;
  }

  const maxBlock = logs.reduce((m, l) => (l.blockNumber > m ? l.blockNumber : m), 0n);
  await database
    .insert(syncCursors)
    .values({
      key: `vault_events:${ARC_CHAIN_ID}`,
      lastBlock: maxBlock,
      cursor: new Date().toISOString(),
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: syncCursors.key,
      set: {
        lastBlock: maxBlock,
        cursor: new Date().toISOString(),
        updatedAt: new Date(),
      },
    });

  return { scanned: logs.length, inserted, maxBlock: maxBlock.toString() };
}

export async function upsertTokenMeta(
  entries: { address: string; symbol: string; name: string; decimals: number }[],
) {
  const database = requireDb();
  for (const entry of entries) {
    await database
      .insert(tokens)
      .values({
        chainId: ARC_CHAIN_ID,
        address: entry.address.toLowerCase(),
        symbol: entry.symbol,
        name: entry.name,
        decimals: entry.decimals,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [tokens.chainId, tokens.address],
        set: {
          symbol: entry.symbol,
          name: entry.name,
          decimals: entry.decimals,
          updatedAt: new Date(),
        },
      });
  }
}

export async function listVaultEvents(limit = 200) {
  const database = requireDb();
  return database
    .select()
    .from(vaultEvents)
    .where(sql`${vaultEvents.chainId} = ${ARC_CHAIN_ID}`)
    .orderBy(sql`${vaultEvents.blockTime} desc`)
    .limit(limit);
}
