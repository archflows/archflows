"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useAccount } from "wagmi";
import { bindReferral } from "@/lib/backend";
import { REFERRAL_PARAM, forgetCode, normalizeCode, rememberCode, storedCode } from "@/lib/referral";

/**
 * Two halves of the same job, split because they almost never happen at the same time:
 * capture `?ref=CODE` the moment someone lands, then bind it to their wallet whenever they
 * finally connect. Mounted once in the root layout so it covers every entry point.
 */
export function ReferralCapture() {
  const pathname = usePathname();
  const { address, isConnected } = useAccount();
  const bound = useRef<string | null>(null);

  // Read from `window` rather than `useSearchParams` so this never forces a Suspense
  // boundary onto statically rendered pages.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const code = normalizeCode(new URLSearchParams(window.location.search).get(REFERRAL_PARAM));
    if (code) rememberCode(code);
  }, [pathname]);

  useEffect(() => {
    if (!isConnected || !address) return;
    const code = storedCode();
    if (!code) return;

    const wallet = address.toLowerCase();
    const attempt = `${wallet}:${code}`;
    if (bound.current === attempt) return;
    bound.current = attempt;

    void bindReferral(wallet, code).then((result) => {
      // Either it stuck or this wallet already had a referrer. Self-referrals come back null.
      // Nothing is retryable here, so stop holding the code.
      if (result) forgetCode();
    });
  }, [isConnected, address]);

  return null;
}
