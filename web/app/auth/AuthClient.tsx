"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useAccount, useSwitchChain } from "wagmi";
import { BrandLogo } from "@/components/BrandLogo";
import { WalletConnectButton } from "@/components/WalletConnectButton";
import { ARC_CHAIN_ID, NETWORK_NAME } from "@/lib/chain";
import { useMounted } from "@/hooks/useMounted";

export default function AuthClient() {
  const mounted = useMounted();
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/dashboard";
  const { address, isConnected, chainId } = useAccount();
  const { switchChain, isPending: switching } = useSwitchChain();

  const wrongChain = mounted && isConnected && chainId !== ARC_CHAIN_ID;
  const ready = mounted && isConnected && !wrongChain;

  useEffect(() => {
    if (ready) {
      router.replace(next.startsWith("/") ? next : "/dashboard");
    }
  }, [ready, next, router]);

  return (
    <div className="auth-shell">
      <div className="auth-glow" aria-hidden />

      <header className="auth-nav">
        <Link href="/" className="brand brand-logo-link" aria-label="ArcFlows home">
          <BrandLogo height={28} priority />
        </Link>
        <Link href="/" className="auth-back">
          <ArrowLeft className="size-3.5" />
          Back to site
        </Link>
      </header>

      <main className="auth-main">
        <div className="auth-card">
          <h1>Connect your wallet</h1>
          <p className="auth-lead">
            Sign in with a wallet to create locks, vesting schedules, and public proof pages.
          </p>

          <div className="auth-action">
            {!mounted ? (
              <button type="button" disabled className="btn lg block">
                Connect wallet
              </button>
            ) : !isConnected ? (
              <WalletConnectButton />
            ) : wrongChain ? (
              <button
                type="button"
                className="btn lg block"
                disabled={switching}
                onClick={() => switchChain({ chainId: ARC_CHAIN_ID })}
              >
                {switching ? <Loader2 className="size-4 animate-spin" /> : null}
                Switch to {NETWORK_NAME}
              </button>
            ) : (
              <button type="button" className="btn lg block" disabled>
                <Loader2 className="size-4 animate-spin" />
                Opening dashboard…
              </button>
            )}

            {mounted && address ? (
              <p className="auth-address mono">
                {address.slice(0, 6)}…{address.slice(-4)}
              </p>
            ) : null}
          </div>
        </div>
      </main>
    </div>
  );
}
