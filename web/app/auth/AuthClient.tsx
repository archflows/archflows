"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useAccount, useSwitchChain } from "wagmi";
import { BrandLogo } from "@/components/BrandLogo";
import { WalletConnectButton } from "@/components/WalletConnectButton";
import { HeroOrbit } from "@/components/HeroOrbit";
import { ARC_CHAIN_ID, ARC_RPC_URL, FAUCET_URL, NETWORK_NAME, arcChain, isTestnet, ARC_TESTNET } from "@/lib/chain";
import { useMounted } from "@/hooks/useMounted";

export default function AuthClient() {
  const mounted = useMounted();
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/dashboard";
  const { address, isConnected, chainId } = useAccount();
  const { switchChain, isPending: switching } = useSwitchChain();

  const wrongChain = mounted && isConnected && chainId !== arcChain.id;
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

<div className="auth-aside-visual">
  <HeroOrbit />
</div>

<div>
  <p className="tag tag-accent">// GROUND CONTROL</p>
  <h1
    style={{
      margin: "0 0 0.75rem",
      fontSize: "clamp(1.5rem, 2.6vw, 2rem)",
      letterSpacing: "-0.03em",
      fontWeight: 700,
    }}
  >
    Dock your wallet to manage orbits
  </h1>
  <p className="dim" style={{ margin: 0, maxWidth: "24rem", fontSize: "0.92rem", lineHeight: 1.7 }}>
    Connect on {NETWORK_NAME} — gas is USDC. After auth you land in the console: overview,
    positions, and the create flow.
  </p>
</div>

<p className="mono dim" style={{ fontSize: "0.72rem", margin: 0 }}>
  // {NETWORK_NAME.toLowerCase()} · chain {ARC_CHAIN_ID} · rpc {new URL(ARC_RPC_URL).host}
</p>
</aside>

      <main className="auth-main">
        <div className="auth-card">
          <h1>Connect your wallet</h1>
          <p className="auth-lead">
            No email, no password. Connect on Arc Testnet to manage locks, vesting, and public
            proof pages.
          </p>

<div className="panel">
  <div className="panel-head">
    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.55rem" }}>
      <span className="box-icon" style={{ width: 30, height: 30, marginBottom: 0 }}>
        <Wallet className="size-3.5" />
      </span>
      Wallet auth
    </span>
  </div>

  <div className="panel-body">
    {/* Stable SSR/client tree: always render a connect slot until mounted+connected */}
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
        onClick={() => switchChain({ chainId: arcChain.id })}
      >
        {switching ? <Loader2 className="size-4 animate-spin" /> : null}
        Switch to {NETWORK_NAME}
      </button>
    ) : (
      <button type="button" className="btn lg block" disabled>
        <Loader2 className="size-4 animate-spin" />
        Opening console…
      </button>
    )}

    {mounted && address ? (
      <p
        className="mono dim"
        style={{ textAlign: "center", marginTop: "0.75rem", fontSize: "0.76rem" }}
      >
        {address.slice(0, 6)}…{address.slice(-4)}
      </p>
    ) : null}

    <div
      style={{
        margin: "1.15rem 0",
        height: 1,
        background: "var(--line)",
      }}
    />

    <p className="field-hint" style={{ textAlign: "center", lineHeight: 1.7 }}>
      Browser wallets, WalletConnect, and mobile wallets. {isTestnet ? (
        <>
          Need gas?{' '}
          <a href={FAUCET_URL} target="_blank" rel="noreferrer" style={{ color: "var(--beam)" }}>
            Circle faucet
          </a>
        </>
      ) : (
        "Gas is USDC on Arc."
      )}
    </p>
  </div>
</div>
              </p>
            ) : null}
          </div>

          <ul className="auth-facts">
            <li>Arc Testnet</li>
            <li>Gas in USDC</li>
            <li>Chain {ARC_TESTNET.id}</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
