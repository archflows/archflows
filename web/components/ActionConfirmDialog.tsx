"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel: string;
  /** Platform fee in USD. Pass null to hide the fee row. */
  feeUsd?: number | null;
  /** Replaces the default fee caption, for cases where the charge differs from the price. */
  feeNote?: ReactNode;
  summary?: { label: string; value: ReactNode }[];
  onConfirm: () => void;
};

export function ActionConfirmDialog({
  open,
  onOpenChange,
  title,
  description = "Review the details below before your wallet asks you to sign.",
  confirmLabel,
  feeUsd = 10,
  feeNote,
  summary,
  onConfirm,
}: Props) {
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    if (!open) setAccepted(false);
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 p-0">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 px-5 py-4">
          {summary?.length ? (
            <dl className="dash-well">
              {summary.map((row) => (
                <div className="kv" key={row.label} style={{ padding: "0.65rem 0.9rem" }}>
                  <dt>{row.label}</dt>
                  <dd>{row.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}

          {feeUsd != null ? (
            <div className="flex items-center justify-between rounded-xl border border-primary/25 bg-primary/10 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-white">Platform fee</p>
                <p className="text-xs text-white/60">
                  {feeNote ?? "Paid in USDC when the transaction confirms"}
                </p>
              </div>
              <p className="text-base font-semibold tabular-nums text-white">
                ${feeUsd.toLocaleString("en-US", { maximumFractionDigits: 2 })} USDC
              </p>
            </div>
          ) : null}

          <label className="dash-well flex cursor-pointer items-start gap-3 px-3.5 py-3">
            <input
              type="checkbox"
              className="mt-0.5 size-4 shrink-0 accent-[var(--brand)]"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
            />
            <span className="text-sm leading-relaxed text-white/80">
              I agree to the{" "}
              <Link href="/terms" className="text-primary underline-offset-4 hover:underline" target="_blank">
                Terms &amp; Conditions
              </Link>{" "}
              and understand this action is irreversible once confirmed on-chain.
            </span>
          </label>
        </div>

        <DialogFooter className="flex-row gap-2 sm:justify-end">
          <button type="button" className="btn ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </button>
          <button
            type="button"
            className={cn("btn", !accepted && "opacity-50")}
            disabled={!accepted}
            onClick={() => {
              if (!accepted) return;
              onOpenChange(false);
              onConfirm();
            }}
          >
            {confirmLabel}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
