/** Client aliases only. Server env names never appear in the browser bundle. */
function normalizeSiteUrl(raw: string) {
  const value = raw.trim().replace(/\/$/, "");
  if (!value) return "https://arcflows.finance";
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
}

export const af = {
  mode: process.env.AF_MODE || "testnet",
  chainId: process.env.AF_CHAIN || "5042002",
  rpc: process.env.AF_RPC || "https://rpc.testnet.arc.network",
  rpcTestnet: process.env.AF_RPC_TN || "https://rpc.testnet.arc.network",
  rpcMainnet: process.env.AF_RPC_MN || "https://rpc.arc.network",
  reown: process.env.AF_REOWN || "",
  lock: process.env.AF_LOCK || "",
  stream: process.env.AF_STREAM || "",
  distributor: process.env.AF_DIST || "",
  escrow: process.env.AF_ESCROW || "",
  staking: process.env.AF_STAKE || "",
  site: normalizeSiteUrl(
    process.env.AF_SITE ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.SITE_URL ||
      process.env.RAILWAY_PUBLIC_DOMAIN ||
      (process.env.NODE_ENV === "production" ? "https://arcflows.finance" : "http://localhost:3000"),
  ),
} as const;
