"use client";

import { useQuery } from "@tanstack/react-query";
import {
  listCampaigns,
  listEscrow,
  listLocks,
  listPools,
  listStreams,
} from "@/lib/backend";

export type TxSource = "locks" | "streams" | "campaigns" | "escrow" | "pools";

export type LockTxRecord = { create?: string; unlock?: string };

function readHash(item: Record<string, unknown>) {
  const id = item.id == null ? "" : String(item.id);
  const hash = typeof item.tx_hash === "string" ? item.tx_hash : "";
  return { id, hash };
}

function merge(map: Map<string, string>, items?: Record<string, unknown>[] | null) {
  for (const item of items ?? []) {
    const { id, hash } = readHash(item);
    if (id && hash) map.set(id, hash);
  }
  return map;
}

function mergeLockTx(map: Map<string, LockTxRecord>, items?: Record<string, unknown>[] | null) {
  for (const item of items ?? []) {
    const id = item.id == null ? "" : String(item.id);
    if (!id) continue;
    const create = typeof item.tx_hash === "string" ? item.tx_hash : "";
    const unlock = typeof item.unlock_tx_hash === "string" ? item.unlock_tx_hash : "";
    const prev = map.get(id) ?? {};
    map.set(id, {
      create: create || prev.create,
      unlock: unlock || prev.unlock,
    });
  }
  return map;
}

export function useLockTxMap(address?: string) {
  return useQuery({
    queryKey: ["arcflow-api", "tx-hashes", "locks", address ?? ""],
    enabled: Boolean(address),
    staleTime: 45_000,
    queryFn: async () => {
      const map = new Map<string, LockTxRecord>();
      if (!address) return map;
      const [created, received] = await Promise.all([
        listLocks({ creator: address }),
        listLocks({ beneficiary: address }),
      ]);
      mergeLockTx(map, created?.items as Record<string, unknown>[] | undefined);
      mergeLockTx(map, received?.items as Record<string, unknown>[] | undefined);
      return map;
    },
  });
}

export function useTxHashMap(source: TxSource, address?: string) {
  return useQuery({
    queryKey: ["arcflow-api", "tx-hashes", source, address ?? ""],
    enabled: Boolean(address),
    staleTime: 45_000,
    queryFn: async () => {
      const map = new Map<string, string>();
      if (!address) return map;
      if (source === "locks") {
        const [created, received] = await Promise.all([
          listLocks({ creator: address }),
          listLocks({ beneficiary: address }),
        ]);
        merge(map, created?.items as Record<string, unknown>[] | undefined);
        merge(map, received?.items as Record<string, unknown>[] | undefined);
      } else if (source === "streams") {
        const [sent, received] = await Promise.all([
          listStreams({ sender: address }),
          listStreams({ recipient: address }),
        ]);
        merge(map, sent?.items as Record<string, unknown>[] | undefined);
        merge(map, received?.items as Record<string, unknown>[] | undefined);
      } else if (source === "campaigns") {
        const rows = await listCampaigns({ funder: address });
        merge(map, rows?.items as Record<string, unknown>[] | undefined);
      } else if (source === "escrow") {
        const [buying, selling] = await Promise.all([
          listEscrow({ buyer: address }),
          listEscrow({ seller: address }),
        ]);
        merge(map, buying?.items as Record<string, unknown>[] | undefined);
        merge(map, selling?.items as Record<string, unknown>[] | undefined);
      } else {
        const rows = await listPools({ owner: address });
        merge(map, rows?.items as Record<string, unknown>[] | undefined);
      }
      return map;
    },
  });
}
