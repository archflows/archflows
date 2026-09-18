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
  "event Locked(uint256 indexed id, address indexed token, address indexed beneficiary, address creator, uint128 amount, uint64 start, uint64 cliff, uint64 end)",
]);

export const arcFlowReferralAbi = parseAbi([
  "function referralBalances(address referrer) view returns (uint256)",
  "function referralPlatformBps() view returns (uint16)",
  "function referralWallet() view returns (address)",
  "function withdrawReferral(address referrer, uint128 amount)",
  "function withdrawExecutor() view returns (address)",
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
let withdrawExecutorClientRef;

export function publicClient() {
  publicClientRef ??= createPublicClient({
    chain: arcChain,
    transport: http(config.rpc, { timeout: 15_000 }),
  });
  return publicClientRef;
}

function walletClientFromKey(key) {
  if (!key) return null;
  const account = privateKeyToAccount(key.startsWith("0x") ? key : `0x${key}`);
  return createWalletClient({
    account,
    chain: arcChain,
    transport: http(config.rpc, { timeout: 15_000 }),
  });
}

export function payoutWallet() {
  if (payoutClientRef !== undefined) return payoutClientRef;
  payoutClientRef = walletClientFromKey(config.referral.rebateKey) ?? null;
  return payoutClientRef;
}

export function payoutAddress() {
  return payoutWallet()?.account.address.toLowerCase() ?? null;
}

export function withdrawExecutorWallet() {
  if (withdrawExecutorClientRef !== undefined) return withdrawExecutorClientRef;
  withdrawExecutorClientRef =
    walletClientFromKey(config.referral.withdrawExecutorKey) ?? null;
  return withdrawExecutorClientRef;
}

export function withdrawExecutorAddress() {
  return withdrawExecutorWallet()?.account.address.toLowerCase() ?? null;
}

export async function referralClaimsEnabled() {
  const lock = config.contracts.lock;
  if (!lock || !withdrawExecutorWallet()) return false;
  try {
    const [platformBps, pool, executor] = await Promise.all([
      publicClient().readContract({
        address: lock,
        abi: arcFlowReferralAbi,
        functionName: "referralPlatformBps",
      }),
      publicClient().readContract({
        address: lock,
        abi: arcFlowReferralAbi,
        functionName: "referralWallet",
      }),
      publicClient().readContract({
        address: lock,
        abi: arcFlowReferralAbi,
        functionName: "withdrawExecutor",
      }),
    ]);
    const zero = "0x0000000000000000000000000000000000000000";
    return Number(platformBps) > 0 && pool.toLowerCase() !== zero && executor.toLowerCase() !== zero;
  } catch {
    return false;
  }
}

export async function readReferralBalance(referrer) {
  const lock = config.contracts.lock;
  if (!lock) return null;
  try {
    const balance = await publicClient().readContract({
      address: lock,
      abi: arcFlowReferralAbi,
      functionName: "referralBalances",
      args: [referrer],
    });
    return BigInt(balance);
  } catch {
    return null;
  }
}

/**
 * Confirm the referee created this lock on Arc. A split batch emits one FeePaid for the
 * whole create, so fee amount is read per transaction, not per lock id.
 */
export async function verifyLockCreated({ txHash, lockId, referee }) {
  const arcflow = config.contracts.lock;
  if (!arcflow) {
    throw new AppError(503, "unavailable", "Lock contract address is not configured");
  }

  const receipt = await lockReceipt(txHash);
  const logs = parseEventLogs({
    abi: arcFlowFeeAbi,
    eventName: "Locked",
    logs: receipt.logs.filter((log) => log.address.toLowerCase() === arcflow.toLowerCase()),
  });
  const match = logs.find((log) => String(log.args.id) === String(lockId));
  if (!match) throw badRequest(`Lock ${lockId} was not created in this transaction`);
  if (match.args.creator.toLowerCase() !== referee.toLowerCase()) {
    throw badRequest("This lock was created by a different wallet");
  }
}

/** Sum of FeePaid logs from `referee` in one tx. A split pays $15 once; N singles pay N × $10. */
export async function sumFeePaidInTx({ txHash, referee }) {
  const arcflow = config.contracts.lock;
  if (!arcflow) {
    throw new AppError(503, "unavailable", "Lock contract address is not configured");
  }

  const receipt = await lockReceipt(txHash);
  const logs = parseEventLogs({
    abi: arcFlowFeeAbi,
    eventName: "FeePaid",
    logs: receipt.logs.filter((log) => log.address.toLowerCase() === arcflow.toLowerCase()),
  });
  const total = logs
    .filter((log) => log.args.from.toLowerCase() === referee.toLowerCase())
    .reduce((sum, log) => sum + BigInt(log.args.amount), 0n);
  if (total <= 0n) throw badRequest("No lock fee was paid in this transaction");
  return total.toString();
}

async function lockReceipt(txHash) {
  let receipt;
  try {
    receipt = await publicClient().getTransactionReceipt({ hash: txHash });
  } catch {
    throw badRequest("Transaction not found on Arc");
  }
  if (receipt.status !== "success") throw badRequest("Transaction reverted on Arc");
  return receipt;
}

/**
 * Confirm the referee really paid a lock fee on Arc before any commission is credited.
 * @returns fee actually paid, in USDC 6-decimal units, as a string.
 */
export async function verifyLockFee({ txHash, lockId, referee }) {
  await verifyLockCreated({ txHash, lockId, referee });
  return sumFeePaidInTx({ txHash, referee });
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

/**
 * Pays a referral withdrawal from the referral pool via `withdrawReferral`.
 * $10 locks and $15 splits both credit `referralBalances` on-chain the same way.
 */
export async function payReferralWithdrawal({ referrer, amount }) {
  return withdrawReferralOnChain({ referrer, amount });
}

/** Relays `withdrawReferral` on the lock contract after the user signed the request. */
export async function withdrawReferralOnChain({ referrer, amount }) {
  const wallet = withdrawExecutorWallet();
  const lock = config.contracts.lock;
  if (!wallet || !lock) {
    throw new AppError(503, "unavailable", "Referral withdrawals are not configured");
  }

  const value = BigInt(amount);
  const onChain = await readReferralBalance(referrer);
  if (onChain === null) {
    throw new AppError(503, "unavailable", "Referral balances are not available on-chain yet");
  }
  if (onChain < value) {
    throw badRequest("On-chain referral balance is lower than the requested amount", {
      onChainUsdc: onChain.toString(),
    });
  }

  const hash = await wallet.writeContract({
    address: lock,
    abi: arcFlowReferralAbi,
    functionName: "withdrawReferral",
    args: [referrer, value],
    ...gasOverrides,
  });

  const receipt = await publicClient().waitForTransactionReceipt({ hash, timeout: 60_000 });
  if (receipt.status !== "success") {
    throw new AppError(502, "withdraw_failed", "Referral withdrawal transaction reverted");
  }
  return hash;
}

/** Moves USDC out of the rebate wallet. Amount is in the 6-decimal ERC-20 view. */
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
