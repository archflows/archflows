"use client";

import { useEffect, useMemo, useState } from "react";
import { formatUnits, isAddress } from "viem";
import { useAccount } from "wagmi";
import { PlusIcon, RefreshCwIcon, XIcon } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useWalletTokens } from "@/hooks/useWalletTokens";
import { USDC_ADDRESS } from "@/lib/chain";

type Props = {
  id?: string;
  value: string;
  onChange: (address: string) => void;
  label?: string;
  hint?: string;
  preferUsdc?: boolean;
};

export function TokenSelect({
  id,
  value,
  onChange,
  label = "Token",
  hint,
  preferUsdc = false,
}: Props) {
  const { isConnected } = useAccount();
  const { data: tokens = [], isLoading, isError, refetch, isFetching } = useWalletTokens();
  const [customOpen, setCustomOpen] = useState(false);
  const [custom, setCustom] = useState("");

  const sorted = useMemo(() => {
    const list = [...tokens];
    if (preferUsdc) {
      list.sort((a, b) => {
        const aUsdc = a.address.toLowerCase() === USDC_ADDRESS.toLowerCase() ? 0 : 1;
        const bUsdc = b.address.toLowerCase() === USDC_ADDRESS.toLowerCase() ? 0 : 1;
        if (aUsdc !== bUsdc) return aUsdc - bUsdc;
        return a.symbol.localeCompare(b.symbol);
      });
    }
    return list;
  }, [tokens, preferUsdc]);

  const items = useMemo(
    () =>
      sorted.map((t) => ({
        value: t.address,
        label: `${t.symbol} · ${Number(formatUnits(BigInt(t.balance), t.decimals)).toLocaleString(
          "en-US",
          { maximumFractionDigits: 4 },
        )}`,
      })),
    [sorted],
  );

  const selected = sorted.find((t) => t.address.toLowerCase() === value.toLowerCase());
  const selectValue = customOpen ? null : selected ? selected.address : null;

  useEffect(() => {
    if (!value) return;
    const inList = tokens.some((t) => t.address.toLowerCase() === value.toLowerCase());
    if (!inList && isAddress(value)) {
      setCustomOpen(true);
      setCustom(value);
    }
  }, [value, tokens]);

  function openCustom() {
    setCustomOpen(true);
    setCustom(isAddress(value) && !selected ? value : "");
    if (!selected) onChange("");
  }

  function closeCustom() {
    setCustomOpen(false);
    setCustom("");
    onChange(selected?.address ?? "");
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
            onClick={() => refetch()}
            disabled={isFetching}
            title="Refresh wallet tokens"
          >
            <RefreshCwIcon className={`size-3.5 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </button>
        ) : null}
      </div>

      {!isConnected ? (
        <p className="field-hint">Connect a wallet to load tokens.</p>
      ) : (
        <>
          <div className="token-select-row">
            <div className="token-select-main">
              {!customOpen ? (
                <Select
                  value={selectValue}
                  onValueChange={(next) => {
                    if (next) onChange(next);
                  }}
                  items={items}
                >
                  <SelectTrigger
                    id={id}
                    className="h-9 w-full min-w-0 border-[var(--line-strong)] bg-[rgba(10,14,22,0.55)] px-3 dark:bg-[rgba(10,14,22,0.55)]"
                  >
                    <SelectValue
                      placeholder={
                        isLoading ? "Loading wallet tokens…" : "Select a token from wallet"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent className="max-h-72 min-w-[var(--anchor-width)]">
                    <SelectGroup>
                      {sorted.length === 0 && !isLoading ? (
                        <div className="px-2 py-3 text-xs text-muted-foreground">
                          No ERC-20 balances found on Arc Testnet yet.
                        </div>
                      ) : null}
                      {sorted.map((t) => (
                        <SelectItem key={t.address} value={t.address}>
                          <span className="flex w-full items-center justify-between gap-3">
                            <span>
                              <span className="font-medium">{t.symbol}</span>
                              <span className="ml-2 font-mono text-[10px] text-muted-foreground">
                                {t.address.slice(0, 6)}…{t.address.slice(-4)}
                              </span>
                            </span>
                            <span className="tabular-nums text-xs text-muted-foreground">
                              {Number(formatUnits(BigInt(t.balance), t.decimals)).toLocaleString(
                                "en-US",
                                { maximumFractionDigits: 4 },
                              )}
                            </span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              ) : (
                <input
                  id={id}
                  className="af-input mono"
                  placeholder="0x… paste token contract"
                  autoComplete="off"
                  spellCheck={false}
                  value={custom}
                  onChange={(e) => {
                    const next = e.target.value.trim();
                    setCustom(next);
                    onChange(isAddress(next) ? next : "");
                  }}
                />
              )}
            </div>

            {!customOpen ? (
              <button
                type="button"
                className="btn ghost token-select-add"
                onClick={openCustom}
                title="Use a custom token address"
              >
                <PlusIcon className="size-3.5" />
                <span className="token-select-add-label">Custom</span>
              </button>
            ) : (
              <button
                type="button"
                className="btn ghost token-select-add"
                onClick={closeCustom}
                title="Back to wallet tokens"
              >
                <XIcon className="size-3.5" />
                <span className="token-select-add-label">Back</span>
              </button>
            )}
          </div>

          <p className="field-hint">
            {isError
              ? "Could not load wallet tokens from Arcscan."
              : hint ||
                (customOpen
                  ? "Paste any ERC-20 contract on Arc Testnet."
                  : selected
                    ? selected.name
                    : isFetching
                      ? "Refreshing…"
                      : "Pick a token with balance in your wallet.")}
          </p>
        </>
      )}
    </div>
  );
}
