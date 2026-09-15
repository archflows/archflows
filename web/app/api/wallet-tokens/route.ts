import { NextRequest, NextResponse } from "next/server";
import { isAddress } from "viem";

export type WalletToken = {
  address: `0x${string}`;
  symbol: string;
  name: string;
  decimals: number;
  balance: string;
};

type ArcscanTokenItem = {
  value?: string;
  token?: {
    address_hash?: string;
    symbol?: string | null;
    name?: string | null;
    decimals?: string | number | null;
  };
};

const ARCSCAN = "https://testnet.arcscan.app/api/v2";

async function fetchPage(address: string, params?: Record<string, string>) {
  const url = new URL(`${ARCSCAN}/addresses/${address}/tokens`);
  url.searchParams.set("type", "ERC-20");
  if (params) {
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  }
  const res = await fetch(url.toString(), {
    headers: { accept: "application/json" },
    next: { revalidate: 20 },
  });
  if (!res.ok) {
    throw new Error(`Arcscan ${res.status}`);
  }
  return res.json() as Promise<{
    items?: ArcscanTokenItem[];
    next_page_params?: Record<string, string> | null;
  }>;
}

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address") ?? "";
  if (!isAddress(address)) {
    return NextResponse.json({ error: "Invalid address" }, { status: 400 });
  }

  try {
    const tokens: WalletToken[] = [];
    let page = await fetchPage(address);
    let pages = 0;

    while (page && pages < 5) {
      for (const item of page.items ?? []) {
        const raw = item.token?.address_hash;
        const value = item.value ?? "0";
        if (!raw || !isAddress(raw) || BigInt(value) <= 0n) continue;
        const decimalsRaw = item.token?.decimals;
        const decimals =
          typeof decimalsRaw === "number"
            ? decimalsRaw
            : Number.parseInt(String(decimalsRaw ?? "18"), 10);
        tokens.push({
          address: raw as `0x${string}`,
          symbol: item.token?.symbol || "TOKEN",
          name: item.token?.name || item.token?.symbol || "Unknown",
          decimals: Number.isFinite(decimals) ? decimals : 18,
          balance: value,
        });
      }
      pages += 1;
      if (!page.next_page_params) break;
      page = await fetchPage(address, page.next_page_params);
    }

    tokens.sort((a, b) => a.symbol.localeCompare(b.symbol));
    return NextResponse.json({ tokens });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load tokens";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
