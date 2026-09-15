import { MIN_MAX_FEE_PER_GAS } from "@/lib/chain";

export const arcGas = {
  maxFeePerGas: MIN_MAX_FEE_PER_GAS,
  maxPriorityFeePerGas: 1n,
} as const;

export const MAX_U128 = (1n << 128n) - 1n;

export function txMessage(err: unknown) {
  return err instanceof Error ? err.message.split("\n")[0] : "Transaction failed.";
}
