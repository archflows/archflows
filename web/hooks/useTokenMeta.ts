"use client";

import { useReadContract } from "wagmi";
import { erc20Abi } from "@/lib/abi";

const ZERO = "0x0000000000000000000000000000000000000000";

const META_QUERY = {
  staleTime: 5 * 60_000,
  gcTime: 30 * 60_000,
} as const;

export function useTokenMeta(token?: `0x${string}`) {
  const enabled = Boolean(token && token !== ZERO);
  const { data: symbol } = useReadContract({
    address: token,
    abi: erc20Abi,
    functionName: "symbol",
    query: { enabled, ...META_QUERY },
  });
  const { data: decimals } = useReadContract({
    address: token,
    abi: erc20Abi,
    functionName: "decimals",
    query: { enabled, ...META_QUERY },
  });
  return { symbol, decimals };
}
