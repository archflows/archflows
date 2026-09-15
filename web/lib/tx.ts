import type { Abi, Hash, TransactionReceipt } from "viem";
import { decodeEventLog } from "viem";
import { toast } from "sonner";
import { MIN_MAX_FEE_PER_GAS, explorerTxUrl } from "@/lib/chain";

export const arcGas = {
  maxFeePerGas: MIN_MAX_FEE_PER_GAS,
  maxPriorityFeePerGas: 1n,
} as const;

export const MAX_U128 = (1n << 128n) - 1n;

export function txMessage(err: unknown) {
  const raw = err instanceof Error ? err.message.split("\n")[0] : "Transaction failed.";
  const text = `${raw} ${err instanceof Error ? err.cause ?? "" : ""}`;
  if (/user rejected|denied transaction|rejected the request/i.test(text)) {
    return "Transaction cancelled in wallet.";
  }
  if (/NotBeneficiary/i.test(text)) return "Only the beneficiary can claim this position.";
  if (/NothingToClaim/i.test(text)) return "Nothing to claim yet.";
  if (/NotRecipient/i.test(text)) return "Only the recipient can do that.";
  if (/NotSender/i.test(text)) return "Only the sender can do that.";
  if (/NothingToWithdraw/i.test(text)) return "Nothing withdrawable yet.";
  if (/NotCancelable/i.test(text)) return "This stream cannot be cancelled.";
  if (/SettleFirst/i.test(text)) return "Withdraw vested tokens before transferring.";
  if (/NotTransferable/i.test(text)) return "This stream cannot be transferred.";
  if (/NotTopupable/i.test(text)) return "This stream does not allow top-ups.";
  if (/ZeroAmount/i.test(text)) return "Amount must be greater than zero.";
  if (/ZeroAddress/i.test(text)) return "Enter a valid address.";
  if (/InvalidSchedule/i.test(text)) return "This stream has already ended.";
  if (/AmountTooLarge/i.test(text)) return "Amount exceeds uint128.";
  if (/insufficient (allowance|funds)|exceeds allowance/i.test(text)) {
    return "Token allowance or balance is too low.";
  }
  return raw;
}

type WaitClient = {
  waitForTransactionReceipt: (args: { hash: Hash }) => Promise<TransactionReceipt>;
};

/** Wait for a receipt. Opens an Arcscan toast for every tx except the $10 lock fee. */
export async function confirmTx(
  client: WaitClient,
  hash: Hash,
  opts?: { fee?: boolean },
): Promise<TransactionReceipt> {
  const receipt = await client.waitForTransactionReceipt({ hash });
  if (!opts?.fee) {
    const url = explorerTxUrl(hash);
    toast.success("Transaction confirmed", {
      description: explorerTxUrl(hash).replace(/^https:\/\//, ""),
      duration: 12_000,
      action: {
        label: "Explorer",
        onClick: () => {
          window.open(url, "_blank", "noopener,noreferrer");
        },
      },
    });
  }
  return receipt;
}

export function eventArgs<T>(receipt: TransactionReceipt, abi: Abi, eventName: string): T[] {
  const out: T[] = [];
  for (const log of receipt.logs) {
    try {
      const parsed = decodeEventLog({ abi, data: log.data, topics: log.topics, strict: false });
      if (parsed.eventName === eventName) out.push(parsed.args as T);
    } catch {
      // skip unrelated logs
    }
  }
  return out;
}
