import "./appkit-guards";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { defineChain } from "@reown/appkit/networks";
import { cookieStorage, createStorage, http } from "@wagmi/core";
import { ARC_CHAIN_ID, ARC_RPC_URL, EXPLORER_URL, arcChain, isTestnet } from "./chain";
import { af } from "./public-env";

export const projectId = af.reown;

export const arcNetwork = defineChain({
  id: ARC_CHAIN_ID,
  caipNetworkId: `eip155:${ARC_CHAIN_ID}`,
  chainNamespace: "eip155",
  name: arcChain.name,
  nativeCurrency: arcChain.nativeCurrency,
  rpcUrls: {
    default: {
      http: [ARC_RPC_URL],
    },
  },
  blockExplorers: {
    default: { name: "Arcscan", url: EXPLORER_URL },
  },
  testnet: isTestnet,
});

export const networks = [arcNetwork] as [typeof arcNetwork, ...typeof arcNetwork[]];

export const customRpcUrls = {
  [arcNetwork.caipNetworkId]: [{ url: ARC_RPC_URL, config: { batch: true } }],
};

export const wagmiAdapter = new WagmiAdapter({
  storage: createStorage({
    storage: cookieStorage,
  }),
  ssr: true,
  projectId,
  networks,
  pollingInterval: 12_000,
  transports: {
    [arcChain.id]: http(ARC_RPC_URL, { batch: true }),
  },
  customRpcUrls,
});
