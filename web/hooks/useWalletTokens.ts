"use client";

import { useQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import type { WalletToken } from "@/app/api/wallet-tokens/route";

async function loadTokens(address: string): Promise<WalletToken[]> {
  const res = await fetch(`/api/wallet-tokens?address=${address}`);
  const data = (await res.json()) as { tokens?: WalletToken[]; error?: string };
  if (!res.ok) throw new Error(data.error || "Failed to load wallet tokens");
  return data.tokens ?? [];
}

export function useWalletTokens() {
  const { address, isConnected } = useAccount();

  return useQuery({
    queryKey: ["wallet-tokens", address],
    queryFn: () => loadTokens(address!),
    enabled: Boolean(isConnected && address),
    staleTime: 20_000,
    refetchOnWindowFocus: true,
  });
}
