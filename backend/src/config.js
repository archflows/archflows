import { config as loadEnv } from "dotenv";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
loadEnv({ path: path.join(root, ".env"), quiet: true });

function firstEnv(keys, fallback = "") {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return fallback;
}

function splitList(value) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

const mode = firstEnv(["ARCFLOW_MODE", "NEXT_PUBLIC_ARCFLOW_MODE"], "mainnet").toLowerCase();
const isMainnet = mode === "mainnet";

export const config = {
  port: Number.parseInt(firstEnv(["PORT"], "4000"), 10) || 4000,
  env: firstEnv(["NODE_ENV"], "development"),
  databaseUrl: firstEnv(["DATABASE_URL"]),
  apiKeys: splitList(firstEnv(["API_KEYS", "API_KEY"])),
  adminApiKeys: splitList(firstEnv(["ADMIN_API_KEYS", "ADMIN_API_KEY"])),
  corsOrigins: splitList(firstEnv(["CORS_ORIGINS"], "*")),
  poolMax: Number.parseInt(firstEnv(["PG_POOL_MAX"], "20"), 10) || 20,
  statementTimeoutMs: Number.parseInt(firstEnv(["PG_STATEMENT_TIMEOUT_MS"], "8000"), 10) || 8_000,
  statsCacheMs: Number.parseInt(firstEnv(["STATS_CACHE_MS"], "5000"), 10) || 5_000,
  healthCacheMs: Number.parseInt(firstEnv(["HEALTH_CACHE_MS"], "2500"), 10) || 2_500,
  // Loose per-IP cap so a shared frontend key is not a global throttle.
  rateLimitWindowMs: Number.parseInt(firstEnv(["RATE_LIMIT_WINDOW_MS"], "60000"), 10) || 60_000,
  rateLimitMax: Number.parseInt(firstEnv(["RATE_LIMIT_MAX"], "600"), 10),
  mode: isMainnet ? "mainnet" : "testnet",
  chainId: Number.parseInt(firstEnv(["CHAIN_ID", "NEXT_PUBLIC_CHAIN_ID"], isMainnet ? "5042" : "5042002"), 10),
  rpc: firstEnv(
    isMainnet
      ? ["ARC_RPC", "ARC_MAINNET_RPC", "ARC_MAINNET_RPC_URL", "NEXT_PUBLIC_ARC_RPC"]
      : ["ARC_RPC", "ARC_TESTNET_RPC", "ARC_TESTNET_RPC_URL", "NEXT_PUBLIC_ARC_RPC"],
    isMainnet ? "https://rpc.mainnet.arc.io" : "https://rpc.testnet.arc.network",
  ),
  contracts: {
    lock: firstEnv(["ARCFLOW_ADDRESS", "NEXT_PUBLIC_ARCFLOW_ADDRESS"]),
    stream: firstEnv(["ARCFLOW_STREAM_ADDRESS", "NEXT_PUBLIC_ARCFLOW_STREAM_ADDRESS"]),
    distributor: firstEnv(["ARCFLOW_DISTRIBUTOR_ADDRESS", "NEXT_PUBLIC_ARCFLOW_DISTRIBUTOR_ADDRESS"]),
    escrow: firstEnv(["ARCFLOW_ESCROW_ADDRESS", "NEXT_PUBLIC_ARCFLOW_ESCROW_ADDRESS"]),
    staking: firstEnv(["ARCFLOW_STAKING_ADDRESS", "NEXT_PUBLIC_ARCFLOW_STAKING_ADDRESS"]),
    treasury: firstEnv(["ARCFLOW_TREASURY"]),
    referralPool: firstEnv(["ARCFLOW_REFERRAL_WALLET"]),
  },
  lockFeeUsdc: "10",
  fees: {
    // What the contract charges per lock() call, in USDC 6-decimal units.
    lockUnits: firstEnv(["LOCK_FEE_USDC_UNITS"], "10000000"),
    // $15 flat for a split create, charged once on-chain. Referral is 15% of this $15.
    splitUnits: firstEnv(["SPLIT_LOCK_FEE_USDC_UNITS"], "15000000"),
  },
  // Arc USDC ERC-20 view: 6 decimals, same asset as gas. Never the native 18-dec view.
  usdc: firstEnv(["USDC_ADDRESS"], "0x3600000000000000000000000000000000000000"),
  // Arc mempool rejects anything under 20 gwei.
  minMaxFeePerGasWei: firstEnv(["ARC_MIN_MAX_FEE_PER_GAS_WEI"], "20000000000"),
  referral: {
    // Referrer earns 15% of the fee the referee paid...
    rateBps: Number.parseInt(firstEnv(["REFERRAL_RATE_BPS"], "1500"), 10) || 1500,
    // ...and the platform keeps 20% of that commission, so the referrer nets 12% of the fee.
    platformBps: Number.parseInt(firstEnv(["REFERRAL_PLATFORM_BPS"], "2000"), 10) || 2000,
    // 5 USDC floor, in the 6-decimal view.
    minWithdrawUsdc: firstEnv(["REFERRAL_MIN_WITHDRAW_USDC"], "5000000"),
    // Relayer key — only calls `withdrawReferral` on the lock contract (needs gas USDC).
    withdrawExecutorKey: firstEnv([
      "ARCFLOW_WITHDRAW_EXECUTOR_KEY",
      "ARCFLOW_REFERRAL_POOL_KEY",
      "REFERRAL_PAYOUT_PRIVATE_KEY",
    ]),
    // Platform fee wallet key — same wallet as ARCFLOW_TREASURY. Used to refund
    // leftover rebates from old N×$10 splits. Not a third fee sink.
    rebateKey: firstEnv([
      "ARCFLOW_TREASURY_KEY",
      "ARCFLOW_FEE_WALLET_KEY",
      "ARCFLOW_REBATE_WALLET_KEY",
    ]),
    // Withdrawal signatures go stale so a captured one cannot be replayed later.
    signatureTtlMs: Number.parseInt(firstEnv(["REFERRAL_SIGNATURE_TTL_MS"], "600000"), 10) || 600_000,
  },
  swagger: {
    user: firstEnv(["SWAGGER_USER", "SWAGGER_USERNAME"]),
    password: firstEnv(["SWAGGER_PASSWORD"]),
    partnerUser: firstEnv(["SWAGGER_PARTNER_USER"], "partner"),
    partnerPassword: firstEnv(["SWAGGER_PARTNER_PASSWORD"]),
    sessionSecret: firstEnv(["DOCS_SESSION_SECRET"]),
  },
};

export function assertConfig() {
  if (!config.databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }
}
