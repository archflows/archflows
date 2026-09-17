"use client";

import { useCallback, useEffect, useState } from "react";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import { arcFlowAbi } from "@/lib/abi";
import { getReferralOverview, type ReferralOverview } from "@/lib/backend";
import { ARCFLOW_ADDRESS, MIN_MAX_FEE_PER_GAS, ZERO } from "@/lib/chain";
import { confirmTx } from "@/lib/tx";

const gas = { maxFeePerGas: MIN_MAX_FEE_PER_GAS, maxPriorityFeePerGas: 1n };

export function useReferral() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

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

  /** User claims on-chain and pays gas in USDC (Arc native gas). */
  const withdraw = useCallback(
    async (amountUnits: bigint) => {
      if (!wallet) throw new Error("Connect a wallet first.");
      if (!publicClient) throw new Error("Arc RPC is not ready.");
      if (ARCFLOW_ADDRESS === ZERO) throw new Error("Lock contract is not configured.");

      setWithdrawing(true);
      try {
        const hash = await writeContractAsync({
          address: ARCFLOW_ADDRESS,
          abi: arcFlowAbi,
          functionName: "claimReferral",
          args: [amountUnits],
          ...gas,
        });
        await confirmTx(publicClient, hash, { fee: true });
        await refresh();
        return { tx_hash: hash, status: "paid" as const };
      } finally {
        setWithdrawing(false);
      }
    },
    [wallet, publicClient, writeContractAsync, refresh],
  );

  return { data, loading, withdrawing, isConnected, address, refresh, withdraw };
}
