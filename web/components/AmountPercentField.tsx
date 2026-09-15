"use client";

import { useMemo, useState } from "react";
import { formatUnits, parseUnits } from "viem";
import { KeyboardIcon, SlidersHorizontalIcon } from "lucide-react";

const PRESETS = [25, 50, 75, 100] as const;

type Mode = "input" | "slider";

type Props = {
  id?: string;
  label?: string;
  amount: string;
  onChange: (value: string) => void;
  max?: bigint;
  decimals?: number;
  symbol?: string;
  error?: string;
  hint?: string;
};

function amountToPercent(amount: string, max: bigint, decimals: number): number {
  if (!amount || max === 0n) return 0;
  try {
    const value = parseUnits(amount, decimals);
    if (value <= 0n) return 0;
    if (value >= max) return 100;
    return Math.min(100, Math.round(Number((value * 10000n) / max) / 100));
  } catch {
    return 0;
  }
}

function percentToAmount(percent: number, max: bigint, decimals: number): string {
  if (percent <= 0 || max === 0n) return "";
  if (percent >= 100) return formatUnits(max, decimals);
  const value = (max * BigInt(Math.round(percent))) / 100n;
  return formatUnits(value, decimals);
}

export function AmountPercentField({
  id = "amount",
  label = "Amount",
  amount,
  onChange,
  max,
  decimals,
  symbol,
  error,
  hint,
}: Props) {
  const [mode, setMode] = useState<Mode>("input");
  const ready = max !== undefined && decimals !== undefined && max > 0n;
  const percent = useMemo(() => {
    if (!ready) return 0;
    return amountToPercent(amount, max, decimals);
  }, [amount, max, decimals, ready]);

  const maxLabel = ready
    ? `${Number(formatUnits(max, decimals)).toLocaleString("en-US", {
        maximumFractionDigits: 4,
      })}${symbol ? ` ${symbol}` : ""}`
    : null;

  function setPercent(next: number) {
    if (!ready) return;
    onChange(percentToAmount(Math.max(0, Math.min(100, next)), max, decimals));
  }

  return (
    <div className="field amount-field">
      <div className="amount-field-head">
        <label className="field-label" htmlFor={id}>
          {label}
        </label>
        {ready && maxLabel ? <span className="amount-field-max">Max {maxLabel}</span> : null}
      </div>

      <div className="amount-control">
        {mode === "input" ? (
          <div className="amount-control-panel">
            <input
              id={id}
              className="amount-control-input"
              placeholder="0.0"
              inputMode="decimal"
              value={amount}
              onChange={(e) => onChange(e.target.value)}
            />
            {symbol ? <span className="amount-control-suffix">{symbol}</span> : null}
          </div>
        ) : (
          <div className={`amount-control-panel amount-control-slide${ready ? "" : " is-disabled"}`}>
            <span className="amount-control-pct">{percent}%</span>
            <input
              type="range"
              className="amount-slider"
              min={0}
              max={100}
              step={1}
              value={percent}
              disabled={!ready}
              style={{ ["--amount-pct" as string]: `${percent}%` }}
              aria-label="Amount percent of balance"
              onChange={(e) => setPercent(Number(e.target.value))}
            />
            <span className="amount-control-val">
              {amount || "0"}
              {symbol ? ` ${symbol}` : ""}
            </span>
          </div>
        )}

        <div className="amount-mode-switch" role="group" aria-label="Amount input mode">
          <button
            type="button"
            className={mode === "input" ? "amount-mode-btn on" : "amount-mode-btn"}
            onClick={() => setMode("input")}
            title="Type amount"
            aria-pressed={mode === "input"}
          >
            <KeyboardIcon className="size-3.5" />
          </button>
          <button
            type="button"
            className={mode === "slider" ? "amount-mode-btn on" : "amount-mode-btn"}
            onClick={() => setMode("slider")}
            title="Slide percent"
            aria-pressed={mode === "slider"}
          >
            <SlidersHorizontalIcon className="size-3.5" />
          </button>
        </div>
      </div>

      {mode === "slider" ? (
        <div className={`amount-presets${ready ? "" : " is-disabled"}`}>
          {PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              className={percent === p && ready ? "amount-preset on" : "amount-preset"}
              disabled={!ready}
              onClick={() => setPercent(p)}
            >
              {p === 100 ? "MAX" : `${p}%`}
            </button>
          ))}
        </div>
      ) : null}

      {error ? (
        <p className="field-error">{error}</p>
      ) : hint ? (
        <p className="field-hint">{hint}</p>
      ) : !ready ? (
        <p className="field-hint">Select a token with balance first.</p>
      ) : null}
    </div>
  );
}
