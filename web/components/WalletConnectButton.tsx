"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { useConnect, useSwitchChain, type Connector } from "wagmi";
import { ARC_TESTNET } from "@/lib/chain";
import { useMounted } from "@/hooks/useMounted";
import { cn } from "@/lib/utils";

function pickConnector(connectors: readonly Connector[]) {
  return (
    connectors.find((c) => c.id === "injected") ??
    connectors.find((c) => c.type === "injected") ??
    connectors[0]
  );
}

function errCode(err: unknown): number | undefined {
  if (err && typeof err === "object" && "code" in err) {
    const code = (err as { code?: number | string }).code;
    return typeof code === "number" ? code : Number(code);
  }
  return undefined;
}

function errMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object" && "message" in err) {
    return String((err as { message?: unknown }).message ?? "Connection failed.");
  }
  return "Connection failed.";
}

async function ensureArcNetwork(ethereum: EthereumProvider) {
  const hexId = `0x${ARC_TESTNET.id.toString(16)}`;
  try {
    await ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: hexId }],
    });
  } catch (err) {
    const code = errCode(err);
    if (code !== 4902) throw err;
    await ethereum.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId: hexId,
          chainName: ARC_TESTNET.name,
          nativeCurrency: ARC_TESTNET.nativeCurrency,
          rpcUrls: [...ARC_TESTNET.rpcUrls.default.http],
          blockExplorerUrls: ARC_TESTNET.blockExplorers?.default.url
            ? [ARC_TESTNET.blockExplorers.default.url]
            : [],
        },
      ],
    });
  }
}

type Props = {
  className?: string;
  size?: "default" | "sm" | "lg";
  label?: string;
};

export function WalletConnectButton({
  className,
  size = "lg",
  label = "Connect wallet",
}: Props) {
  const mounted = useMounted();
  const { connectAsync, connectors, isPending } = useConnect();
  const { switchChainAsync } = useSwitchChain();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [hasInjected, setHasInjected] = useState(false);
  const lockRef = useRef(false);

  useEffect(() => {
    if (!mounted) return;
    setHasInjected(typeof window.ethereum !== "undefined");
  }, [mounted]);

  const connector = useMemo(() => pickConnector(connectors), [connectors]);

  const onConnect = useCallback(async () => {
    if (lockRef.current || busy || isPending) return;
    setError("");

    const ethereum = window.ethereum;
    if (!ethereum) {
      setError("No browser wallet found. Install MetaMask (or Rabby), then refresh.");
      return;
    }
    if (!connector) {
      setError("Wallet connector is not ready. Refresh the page.");
      return;
    }

    lockRef.current = true;
    setBusy(true);

    try {
      // Single permission flow — do NOT also call eth_requestAccounts
      // (that causes MetaMask -32002 "already pending")
      try {
        await connectAsync({ connector, chainId: ARC_TESTNET.id });
      } catch (err) {
        const code = errCode(err);
        const message = errMessage(err);

        if (code === -32002 || /already pending/i.test(message)) {
          setError(
            "MetaMask popup is already open. Open the MetaMask extension, approve (or reject), then try again.",
          );
          return;
        }
        if (code === 4001 || /reject|denied|cancel/i.test(message)) {
          setError("Connection request was rejected in the wallet.");
          return;
        }

        // Retry without chainId, then switch/add Arc
        await connectAsync({ connector });
        try {
          await switchChainAsync({ chainId: ARC_TESTNET.id });
        } catch {
          try {
            await ensureArcNetwork(ethereum);
            await switchChainAsync({ chainId: ARC_TESTNET.id });
          } catch {
            setError("Connected — switch the wallet network to Arc Testnet (5042002).");
          }
        }
      }
    } catch (err) {
      const code = errCode(err);
      const message = errMessage(err);
      if (code === -32002 || /already pending/i.test(message)) {
        setError(
          "MetaMask popup is already open. Open the MetaMask extension, approve (or reject), then try again.",
        );
      } else if (code === 4001 || /reject|denied|cancel/i.test(message)) {
        setError("Connection request was rejected in the wallet.");
      } else {
        setError(message.split("\n")[0]);
      }
    } finally {
      setBusy(false);
      lockRef.current = false;
    }
  }, [busy, connectAsync, connector, isPending, switchChainAsync]);

  const loading = busy || isPending;

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={loading}
        onClick={onConnect}
        className={cn(
          "inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-primary px-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80 disabled:pointer-events-none disabled:opacity-50",
          size === "sm" && "h-7 w-auto px-2.5 text-[0.8rem]",
          className,
        )}
      >
        {loading ? <Loader2 className="size-4 animate-spin" /> : null}
        {loading ? "Connecting…" : label}
      </button>
      {mounted && !hasInjected ? (
        <p className="text-xs text-muted-foreground">
          Need a wallet extension.{" "}
          <a
            href="https://metamask.io/download/"
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2 hover:text-foreground"
          >
            Get MetaMask
          </a>
        </p>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}

type EthereumProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}
