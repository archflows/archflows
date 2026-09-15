"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAccount, useReadContract } from "wagmi";
import { erc20Abi } from "@/lib/abi";
import { USDC_ADDRESS, USDC_DECIMALS } from "@/lib/chain";
import type { WalletToken } from "@/app/api/wallet-tokens/route";

async function loadTokens(address: string): Promise<WalletToken[]> {
  const res = await fetch(`/api/wallet-tokens?address=${address}`);
  const data = (await res.json()) as { tokens?: WalletToken[]; error?: string };
  if (!res.ok) throw new Error(data.error || "Failed to load wallet tokens");
  return data.tokens ?? [];
}

function same(a: string, b: string) {
  return a.toLowerCase() === b.toLowerCase();
}

export function ownsWalletToken(tokens: WalletToken[] | undefined, token?: string | null) {
  if (!token) return false;
  return (tokens ?? []).some((row) => same(row.address, token));
}

export function useWalletTokens() {
  const { address, isConnected } = useAccount();
  const query = useQuery({
    queryKey: ["wallet-tokens", address],
    queryFn: () => loadTokens(address!),
    enabled: Boolean(isConnected && address),
    staleTime: 30_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
  });

  const { data: usdcBalance } = useReadContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled: Boolean(isConnected && address),
      staleTime: 15_000,
    },
  });

  const tokens = useMemo(() => {
    const list = [...(query.data ?? [])];
    const usdcIndex = list.findIndex((row) => same(row.address, USDC_ADDRESS));
    if (usdcBalance !== undefined && usdcBalance > 0n) {
      const usdc: WalletToken = {
        address: USDC_ADDRESS,
        symbol: "USDC",
        name: "USD Coin",
        decimals: USDC_DECIMALS,
        balance: usdcBalance.toString(),
      };
      if (usdcIndex >= 0) list[usdcIndex] = { ...list[usdcIndex], ...usdc };
      else list.unshift(usdc);
    } else if (usdcBalance === 0n && usdcIndex >= 0) {
      list.splice(usdcIndex, 1);
    }
    return list;
  }, [query.data, usdcBalance]);

  return {
    ...query,
    data: tokens,
    wallet: address,
  };
}
