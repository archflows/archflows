"use client";

import { useCallback, useEffect, useState } from "react";
import { useAccount, useSignMessage } from "wagmi";
import {
  getReferralOverview,
  requestReferralWithdrawal,
  type ReferralOverview,
} from "@/lib/backend";

/** Must match `withdrawalMessage()` in backend/src/lib/chain.js byte for byte. */
function withdrawalMessage(wallet: string, amount: string, nonce: string) {
  return [
    "ArcFlow referral withdrawal",
    `Wallet: ${wallet}`,
    `Amount: ${amount} USDC units`,
    `Nonce: ${nonce}`,
  ].join("\n");
}

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

  /**
   * The signature proves the request came from the referrer's wallet. Payouts always land on
   * that same wallet, so there is no destination for an attacker to redirect.
   */
  const withdraw = useCallback(
    async (amountUnits: bigint) => {
      if (!wallet) throw new Error("Connect a wallet first.");
      setWithdrawing(true);
      try {
        const amount = amountUnits.toString();
        const nonce = Date.now().toString();
        const signature = await signMessageAsync({
          message: withdrawalMessage(wallet, amount, nonce),
        });
        const result = await requestReferralWithdrawal({ wallet, amount, nonce, signature });
        if (!result) throw new Error("Withdrawal was rejected. Check your balance and try again.");
        await refresh();
        return result;
      } finally {
        setWithdrawing(false);
      }
    },
    [wallet, signMessageAsync, refresh],
  );

  return { data, loading, withdrawing, isConnected, address, refresh, withdraw };
}
