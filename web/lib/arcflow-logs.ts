import {
  decodeEventLog,
  type Hex,
} from "viem";
import { arcFlowAbi } from "@/lib/abi";
import { ARCFLOW_ADDRESS, EXPLORER_API_URL } from "@/lib/chain";

type BlockscoutLogItem = {
  block_number: number;
  block_timestamp: string;
  transaction_hash: Hex;
  topics: (Hex | string | null)[];
  data: Hex;
};

type BlockscoutLogsPage = {
  items?: BlockscoutLogItem[];
  next_page_params?: Record<string, string | number> | null;
};

export type ArcFlowDecodedLog = {
  eventName: "Locked" | "Claimed" | "FeePaid";
  args: Record<string, unknown>;
  blockNumber: bigint;
  timestamp: number;
  txHash: Hex;
};

export type ArcFlowSerializedLog = {
  eventName: ArcFlowDecodedLog["eventName"];
  args: Record<string, string | boolean | null>;
  blockNumber: string;
  timestamp: number;
  txHash: Hex;
};

const BIGINT_ARG_KEYS = new Set(["id", "amount", "start", "cliff", "end", "fee"]);

function topicList(topics: (Hex | string | null)[]): [Hex, ...Hex[]] {
  const cleaned = topics.filter((t): t is Hex | string => Boolean(t)).map((t) => t as Hex);
  if (cleaned.length === 0) throw new Error("empty topics");
  return cleaned as [Hex, ...Hex[]];
}

function serializeArg(value: unknown): string | boolean | null {
  if (value == null) return null;
  if (typeof value === "boolean") return value;
  if (typeof value === "bigint") return value.toString();
  return String(value);
}

export function serializeArcFlowLogs(logs: ArcFlowDecodedLog[]): ArcFlowSerializedLog[] {
  return logs.map((log) => {
    const args: Record<string, string | boolean | null> = {};
    for (const [key, value] of Object.entries(log.args)) {
      args[key] = serializeArg(value);
    }
    return {
      eventName: log.eventName,
      args,
      blockNumber: log.blockNumber.toString(),
      timestamp: log.timestamp,
      txHash: log.txHash,
    };
  });
}

export function reviveArcFlowLogs(logs: ArcFlowSerializedLog[]): ArcFlowDecodedLog[] {
  return logs.map((log) => {
    const args: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(log.args)) {
      if (typeof value === "string" && BIGINT_ARG_KEYS.has(key) && /^-?\d+$/.test(value)) {
        args[key] = BigInt(value);
      } else {
        args[key] = value;
      }
    }
    return {
      eventName: log.eventName,
      args,
      blockNumber: BigInt(log.blockNumber),
      timestamp: log.timestamp,
      txHash: log.txHash,
    };
  });
}

/** Pull ArcFlow vault logs via Arcscan (Blockscout). Avoids pruned RPC eth_getLogs. */
export async function fetchArcFlowLogsDirect(
  maxPages = 20,
): Promise<ArcFlowDecodedLog[]> {
  const out: ArcFlowDecodedLog[] = [];
  let url: string | null =
    `${EXPLORER_API_URL}/api/v2/addresses/${ARCFLOW_ADDRESS}/logs?items_count=50`;
  let pages = 0;

  while (url && pages < maxPages) {
    const res = await fetch(url, {
      headers: { accept: "application/json" },
      cache: "no-store",
      redirect: "follow",
    });
    if (!res.ok) throw new Error(`Arcscan logs failed (${res.status})`);
    const body = (await res.json()) as BlockscoutLogsPage;
    pages += 1;

    for (const item of body.items ?? []) {
      try {
        const decoded = decodeEventLog({
          abi: arcFlowAbi,
          data: item.data,
          topics: topicList(item.topics),
        });
        if (
          decoded.eventName !== "Locked" &&
          decoded.eventName !== "Claimed" &&
          decoded.eventName !== "FeePaid"
        ) {
          continue;
        }
        out.push({
          eventName: decoded.eventName,
          args: decoded.args as Record<string, unknown>,
          blockNumber: BigInt(item.block_number),
          timestamp: Math.floor(new Date(item.block_timestamp).getTime() / 1000),
          txHash: item.transaction_hash,
        });
      } catch {
        // Ignore unrelated / undecodable logs on the same address.
      }
    }

    if (body.next_page_params) {
      const params = new URLSearchParams(
        Object.entries(body.next_page_params).map(([k, v]) => [k, String(v)]),
      );
      url = `${EXPLORER_API_URL}/api/v2/addresses/${ARCFLOW_ADDRESS}/logs?${params}`;
    } else {
      url = null;
    }
  }

  return out;
}

/**
 * Browser: same-origin `/api/vault-logs` (Arcscan CORS/redirects).
 * Server: hit Blockscout directly.
 */
export async function fetchArcFlowLogsFromExplorer(
  maxPages = 20,
): Promise<ArcFlowDecodedLog[]> {
  if (typeof window !== "undefined") {
    const res = await fetch(`/api/vault-logs?pages=${maxPages}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`Arcscan logs failed (${res.status})`);
    const body = (await res.json()) as { logs?: ArcFlowSerializedLog[] };
    return reviveArcFlowLogs(body.logs ?? []);
  }
  return fetchArcFlowLogsDirect(maxPages);
}
