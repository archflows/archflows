import { createPublicClient, http, type Address } from "viem";
import { arcFlowAbi, erc20Abi } from "@/lib/abi";
import { ARC_TESTNET, ARCFLOW_ADDRESS } from "@/lib/chain";
import { formatCompactAmount } from "@/lib/format-amount";
import { dateFmt, formatDuration, ZERO } from "@/lib/form-time";
import { lockProofStatus, type LockProofStatus } from "@/lib/lock-status";

export type LockOgData = {
  id: string;
  exists: boolean;
  symbol: string;
  amountLabel: string;
  status: LockProofStatus;
  durationLabel: string;
  tokenShort: string;
  unlockLabel: string;
  supplyShare: string;
  beneficiaryShort: string;
};

function short(value?: string) {
  if (!value) return "—";
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

function formatSupplyShare(amount: bigint, totalSupply: bigint) {
  if (totalSupply === 0n) return "—";
  const scaled = (amount * 10000n) / totalSupply;
  if (scaled === 0n && amount > 0n) return "<0.01%";
  const pct = Number(scaled) / 100;
  return `${pct.toLocaleString("en-US", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  })}%`;
}

export function emptyLockOg(id: string): LockOgData {
  return {
    id,
    exists: false,
    symbol: "TOKEN",
    amountLabel: "—",
    status: "Locked",
    durationLabel: "Set duration",
    tokenShort: "—",
    unlockLabel: "—",
    supplyShare: "—",
    beneficiaryShort: "—",
  };
}

export async function getLockOgData(id: string): Promise<LockOgData> {
  const fallback = emptyLockOg(id);
  if (!/^\d+$/.test(id)) return fallback;

  try {
    const client = createPublicClient({
      chain: ARC_TESTNET,
      transport: http(ARC_TESTNET.rpcUrls.default.http[0]),
    });

    const position = await client.readContract({
      address: ARCFLOW_ADDRESS,
      abi: arcFlowAbi,
      functionName: "positions",
      args: [BigInt(id)],
    });

    const [token, beneficiary, , amount, claimed, start, , end] = position;
    if (!token || token === (ZERO as Address)) return fallback;

    const [symbol, decimals, totalSupply] = await Promise.all([
      client.readContract({
        address: token,
        abi: erc20Abi,
        functionName: "symbol",
      }),
      client.readContract({
        address: token,
        abi: erc20Abi,
        functionName: "decimals",
      }),
      client.readContract({
        address: token,
        abi: erc20Abi,
        functionName: "totalSupply",
      }),
    ]);

    const durationSec = Number(end - start);
    const status = lockProofStatus({ amount, claimed, end });

    return {
      id,
      exists: true,
      symbol: symbol?.trim() || "TOKEN",
      amountLabel: formatCompactAmount(amount, decimals),
      status,
      durationLabel: formatDuration(durationSec),
      tokenShort: short(token),
      unlockLabel: `${dateFmt.format(new Date(Number(end) * 1000))} UTC`,
      supplyShare: formatSupplyShare(amount, totalSupply),
      beneficiaryShort: short(beneficiary),
    };
  } catch {
    return fallback;
  }
}
