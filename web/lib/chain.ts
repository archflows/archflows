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

export const ARCFLOW_ADDRESS = (process.env.NEXT_PUBLIC_ARCFLOW_ADDRESS ??
  "0x0000000000000000000000000000000000000000") as `0x${string}`;

export const EXPLORER_URL = "https://testnet.arcscan.app";
export const FAUCET_URL = "https://faucet.circle.com";

/** Arc mempool rejects txs below 20 gwei. */
export const MIN_MAX_FEE_PER_GAS = 20n * 10n ** 9n;
