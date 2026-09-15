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

const mode = firstEnv(["ARCFLOW_MODE", "NEXT_PUBLIC_ARCFLOW_MODE"], "testnet").toLowerCase();
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
    ["ARC_RPC", "NEXT_PUBLIC_ARC_RPC", "ARC_TESTNET_RPC", "ARC_TESTNET_RPC_URL", "ARC_MAINNET_RPC"],
    isMainnet ? "https://rpc.arc.network" : "https://rpc.testnet.arc.network",
  ),
  contracts: {
    lock: firstEnv(["ARCFLOW_ADDRESS", "NEXT_PUBLIC_ARCFLOW_ADDRESS"]),
    stream: firstEnv(["ARCFLOW_STREAM_ADDRESS", "NEXT_PUBLIC_ARCFLOW_STREAM_ADDRESS"]),
    distributor: firstEnv(["ARCFLOW_DISTRIBUTOR_ADDRESS", "NEXT_PUBLIC_ARCFLOW_DISTRIBUTOR_ADDRESS"]),
    escrow: firstEnv(["ARCFLOW_ESCROW_ADDRESS", "NEXT_PUBLIC_ARCFLOW_ESCROW_ADDRESS"]),
    staking: firstEnv(["ARCFLOW_STAKING_ADDRESS", "NEXT_PUBLIC_ARCFLOW_STAKING_ADDRESS"]),
    treasury: firstEnv(["ARCFLOW_TREASURY"]),
  },
  lockFeeUsdc: "10",
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
