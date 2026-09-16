import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { isTxHash } from "@/lib/proof";

/** Explorer URL filtered to a successful transaction hash. */
export function explorerTxPath(hash?: string | null) {
  if (!isTxHash(hash)) return "/explorer";
  return `/explorer?tx=${encodeURIComponent(hash.toLowerCase())}`;
}

export function goToExplorerTx(router: AppRouterInstance, hash?: string | null) {
  if (!isTxHash(hash)) return;
  router.push(explorerTxPath(hash));
}
