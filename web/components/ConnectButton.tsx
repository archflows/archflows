"use client";

import { useAppKit } from "@reown/appkit/react";
import { useAccount, useSwitchChain } from "wagmi";
import { NETWORK_NAME, arcChain } from "@/lib/chain";
import { useMounted } from "@/hooks/useMounted";
import { WalletConnectButton } from "@/components/WalletConnectButton";
import { toast } from "sonner";

export function ConnectButton() {
  const mounted = useMounted();
  const { open } = useAppKit();
  const { address, isConnected, chainId } = useAccount();
  const { switchChain } = useSwitchChain();

  if (!mounted) {
    return (
      <button type="button" disabled className="btn ghost sm">
        Connect
      </button>
    );
  }

  if (!isConnected) {
    return <WalletConnectButton size="sm" label="Connect" compact />;
  }

  if (chainId !== arcChain.id) {
    return (
      <button type="button" className="btn sm" onClick={() => switchChain({ chainId: arcChain.id })}>
        Switch to {NETWORK_NAME}
      </button>
    );
  }

  return (
    <button
      type="button"
      className="btn ghost sm mono"
      title="Wallet"
      onClick={() => {
        void (async () => {
          try {
            await open({ view: "Account" });
          } catch (error) {
            console.warn("[wallet]", error);
            toast.error("Could not open the wallet modal.");
          }
        })();
      }}
    >
      {address?.slice(0, 6)}…{address?.slice(-4)}
    </button>
  );
}
