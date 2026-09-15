/** Client aliases only. Server env names never appear in the browser bundle. */
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
  site: process.env.AF_SITE || "http://localhost:3000",
} as const;
