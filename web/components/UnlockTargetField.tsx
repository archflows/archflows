"use client";

import { useState } from "react";
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

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function formatPct(n: number) {
  const r = round2(n);
  return Number.isInteger(r) ? String(r) : r.toFixed(2).replace(/\.?0+$/, "");
}

/** Split `total` across `count` rows; last row absorbs rounding dust. */
function distribute(total: number, count: number): number[] {
  if (count <= 0) return [];
  if (count === 1) return [round2(Math.max(0, total))];
  const base = round2(Math.max(0, total) / count);
  const parts = Array.from({ length: count }, () => base);
  const allocated = round2(base * (count - 1));
  parts[count - 1] = round2(Math.max(0, total) - allocated);
  return parts;
}

function parsePct(raw: string) {
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Keep manually-set rows fixed. Put leftover (100 − manual sum) on auto rows only.
 */
function applyManualBalance(
  rows: SplitRow[],
  manualIds: Set<string>,
  editedId: string,
  editedRaw: string,
): SplitRow[] {
  const nextManual = new Set(manualIds);
  nextManual.add(editedId);

  const withEdit = rows.map((row) =>
    row.id === editedId ? { ...row, percent: editedRaw } : row,
  );

  const autoRows = withEdit.filter((row) => !nextManual.has(row.id));
  const manualSum = withEdit.reduce((sum, row) => {
    if (!nextManual.has(row.id)) return sum;
    return sum + parsePct(row.percent);
  }, 0);
  const remainder = round2(Math.max(0, 100 - manualSum));

  if (autoRows.length === 0) return withEdit;

  const parts = distribute(remainder, autoRows.length);
  let i = 0;
  return withEdit.map((row) => {
    if (nextManual.has(row.id)) return row;
    return { ...row, percent: formatPct(parts[i++] ?? 0) };
  });
}

/** Rebalance only auto rows after add/remove; leave manual percents untouched. */
function rebalanceAutos(rows: SplitRow[], manualIds: Set<string>): SplitRow[] {
  const autoRows = rows.filter((row) => !manualIds.has(row.id));
  if (autoRows.length === 0) return rows;

  const manualSum = rows.reduce((sum, row) => {
    if (!manualIds.has(row.id)) return sum;
    return sum + parsePct(row.percent);
  }, 0);
  const remainder = round2(Math.max(0, 100 - manualSum));
  const parts = distribute(remainder, autoRows.length);
  let i = 0;
  return rows.map((row) => {
    if (manualIds.has(row.id)) return row;
    return { ...row, percent: formatPct(parts[i++] ?? 0) };
  });
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
  /** Rows the user typed — these stay fixed when another share is edited. */
  const [manualIds, setManualIds] = useState<Set<string>>(() => new Set());

  const splitTotal = splits.reduce((sum, row) => sum + parsePct(row.percent), 0);
  const splitOk = Math.abs(splitTotal - 100) < 0.05;

  function updateAddress(id: string, address: string) {
    onSplitsChange(splits.map((row) => (row.id === id ? { ...row, address } : row)));
  }

  function updatePercent(id: string, raw: string) {
    const cleaned = raw.replace(/[^\d.]/g, "");
    const n = Number(cleaned);

    if (cleaned === "" || !Number.isFinite(n)) {
      setManualIds((prev) => {
        const next = new Set(prev);
        next.add(id);
        return next;
      });
      onSplitsChange(splits.map((row) => (row.id === id ? { ...row, percent: cleaned } : row)));
      return;
    }

    setManualIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    onSplitsChange(applyManualBalance(splits, manualIds, id, cleaned));
  }

  function addWallet() {
    const row = newRow();
    onSplitsChange(rebalanceAutos([...splits, row], manualIds));
  }

  function removeWallet(id: string) {
    if (splits.length <= 2) return;
    const nextManual = new Set(manualIds);
    nextManual.delete(id);
    setManualIds(nextManual);
    onSplitsChange(rebalanceAutos(splits.filter((row) => row.id !== id), nextManual));
  }

  function startSplit() {
    onModeChange("split");
    if (splits.length === 0) {
      const a = newRow("50");
      const b = newRow("50");
      setManualIds(new Set());
      onSplitsChange([a, b]);
    }
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
          onClick={startSplit}
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
                onChange={(e) => updateAddress(row.id, e.target.value.trim())}
              />
              <div className="split-pct">
                <input
                  className="af-input"
                  inputMode="decimal"
                  placeholder="%"
                  value={row.percent}
                  onChange={(e) => updatePercent(row.id, e.target.value)}
                />
                <span>%</span>
              </div>
              <button
                type="button"
                className="btn ghost sm"
                disabled={splits.length <= 2}
                onClick={() => removeWallet(row.id)}
                title="Remove wallet"
              >
                <Trash2Icon className="size-3.5" />
              </button>
            </div>
          ))}

          <div className="split-footer">
            <button type="button" className="btn ghost sm" onClick={addWallet}>
              <PlusIcon className="size-3.5" />
              Add wallet
            </button>
            <span className={splitOk ? "split-total ok" : "split-total bad"}>
              Total {round2(splitTotal)}%
              {splitOk ? "" : ", must be 100%"}
            </span>
          </div>
          <p className="field-hint">
            Shares you type stay fixed. Empty / other wallets fill the rest to 100%.
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
  if (Math.abs(total - 100) > 0.05) return "Split shares must add up to 100%.";
  return null;
}
