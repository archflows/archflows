"use client";

import { useCallback, useEffect, useState } from "react";
import { useAccount, useSignMessage } from "wagmi";
import { getReferralOverview, requestReferralWithdrawal, type ReferralOverview } from "@/lib/backend";
import { referralWithdrawalMessage } from "@/lib/referral";

export function useReferral() {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();

  const [data, setData] = useState<ReferralOverview | null>(null);
  const [loading, setLoading] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);

  const wallet = address?.toLowerCase() ?? null;

  const refresh = useCallback(async () => {
    if (!wallet) {
      setData(null);
      return;
    }
    setLoading(true);
    try {
      setData(await getReferralOverview(wallet));
    } finally {
      setLoading(false);
    }
  }, [wallet]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  /** Backend relayer pays gas and pulls USDC from the dedicated referral pool wallet. */
  const withdraw = useCallback(
    async (amountUnits: bigint) => {
      if (!wallet) throw new Error("Connect a wallet first.");

      setWithdrawing(true);
      try {
        const amount = amountUnits.toString();
        const nonce = String(Date.now());
        const signature = await signMessageAsync({
          message: referralWithdrawalMessage(wallet, amount, nonce),
        });
        const row = await requestReferralWithdrawal({
          wallet,
          amount,
          nonce,
          signature,
        });
        await refresh();
        return row;
      } finally {
        setWithdrawing(false);
      }
    },
    [wallet, signMessageAsync, refresh],
  );

  return { data, loading, withdrawing, isConnected, address, refresh, withdraw };
}
