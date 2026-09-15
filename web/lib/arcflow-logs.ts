import {
  decodeEventLog,
  type Hex,
} from "viem";
import { arcFlowAbi } from "@/lib/abi";
import { ARCFLOW_ADDRESS, EXPLORER_URL } from "@/lib/chain";

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

function topicList(topics: (Hex | string | null)[]): [Hex, ...Hex[]] {
  const cleaned = topics.filter((t): t is Hex | string => Boolean(t)).map((t) => t as Hex);
  if (cleaned.length === 0) throw new Error("empty topics");
  return cleaned as [Hex, ...Hex[]];
}

/** Pull ArcFlow vault logs via Arcscan (Blockscout). Avoids pruned RPC eth_getLogs. */
export async function fetchArcFlowLogsFromExplorer(
  maxPages = 20,
): Promise<ArcFlowDecodedLog[]> {
  const out: ArcFlowDecodedLog[] = [];
  let url: string | null =
    `${EXPLORER_URL}/api/v2/addresses/${ARCFLOW_ADDRESS}/logs?items_count=50`;
  let pages = 0;

  while (url && pages < maxPages) {
    const res = await fetch(url, {
      headers: { accept: "application/json" },
      // Browser client component: explorer is public CORS on Arcscan.
      cache: "no-store",
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
      url = `${EXPLORER_URL}/api/v2/addresses/${ARCFLOW_ADDRESS}/logs?${params}`;
    } else {
      url = null;
    }
  }

  return out;
}
