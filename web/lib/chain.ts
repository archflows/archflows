import { defineChain } from "viem";
import { af } from "./public-env";

function parseChainId(raw: string, fallback: number) {
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function wsFromHttp(url: string) {
  if (url.startsWith("https://")) return `wss://${url.slice("https://".length)}`;
  if (url.startsWith("http://")) return `ws://${url.slice("http://".length)}`;
  return url;
}

export const ARCFLOW_MODE = af.mode.toLowerCase() === "mainnet" ? "mainnet" : "testnet";

export const isMainnet = ARCFLOW_MODE === "mainnet";
export const isTestnet = !isMainnet;
export const NETWORK_BADGE = isMainnet ? "Mainnet" : "Testnet";

const DEFAULT_CHAIN_ID = isMainnet ? 5042 : 5042002;

export const ARC_CHAIN_ID = parseChainId(af.chainId, DEFAULT_CHAIN_ID);

export const ARC_TESTNET_RPC = af.rpcTestnet || "https://rpc.testnet.arc.network";
export const ARC_MAINNET_RPC = af.rpcMainnet || "https://rpc.mainnet.arc.io";
export const ARC_RPC_URL = af.rpc || (isMainnet ? ARC_MAINNET_RPC : ARC_TESTNET_RPC);
export const ARC_WS_URL = wsFromHttp(ARC_RPC_URL);

export const EXPLORER_URL = isMainnet ? "https://explorer.arc.io" : "https://testnet.arcscan.app";
/**
 * Blockscout JSON API origin. Testnet `arcscan.app` 301s to `explorer.testnet.arc.io`
 * without CORS headers, so browser `fetch()` throws TypeError: Failed to fetch.
 */
export const EXPLORER_API_URL = isMainnet
  ? "https://explorer.arc.io"
  : "https://explorer.testnet.arc.io";
export const FAUCET_URL = "https://faucet.circle.com";

export function explorerTxUrl(hash: string) {
  return `${EXPLORER_URL}/tx/${hash}`;
}

export function explorerAddressUrl(address: string) {
  return `${EXPLORER_URL}/address/${address}`;
}

export const arcChain = defineChain({
  id: ARC_CHAIN_ID,
  name: isMainnet ? "Arc" : "Arc Testnet",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: {
    default: {
      http: [ARC_RPC_URL],
      webSocket: [ARC_WS_URL],
    },
  },
  blockExplorers: {
    default: { name: "Arcscan", url: EXPLORER_URL },
  },
  testnet: isTestnet,
});

/** Active Arc chain for the current mode. Prefer `arcChain`. */
export const ARC_TESTNET = arcChain;
export const NETWORK_NAME = arcChain.name;

export const ZERO = "0x0000000000000000000000000000000000000000" as `0x${string}`;

function publicAddress(envValue: string | undefined, fallback: `0x${string}`): `0x${string}` {
  const value = (envValue ?? "").trim();
  if (/^0x[a-fA-F0-9]{40}$/.test(value)) return value as `0x${string}`;
  return fallback;
}

export const ARCFLOW_ADDRESS = publicAddress(af.lock, ZERO);
export const ARCFLOW_DISTRIBUTOR_ADDRESS = publicAddress(af.distributor, ZERO);
export const ARCFLOW_STAKING_ADDRESS = publicAddress(af.staking, ZERO);
export const ARCFLOW_STREAM_ADDRESS = publicAddress(af.stream, ZERO);
export const ARCFLOW_ESCROW_ADDRESS = publicAddress(af.escrow, ZERO);

/** Arc USDC ERC-20 interface. 6 decimals. Same asset as native gas — never double-count. */
export const USDC_ADDRESS = "0x3600000000000000000000000000000000000000" as `0x${string}`;
export const USDC_DECIMALS = 6;
/** $10 lock fee in the ERC-20 6-decimal view. Charged by the contract per lock() call. */
export const LOCK_FEE_UNITS = 10n * 10n ** 6n;
/**
 * $15 flat price for one create that splits across several unlock wallets.
 * Charged once on-chain via `lockSplit` / `lockSplitWithReferral`. Referral is 15% of this $15,
 * same split as a $10 lock: share to the referral pool, rest to the platform treasury.
 */
export const SPLIT_LOCK_FEE_UNITS = 15n * 10n ** 6n;

/** What a create costs the user. Split is $15 once; a single destination is $10. */
export function netCreateFeeUnits(lockCount: number) {
  if (lockCount <= 1) return LOCK_FEE_UNITS;
  return SPLIT_LOCK_FEE_UNITS;
}

/** Arc mempool rejects txs below 20 gwei. */
export const MIN_MAX_FEE_PER_GAS = 20n * 10n ** 9n;
