"use client";

import { PlusIcon, Trash2Icon } from "lucide-react";
import { isAddress } from "viem";
import { shorten } from "@/lib/form-time";

export type UnlockTarget = "self" | "other" | "split";

export type SplitRow = {
  id: string;
  address: string;
  percent: string;
};

type Props = {
  mode: UnlockTarget;
  onModeChange: (mode: UnlockTarget) => void;
  selfAddress?: string;
  otherAddress: string;
  onOtherAddressChange: (value: string) => void;
  splits: SplitRow[];
  onSplitsChange: (rows: SplitRow[]) => void;
};

function newRow(percent = ""): SplitRow {
  return { id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, address: "", percent };
}

export function UnlockTargetField({
  mode,
  onModeChange,
  selfAddress,
  otherAddress,
  onOtherAddressChange,
  splits,
  onSplitsChange,
}: Props) {
  const splitTotal = splits.reduce((sum, row) => {
    const n = Number(row.percent);
    return sum + (Number.isFinite(n) ? n : 0);
  }, 0);
  const splitOk = Math.abs(splitTotal - 100) < 0.01;

  function updateRow(id: string, patch: Partial<SplitRow>) {
    onSplitsChange(splits.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  return (
    <div className="field">
      <span className="field-label">Unlock to</span>
      <div className="seg seg-3">
        <button
          type="button"
          className={mode === "self" ? "seg-btn on" : "seg-btn"}
          onClick={() => onModeChange("self")}
        >
          My wallet
        </button>
        <button
          type="button"
          className={mode === "other" ? "seg-btn on" : "seg-btn"}
          onClick={() => onModeChange("other")}
        >
          Other wallet
        </button>
        <button
          type="button"
          className={mode === "split" ? "seg-btn on" : "seg-btn"}
          onClick={() => {
            onModeChange("split");
            if (splits.length === 0) {
              onSplitsChange([newRow("50"), newRow("50")]);
            }
          }}
        >
          Split wallets
        </button>
      </div>

      {mode === "self" ? (
        <p className="field-hint">
          Unlocks to{" "}
          <span className="mono" style={{ color: "var(--ink)" }}>
            {selfAddress ? shorten(selfAddress) : "your connected wallet"}
          </span>
          .
        </p>
      ) : null}

      {mode === "other" ? (
        <>
          <input
            className="af-input mono"
            style={{ marginTop: "0.45rem" }}
            placeholder="0x… beneficiary wallet"
            autoComplete="off"
            spellCheck={false}
            value={otherAddress}
            onChange={(e) => onOtherAddressChange(e.target.value.trim())}
          />
          {otherAddress && !isAddress(otherAddress) ? (
            <p className="field-error">Invalid address.</p>
          ) : (
            <p className="field-hint">Only this wallet can claim after unlock.</p>
          )}
        </>
      ) : null}

      {mode === "split" ? (
        <div className="split-list">
          {splits.map((row, index) => (
            <div className="split-row" key={row.id}>
              <input
                className="af-input mono"
                placeholder={`Wallet ${index + 1}`}
                autoComplete="off"
                spellCheck={false}
                value={row.address}
                onChange={(e) => updateRow(row.id, { address: e.target.value.trim() })}
              />
              <div className="split-pct">
                <input
                  className="af-input"
                  inputMode="decimal"
                  placeholder="%"
                  value={row.percent}
                  onChange={(e) => updateRow(row.id, { percent: e.target.value })}
                />
                <span>%</span>
              </div>
              <button
                type="button"
                className="btn ghost sm"
                disabled={splits.length <= 2}
                onClick={() => onSplitsChange(splits.filter((r) => r.id !== row.id))}
                title="Remove wallet"
              >
                <Trash2Icon className="size-3.5" />
              </button>
            </div>
          ))}

          <div className="split-footer">
            <button
              type="button"
              className="btn ghost sm"
              onClick={() => onSplitsChange([...splits, newRow()])}
            >
              <PlusIcon className="size-3.5" />
              Add wallet
            </button>
            <span className={splitOk ? "split-total ok" : "split-total bad"}>
              Total {splitTotal.toFixed(splitTotal % 1 ? 1 : 0)}%
              {splitOk ? "" : " · must be 100%"}
            </span>
          </div>
          <p className="field-hint">
            Each wallet gets its own lock for that share. Fee is $10 USDC per wallet.
          </p>
        </div>
      ) : null}
    </div>
  );
}

export function validateSplits(splits: SplitRow[]) {
  if (splits.length < 2) return "Add at least two wallets to split.";
  let total = 0;
  for (const row of splits) {
    if (!isAddress(row.address)) return "Every split row needs a valid wallet address.";
    const n = Number(row.percent);
    if (!Number.isFinite(n) || n <= 0) return "Each share must be greater than 0%.";
    total += n;
  }
  if (Math.abs(total - 100) > 0.01) return "Split shares must add up to 100%.";
  return null;
}
