"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Wallet } from "lucide-react";
import { useAccount, useSwitchChain } from "wagmi";
import { LogoMark } from "@/components/Icons";
import { WalletConnectButton } from "@/components/WalletConnectButton";
import { ARC_TESTNET } from "@/lib/chain";
import { useMounted } from "@/hooks/useMounted";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

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
    <div className="relative flex min-h-svh flex-col overflow-hidden lg:flex-row">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/auth-hero-bg.png')" }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,oklch(0.14_0_0/0.82)_0%,oklch(0.14_0_0/0.55)_42%,oklch(0.12_0_0/0.72)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_70%_40%,oklch(1_0_0/0.08),transparent)]" />
      </div>

      <aside className="relative hidden w-full flex-col justify-between border-r border-white/10 bg-black/20 p-10 backdrop-blur-[2px] lg:flex lg:max-w-md xl:max-w-lg">
        <Link href="/" className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          <LogoMark size={18} />
          ArcFlow
        </Link>
        <div className="space-y-4">
          <Badge variant="secondary">Admin console</Badge>
          <h1 className="text-3xl font-semibold tracking-tight text-white">
            Sign in to manage locks on Arc
          </h1>
          <p className="max-w-sm text-sm leading-relaxed text-white/70">
            Connect a wallet on Arc Testnet. Gas is USDC. After auth you land in the SaaS-style
            admin dashboard — overview, locks, and create flows.
          </p>
        </div>
        <p className="text-xs text-white/50">Arc Testnet · chain 5042002</p>
      </aside>

      <main className="relative flex flex-1 items-center justify-center px-4 py-16">
        <div className="w-full max-w-sm space-y-8">
          <div className="space-y-2 text-center lg:text-left">
            <Link
              href="/"
              className="mb-6 inline-flex items-center gap-2 text-sm font-semibold tracking-tight lg:hidden"
            >
              <LogoMark size={18} />
              ArcFlow
            </Link>
            <h2 className="text-2xl font-semibold tracking-tight">Welcome back</h2>
            <p className="text-sm text-muted-foreground">
              Authenticate with your wallet to open the admin dashboard.
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-card/85 p-6 shadow-lg backdrop-blur-md">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg border bg-muted/40">
                <Wallet className="size-4" />
              </div>
              <div>
                <div className="text-sm font-medium">Wallet auth</div>
                <div className="text-xs text-muted-foreground">MetaMask / Rabby / injected</div>
              </div>
            </div>

            {/* Stable SSR/client tree: always render connect slot until mounted+connected */}
            {!mounted ? (
              <button
                type="button"
                disabled
                className="inline-flex h-9 w-full items-center justify-center rounded-lg bg-primary px-2.5 text-sm font-medium text-primary-foreground opacity-50"
              >
                Connect wallet
              </button>
            ) : !isConnected ? (
              <WalletConnectButton />
            ) : wrongChain ? (
              <Button
                className="w-full"
                size="lg"
                disabled={switching}
                onClick={() => switchChain({ chainId: ARC_TESTNET.id })}
              >
                {switching ? <Loader2 className="size-4 animate-spin" /> : null}
                Switch to Arc Testnet
              </Button>
            ) : (
              <Button className="w-full" size="lg" disabled>
                <Loader2 className="size-4 animate-spin" />
                Opening dashboard…
              </Button>
            )}

            {mounted && address ? (
              <p className="mt-3 text-center font-mono text-xs text-muted-foreground">
                {address.slice(0, 6)}…{address.slice(-4)}
              </p>
            ) : null}

            <Separator className="my-5" />
            <p className="text-center text-xs leading-relaxed text-muted-foreground">
              Use Chrome/Brave with MetaMask installed. Need USDC?{" "}
              <a
                href="https://faucet.circle.com"
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-2 hover:text-foreground"
              >
                Circle faucet
              </a>
            </p>
          </div>

          <p className="text-center text-xs text-white/60">
            <Link href="/" className="hover:text-white hover:underline">
              ← Back to marketing site
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
