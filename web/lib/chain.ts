import { defineChain } from "viem";

export const ARC_TESTNET = defineChain({
  id: 5042002,
  name: "Arc Testnet",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.testnet.arc.network"] },
  },
  blockExplorers: {
    default: { name: "Arcscan", url: "https://testnet.arcscan.app" },
  },
  testnet: true,
});

const ZERO = "0x0000000000000000000000000000000000000000";

/** Current Arc Testnet lock vault (fee → 0x257666…E6C5). */
export const ARCFLOW_ADDRESS =
  "0xbfbc6d4889b21ABFAeDc145aef3760529E3329b6" as `0x${string}`;

function publicAddress(envValue: string | undefined, fallback: `0x${string}`): `0x${string}` {
  const value = (envValue ?? "").trim();
  if (/^0x[a-fA-F0-9]{40}$/.test(value)) return value as `0x${string}`;
  return fallback;
}

export const ARCFLOW_DISTRIBUTOR_ADDRESS = publicAddress(
  process.env.NEXT_PUBLIC_ARCFLOW_DISTRIBUTOR_ADDRESS,
  ZERO,
);
export const ARCFLOW_STAKING_ADDRESS = publicAddress(
  process.env.NEXT_PUBLIC_ARCFLOW_STAKING_ADDRESS,
  ZERO,
);
export const ARCFLOW_STREAM_ADDRESS = publicAddress(process.env.NEXT_PUBLIC_ARCFLOW_STREAM_ADDRESS, ZERO);
export const ARCFLOW_ESCROW_ADDRESS = publicAddress(process.env.NEXT_PUBLIC_ARCFLOW_ESCROW_ADDRESS, ZERO);

/** Arc USDC ERC-20 interface. 6 decimals. Same asset as native gas — never double-count. */
export const USDC_ADDRESS = "0x3600000000000000000000000000000000000000" as `0x${string}`;
export const USDC_DECIMALS = 6;
/** $10 lock fee in the ERC-20 6-decimal view. */
export const LOCK_FEE_UNITS = 10n * 10n ** 6n;

export const EXPLORER_URL = "https://testnet.arcscan.app";
export const FAUCET_URL = "https://faucet.circle.com";

/** Arc mempool rejects txs below 20 gwei. */
export const MIN_MAX_FEE_PER_GAS = 20n * 10n ** 9n;
