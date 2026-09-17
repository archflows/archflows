"use client";

import { useEffect, useState } from "react";
import { isAddress } from "viem";
import { useAccount, useReadContract } from "wagmi";
import { arcFlowAbi } from "@/lib/abi";
import { bindReferral, getReferralOverview, resolveReferralCode } from "@/lib/backend";
import { ARCFLOW_ADDRESS, ZERO } from "@/lib/chain";
import { forgetCode, storedCode } from "@/lib/referral";

/** Referrer wallet for on-chain fee attribution, if this user arrived via a referral link. */
export function useReferrerAddress() {
  const { address } = useAccount();
  const [referrer, setReferrer] = useState<`0x${string}` | null>(null);
  const { data: referralPlatformBps } = useReadContract({
    address: ARCFLOW_ADDRESS,
    abi: arcFlowAbi,
    functionName: "referralPlatformBps",
    query: { enabled: ARCFLOW_ADDRESS !== ZERO },
  });

  useEffect(() => {
    if (!address) {
      setReferrer(null);
      return;
    }

    const wallet = address.toLowerCase();
    let cancelled = false;

    void (async () => {
      try {
        const overview = await getReferralOverview(wallet);
        const bound = overview?.referredBy?.wallet;
        if (bound && isAddress(bound) && bound.toLowerCase() !== wallet) {
          if (!cancelled) setReferrer(bound.toLowerCase() as `0x${string}`);
          forgetCode();
          return;
        }

        const code = storedCode();
        if (code) {
          const resolved = await resolveReferralCode(code);
          const candidate = resolved?.wallet;
          if (candidate && isAddress(candidate) && candidate.toLowerCase() !== wallet) {
            if (!cancelled) setReferrer(candidate.toLowerCase() as `0x${string}`);
            void bindReferral(wallet, code).then((boundRow) => {
              if (boundRow) forgetCode();
            });
            return;
          }
        }

        if (!cancelled) setReferrer(null);
      } catch {
        if (!cancelled) setReferrer(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [address]);

  const onChainReady = referralPlatformBps !== undefined && referralPlatformBps > 0;

  return onChainReady ? referrer : null;
}
