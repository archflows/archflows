"use client";

import { useQuery } from "@tanstack/react-query";
import { getStats, pingBackend } from "@/lib/backend";

export function useLiveConfig() {
  return useQuery({
    queryKey: ["arcflow-api", "config"],
    queryFn: pingBackend,
    staleTime: 5 * 60_000,
    gcTime: 15 * 60_000,
    refetchInterval: 60_000,
  });
}

export function useLiveStats(wallet?: string, days = 90) {
  return useQuery({
    queryKey: ["arcflow-api", "stats", wallet ?? "", days],
    queryFn: () => getStats({ wallet, days }),
    staleTime: 45_000,
    gcTime: 10 * 60_000,
    refetchInterval: 60_000,
    placeholderData: (previous) => previous,
  });
}
