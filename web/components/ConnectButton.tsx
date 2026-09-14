"use client";

import { useAccount, useDisconnect, useSwitchChain } from "wagmi";
import { ARC_TESTNET } from "@/lib/chain";
import { useMounted } from "@/hooks/useMounted";
import { WalletConnectButton } from "@/components/WalletConnectButton";

export function ConnectButton() {
  const mounted = useMounted();
  const { address, isConnected, chainId } = useAccount();
  const { disconnect } = useDisconnect();
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

  if (chainId !== ARC_TESTNET.id) {
    return (
      <button type="button" className="btn sm" onClick={() => switchChain({ chainId: ARC_TESTNET.id })}>
        Switch to Arc
      </button>
    );
  }

  return (
    <button
      type="button"
      className="btn ghost sm mono"
      title="Disconnect"
      onClick={() => disconnect()}
    >
      {address?.slice(0, 6)}…{address?.slice(-4)}
    </button>
  );
}
