"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Wallet } from "lucide-react";
import { useAccount, useSwitchChain } from "wagmi";
import { BrandLogo } from "@/components/BrandLogo";
import { WalletConnectButton } from "@/components/WalletConnectButton";
import { HeroOrbit } from "@/components/HeroOrbit";
import { ARC_TESTNET } from "@/lib/chain";
import { useMounted } from "@/hooks/useMounted";

export default function AuthClient() {
  const mounted = useMounted();
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/dashboard";
  const { address, isConnected, chainId } = useAccount();
  const { switchChain, isPending: switching } = useSwitchChain();

  const wrongChain = mounted && isConnected && chainId !== ARC_TESTNET.id;
  const ready = mounted && isConnected && !wrongChain;

  useEffect(() => {
    if (ready) {
      router.replace(next.startsWith("/") ? next : "/dashboard");
    }
  }, [ready, next, router]);

  return (
    <div className="auth-shell">
      <aside className="auth-aside">
        <Link href="/" className="brand brand-logo-link" aria-label="ArcFlow home">
          <BrandLogo height={56} />
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
            Connect on Arc Testnet — gas is USDC. After auth you land in the console: overview,
            positions, and the create flow.
          </p>
        </div>

        <p className="mono dim" style={{ fontSize: "0.72rem", margin: 0 }}>
          // arc testnet · chain 5042002 · rpc rpc.testnet.arc.network
        </p>
      </aside>

      <main className="auth-main">
        <div style={{ width: "100%", maxWidth: "24rem" }}>
          <Link href="/" className="brand brand-logo-link auth-brand-mobile" aria-label="ArcFlow home">
            <BrandLogo height={56} />
          </Link>

          <p className="tag">// AUTHENTICATION</p>
          <h2
            style={{
              margin: "0 0 0.4rem",
              fontSize: "1.5rem",
              letterSpacing: "-0.03em",
              fontWeight: 700,
            }}
          >
            Welcome back, operator
          </h2>
          <p className="dim" style={{ margin: "0 0 1.5rem", fontSize: "0.9rem" }}>
            No password, no email. Your wallet is the key.
          </p>

          <div className="panel">
            <div className="panel-head">
              <span style={{ display: "inline-flex", alignItems: "center", gap: "0.55rem" }}>
                <span className="box-icon" style={{ width: 30, height: 30, marginBottom: 0 }}>
                  <Wallet className="size-3.5" />
                </span>
                Wallet auth
              </span>
              <span className="live">Injected</span>
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
                  onClick={() => switchChain({ chainId: ARC_TESTNET.id })}
                >
                  {switching ? <Loader2 className="size-4 animate-spin" /> : null}
                  Switch to Arc Testnet
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
                Chrome or Brave with MetaMask / Rabby. Need gas?{" "}
                <a
                  href="https://faucet.circle.com"
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: "var(--beam)" }}
                >
                  Circle faucet
                </a>
              </p>
            </div>
          </div>

          <p style={{ textAlign: "center", marginTop: "1.25rem" }}>
            <Link href="/" className="box-link">
              ← Back to launch site
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
