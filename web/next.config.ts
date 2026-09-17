import type { NextConfig } from "next";
import path from "path";

function env(...keys: string[]) {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return "";
}

function siteUrl() {
  const raw =
    env("SITE_URL", "NEXT_PUBLIC_SITE_URL", "RAILWAY_PUBLIC_DOMAIN") ||
    (process.env.NODE_ENV === "production" ? "https://arcflows.finance" : "http://localhost:3000");
  const value = raw.replace(/\/$/, "");
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
}

const arcflowMode =
  env("ARCFLOW_MODE", "NEXT_PUBLIC_ARCFLOW_MODE").toLowerCase() === "testnet" ? "testnet" : "mainnet";

const defaultChainId = arcflowMode === "mainnet" ? "5042" : "5042002";
const chainId = env("CHAIN_ID", "NEXT_PUBLIC_CHAIN_ID") || defaultChainId;

const testnetRpc =
  env(
    "ARC_TESTNET_RPC",
    "ARC_TESTNET_RPC_URL",
    "NEXT_PUBLIC_ARC_TESTNET_RPC",
    "NEXT_PUBLIC_ARC_TESTNET_RPC_URL",
  ) || "https://rpc.testnet.arc.network";

const mainnetRpc =
  env(
    "ARC_MAINNET_RPC",
    "ARC_MAINNET_RPC_URL",
    "NEXT_PUBLIC_ARC_MAINNET_RPC",
    "NEXT_PUBLIC_ARC_MAINNET_RPC_URL",
  ) || "https://rpc.mainnet.arc.io";

const rpc = arcflowMode === "mainnet" ? mainnetRpc : testnetRpc;

const reownProjectId = env(
  "REOWN_PROJECTID",
  "REOWN_PROJECT_ID",
  "NEXT_PUBLIC_REOWN_PROJECT_ID",
  "NEXT_PUBLIC_PROJECT_ID",
);

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: path.join(__dirname),
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups",
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/dashboard/locks",
        has: [{ type: "query", key: "tab", value: "positions" }],
        destination: "/dashboard/locks/positions",
        permanent: false,
      },
      {
        source: "/dashboard/vesting",
        has: [{ type: "query", key: "tab", value: "positions" }],
        destination: "/dashboard/vesting/positions",
        permanent: false,
      },
      {
        source: "/dashboard/streams",
        has: [{ type: "query", key: "tab", value: "positions" }],
        destination: "/dashboard/streams/positions",
        permanent: false,
      },
      {
        source: "/dashboard/create",
        destination: "/dashboard/locks",
        permanent: false,
      },
    ];
  },
  onDemandEntries: {
    maxInactiveAge: 60 * 60 * 1000,
    pagesBufferLength: 8,
  },
  images: {
    qualities: [75, 92, 95],
  },
  experimental: {
    // Keep this to icon/chart barrels only. wagmi/viem/appkit here make Next emit
    // vendor-chunks/@wagmi.js that then go missing after HMR and crash the dashboard.
    optimizePackageImports: ["lucide-react", "recharts"],
  },
  env: {
    AF_MODE: arcflowMode,
    AF_CHAIN: chainId,
    AF_RPC: rpc,
    AF_RPC_TN: testnetRpc,
    AF_RPC_MN: mainnetRpc,
    AF_REOWN: reownProjectId,
    AF_LOCK: env("ARCFLOW_ADDRESS", "NEXT_PUBLIC_ARCFLOW_ADDRESS"),
    AF_STREAM: env("ARCFLOW_STREAM_ADDRESS", "NEXT_PUBLIC_ARCFLOW_STREAM_ADDRESS"),
    AF_DIST: env("ARCFLOW_DISTRIBUTOR_ADDRESS", "NEXT_PUBLIC_ARCFLOW_DISTRIBUTOR_ADDRESS"),
    AF_ESCROW: env("ARCFLOW_ESCROW_ADDRESS", "NEXT_PUBLIC_ARCFLOW_ESCROW_ADDRESS"),
    AF_STAKE: env("ARCFLOW_STAKING_ADDRESS", "NEXT_PUBLIC_ARCFLOW_STAKING_ADDRESS"),
    AF_SITE: siteUrl(),
  },
  serverExternalPackages: ["pino", "pino-pretty", "lokijs", "encoding"],
  webpack: (config) => {
    config.externals.push("pino-pretty", "lokijs", "encoding");
    if (config.output) {
      config.output.chunkLoadTimeout = 300_000;
    }
    config.resolve.alias = {
      ...config.resolve.alias,
      "@react-native-async-storage/async-storage": false,
    };
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    return config;
  },
};

export default nextConfig;
