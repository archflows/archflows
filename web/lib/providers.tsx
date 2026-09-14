"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode, useState } from "react";
import { injected } from "@wagmi/core";
import { http, WagmiProvider, createConfig } from "wagmi";
import { ARC_TESTNET } from "./chain";

const config = createConfig({
  chains: [ARC_TESTNET],
  connectors: [
    injected({
      shimDisconnect: true,
    }),
  ],
  transports: {
    [ARC_TESTNET.id]: http("https://rpc.testnet.arc.network"),
  },
  ssr: true,
  multiInjectedProviderDiscovery: true,
});

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
