"use client";

import { useEffect, useMemo, useState } from "react";
import { formatUnits } from "viem";
import { useAccount } from "wagmi";
import { CheckIcon, ChevronDownIcon, RefreshCwIcon, SearchIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ownsWalletToken, useWalletTokens } from "@/hooks/useWalletTokens";
import { USDC_ADDRESS } from "@/lib/chain";
import { cn } from "@/lib/utils";
import { TokenListSkeleton } from "@/components/page-skeleton";
import type { WalletToken } from "@/app/api/wallet-tokens/route";

type Props = {
  id?: string;
  value: string;
  onChange: (address: string) => void;
  label?: string;
  hint?: string;
  preferUsdc?: boolean;
};

function fmtBalance(token: WalletToken) {
  return Number(formatUnits(BigInt(token.balance), token.decimals)).toLocaleString("en-US", {
    maximumFractionDigits: 4,
  });
}

function shortAddr(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function TokenSelect({
  id,
  value,
  onChange,
  label = "Token",
  hint,
  preferUsdc = false,
}: Props) {
  const { address, isConnected } = useAccount();
  const { data: tokens = [], isLoading, isError, refetch, isFetching, isSuccess } = useWalletTokens();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const sorted = useMemo(() => {
    const list = [...tokens];
    list.sort((a, b) => {
      if (preferUsdc) {
        const aUsdc = a.address.toLowerCase() === USDC_ADDRESS.toLowerCase() ? 0 : 1;
        const bUsdc = b.address.toLowerCase() === USDC_ADDRESS.toLowerCase() ? 0 : 1;
        if (aUsdc !== bUsdc) return aUsdc - bUsdc;
      }
      return a.symbol.localeCompare(b.symbol);
    });
    return list;
  }, [tokens, preferUsdc]);

  const selected = sorted.find((t) => t.address.toLowerCase() === value.toLowerCase());

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter((t) => {
      return (
        t.symbol.toLowerCase().includes(q) ||
        t.name.toLowerCase().includes(q) ||
        t.address.toLowerCase().includes(q)
      );
    });
  }, [sorted, query]);

  useEffect(() => {
    if (!isConnected || !address) {
      if (value) onChange("");
      return;
    }
    if (!isSuccess && tokens.length === 0) return;
    if (value && !ownsWalletToken(tokens, value)) onChange("");
  }, [address, isConnected, isSuccess, tokens, value, onChange]);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const walletLabel = address ? shortAddr(address) : "";

  function pick(token: WalletToken) {
    if (!ownsWalletToken(sorted, token.address)) return;
    onChange(token.address);
    setOpen(false);
  }

  return (
    <div className="field">
      <div className="flex items-center justify-between gap-2">
        <label className="field-label" htmlFor={id} style={{ margin: 0 }}>
          {label}
        </label>
        {isConnected ? (
          <button
            type="button"
            className="btn ghost sm"
            onClick={() => void refetch()}
            disabled={isFetching}
            title="Refresh wallet tokens"
          >
            <RefreshCwIcon className={`size-3.5 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </button>
        ) : null}
      </div>

      {!isConnected ? (
        <p className="field-hint">Connect a wallet to load its tokens.</p>
      ) : (
        <>
          <button
            id={id}
            type="button"
            className="af-input"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "0.75rem",
              textAlign: "left",
              cursor: "pointer",
              height: "auto",
              minHeight: "var(--af-control-h)",
              maxHeight: "none",
              padding: "0.45rem 0.7rem",
            }}
            onClick={() => setOpen(true)}
          >
            {selected ? (
              <span className="flex min-w-0 items-center gap-2.5">
                <span className="token-glyph">{selected.symbol.slice(0, 3).toUpperCase()}</span>
                <span className="min-w-0">
                  <span className="block truncate font-medium text-white">{selected.symbol}</span>
                  <span className="block truncate font-mono text-[10px] text-white/55">
                    {shortAddr(selected.address)}
                  </span>
                </span>
              </span>
            ) : isLoading ? (
              <span className="flex min-w-0 items-center gap-2.5">
                <span className="skeleton size-[30px] shrink-0 rounded-md" />
                <span className="grid min-w-0 gap-1.5">
                  <span className="skeleton h-3.5 w-16" />
                  <span className="skeleton h-2.5 w-28" />
                </span>
              </span>
            ) : (
              <span className="text-white/55">Choose a token</span>
            )}
            <span className="flex shrink-0 items-center gap-2 text-white/70">
              {selected ? (
                <span className="tabular-nums text-xs">{fmtBalance(selected)}</span>
              ) : null}
              <ChevronDownIcon className="size-4" />
            </span>
          </button>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Select token</DialogTitle>
                <DialogDescription>
                  Tokens with balance in {walletLabel}. Click a row to select it.
                </DialogDescription>
              </DialogHeader>

              <div className="flex flex-col gap-3 px-4 py-3">
                <div className="relative">
                  <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-white/40" />
                  <Input
                    autoFocus
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search symbol or address"
                    className="h-9 border-white/12 bg-black/30 pl-8 text-white placeholder:text-white/40"
                  />
                </div>

                <div className="max-h-[22rem] overflow-y-auto rounded-xl border border-white/8 bg-black/25">
                  {isLoading ? (
                    <TokenListSkeleton />
                  ) : filtered.length === 0 ? (
                    <p className="px-4 py-8 text-center text-sm text-white/60">
                      {sorted.length === 0
                        ? `No ERC-20 balances in ${walletLabel}.`
                        : "No tokens match that search."}
                    </p>
                  ) : (
                    <ul className="p-1.5">
                      {filtered.map((token) => {
                        const active = selected?.address.toLowerCase() === token.address.toLowerCase();
                        return (
                          <li key={token.address}>
                            <button
                              type="button"
                              className={cn(
                                "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                                active ? "bg-primary/20" : "hover:bg-white/8",
                              )}
                              onClick={() => pick(token)}
                            >
                              <span className="token-glyph">
                                {token.symbol.slice(0, 3).toUpperCase()}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="flex items-center gap-2">
                                  <span className="truncate font-medium text-white">{token.symbol}</span>
                                  {active ? <CheckIcon className="size-3.5 text-primary" /> : null}
                                </span>
                                <span className="block truncate text-xs text-white/55">
                                  {token.name} · {shortAddr(token.address)}
                                </span>
                              </span>
                              <span className="shrink-0 text-right">
                                <span className="block tabular-nums text-sm text-white">
                                  {fmtBalance(token)}
                                </span>
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <p className="field-hint">
            {isError
              ? "Could not load wallet tokens from Arcscan. USDC still reads on-chain if you hold it."
              : hint ||
                (selected
                  ? `${selected.name} · ${walletLabel}`
                  : isFetching
                    ? "Refreshing connected wallet…"
                    : `Only tokens held by ${walletLabel}.`)}
          </p>
        </>
      )}
    </div>
  );
}
