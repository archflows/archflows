import {
  createPublicClient,
  createWalletClient,
  defineChain,
  http,
  parseAbi,
  parseEventLogs,
  verifyMessage,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { config } from "../config.js";
import { AppError, badRequest } from "../errors.js";

export const arcFlowFeeAbi = parseAbi([
  "event FeePaid(uint256 indexed id, address indexed from, uint128 amount)",
]);

export const erc20Abi = parseAbi([
  "function transfer(address to, uint256 amount) returns (bool)",
  "function balanceOf(address account) view returns (uint256)",
]);

const arcChain = defineChain({
  id: config.chainId,
  name: config.mode === "mainnet" ? "Arc" : "Arc Testnet",
  // Gas is USDC. The native view is 18 decimals; the ERC-20 view at config.usdc is 6.
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: { default: { http: [config.rpc] } },
  testnet: config.mode !== "mainnet",
});

/** Arc mempool floor. Sub-second finality, so there is no multi-block wait after this. */
const gasOverrides = {
  maxFeePerGas: BigInt(config.minMaxFeePerGasWei),
  maxPriorityFeePerGas: 1n,
};

let publicClientRef;
let payoutClientRef;

export function publicClient() {
  publicClientRef ??= createPublicClient({
    chain: arcChain,
    transport: http(config.rpc, { timeout: 15_000 }),
  });
  return publicClientRef;
}

export function payoutWallet() {
  if (payoutClientRef !== undefined) return payoutClientRef;
  const key = config.referral.payoutKey;
  if (!key) {
    payoutClientRef = null;
    return null;
  }
  const account = privateKeyToAccount(key.startsWith("0x") ? key : `0x${key}`);
  payoutClientRef = createWalletClient({
    account,
    chain: arcChain,
    transport: http(config.rpc, { timeout: 15_000 }),
  });
  return payoutClientRef;
}

export function payoutAddress() {
  return payoutWallet()?.account.address.toLowerCase() ?? null;
}

/**
 * Confirm the referee really paid a lock fee on Arc before any commission is credited.
 * The report arrives from the browser, so nothing in it is trusted: the fee amount used
 * for the commission is read back out of the `FeePaid` log, never from the request body.
 *
 * @returns fee actually paid, in USDC 6-decimal units, as a string.
 */
export async function verifyLockFee({ txHash, lockId, referee }) {
  const arcflow = config.contracts.lock;
  if (!arcflow) {
    throw new AppError(503, "unavailable", "Lock contract address is not configured");
  }

  let receipt;
  try {
    receipt = await publicClient().getTransactionReceipt({ hash: txHash });
  } catch {
    throw badRequest("Transaction not found on Arc");
  }
  if (receipt.status !== "success") throw badRequest("Transaction reverted on Arc");

  const logs = parseEventLogs({
    abi: arcFlowFeeAbi,
    eventName: "FeePaid",
    logs: receipt.logs.filter((log) => log.address.toLowerCase() === arcflow.toLowerCase()),
  });

  const match = logs.find((log) => String(log.args.id) === String(lockId));
  if (!match) throw badRequest(`No fee was paid for lock ${lockId} in this transaction`);
  if (match.args.from.toLowerCase() !== referee.toLowerCase()) {
    throw badRequest("The lock fee in this transaction was paid by a different wallet");
  }

  return match.args.amount.toString();
}

/** Signed by the referrer's own wallet so a withdrawal cannot be triggered by anyone else. */
export function withdrawalMessage({ wallet, amount, nonce }) {
  return [
    "arcflows referral withdrawal",
    `Wallet: ${wallet}`,
    `Amount: ${amount} USDC units`,
    `Nonce: ${nonce}`,
  ].join("\n");
}

export async function assertWithdrawalSignature({ wallet, amount, nonce, signature }) {
  const issuedAt = Number(nonce);
  if (!Number.isFinite(issuedAt)) throw badRequest("nonce must be a millisecond timestamp");
  const age = Date.now() - issuedAt;
  if (age > config.referral.signatureTtlMs || age < -60_000) {
    throw badRequest("Signature expired, retry the withdrawal");
  }

  const valid = await verifyMessage({
    address: wallet,
    message: withdrawalMessage({ wallet, amount, nonce }),
    signature,
  }).catch(() => false);
  if (!valid) throw badRequest("Signature does not match the wallet");
}

export async function usdcBalanceOf(address) {
  return publicClient().readContract({
    address: config.usdc,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [address],
  });
}

/** Moves USDC out of the archFee wallet. Amount is in the 6-decimal ERC-20 view. */
export async function sendUsdcPayout({ to, amount }) {
  const wallet = payoutWallet();
  if (!wallet) {
    throw new AppError(503, "unavailable", "Referral payout wallet is not configured");
  }

  const value = BigInt(amount);
  const balance = await usdcBalanceOf(wallet.account.address);
  if (balance < value) {
    throw new AppError(503, "unavailable", "Payout wallet is out of USDC, try again later");
  }

  const hash = await wallet.writeContract({
    address: config.usdc,
    abi: erc20Abi,
    functionName: "transfer",
    args: [to, value],
    ...gasOverrides,
  });

  const receipt = await publicClient().waitForTransactionReceipt({ hash, timeout: 60_000 });
  if (receipt.status !== "success") throw new AppError(502, "payout_failed", "Payout transaction reverted");
  return hash;
}
