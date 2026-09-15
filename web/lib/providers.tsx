"use client";

import "./appkit-guards";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createAppKit } from "@reown/appkit/react";
import { type ReactNode, useState } from "react";
import { cookieToInitialState, WagmiProvider, type Config } from "wagmi";
import { NETWORK_NAME } from "./chain";
import { customRpcUrls, networks, projectId, wagmiAdapter } from "./wagmi";
import { af } from "./public-env";

const siteUrl = af.site;

const appKit = createAppKit({
  adapters: [wagmiAdapter],
  projectId,
  networks,
  defaultNetwork: networks[0],
  metadata: {
    name: "ArcFlow",
    description: `Token locks and vesting on ${NETWORK_NAME}. Gas paid in USDC.`,
    url: siteUrl,
    icons: [`${siteUrl}/logo-mark.png`],
  },
  features: {
    analytics: false,
    email: false,
    socials: false,
    emailShowWallets: true,
    onramp: false,
    swaps: false,
    history: false,
    connectMethodsOrder: ["wallet"],
  },
  themeMode: "dark",
  enableEIP6963: true,
  enableInjected: true,
  enableWalletConnect: true,
  enableWalletGuide: false,
  enableBaseAccount: false,
  enableCoinbase: true,
  defaultAccountTypes: { eip155: "eoa" },
  customRpcUrls,
});

appKit.updateRemoteFeatures({ email: false, socials: false, activity: false });
appKit.subscribeRemoteFeatures((remote) => {
  const socialsOn = Array.isArray(remote?.socials) && remote.socials.length > 0;
  if (remote?.email || socialsOn || remote?.activity) {
    appKit.updateRemoteFeatures({ email: false, socials: false, activity: false });
  }
});

export function Providers({
  children,
  cookies,
}: {
  children: ReactNode;
  cookies?: string | null;
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 45_000,
            gcTime: 10 * 60_000,
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
            retry: 1,
          },
        },
      }),
  );

  const initialState = cookieToInitialState(wagmiAdapter.wagmiConfig as Config, cookies);

  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig as Config} initialState={initialState}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
