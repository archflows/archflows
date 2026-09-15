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
    [ARC_TESTNET.id]: http("https://rpc.testnet.arc.network", {
      batch: true,
    }),
  },
  ssr: true,
  multiInjectedProviderDiscovery: true,
});

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            gcTime: 5 * 60_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
