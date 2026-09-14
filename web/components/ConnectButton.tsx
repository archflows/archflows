"use client";

import { useAccount, useDisconnect, useSwitchChain } from "wagmi";
import { ARC_TESTNET } from "@/lib/chain";
import { useMounted } from "@/hooks/useMounted";
import { Button } from "@/components/ui/button";
import { WalletConnectButton } from "@/components/WalletConnectButton";

export function ConnectButton() {
  const mounted = useMounted();
  const { address, isConnected, chainId } = useAccount();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();

  if (!mounted) {
    return (
      <button
        type="button"
        disabled
        className="inline-flex h-7 items-center rounded-lg border border-border px-2.5 text-[0.8rem] font-medium opacity-50"
      >
        Connect
      </button>
    );
  }

  if (!isConnected) {
    return <WalletConnectButton size="sm" label="Connect" className="w-auto px-2.5" />;
  }

  const short = `${address?.slice(0, 6)}…${address?.slice(-4)}`;
  const wrongChain = chainId !== ARC_TESTNET.id;

  if (wrongChain) {
    return (
      <Button size="sm" onClick={() => switchChain({ chainId: ARC_TESTNET.id })}>
        Switch to Arc
      </Button>
    );
  }

  return (
    <Button size="sm" variant="secondary" onClick={() => disconnect()} title="Disconnect">
      {short}
    </Button>
  );
}
