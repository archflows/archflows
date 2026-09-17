"use client";

import { useEffect, useState } from "react";
import { BanknoteIcon, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { notify } from "@/lib/notify";
import { formatUsdc, parseUsdcInput } from "@/lib/referral";

export function WithdrawCard({
  availableUnits,
  minUnits,
  payoutsEnabled,
  busy,
  onWithdraw,
  onDone,
}: {
  availableUnits: bigint;
  minUnits: bigint;
  payoutsEnabled: boolean;
  busy: boolean;
  onWithdraw: (amount: bigint) => Promise<unknown>;
  onDone: () => void | Promise<void>;
}) {
  const [amount, setAmount] = useState(() => formatUsdc(availableUnits, 6));

  useEffect(() => {
    setAmount(formatUsdc(availableUnits, 6));
  }, [availableUnits]);

  const parsed = parseUsdcInput(amount);
  const belowMin = availableUnits < minUnits;

  const error =
    parsed === null
      ? amount.trim()
        ? "Enter a valid USDC amount."
        : null
      : parsed > availableUnits
        ? "More than your available balance."
        : parsed < minUnits
          ? `Minimum withdrawal is $${formatUsdc(minUnits)}.`
          : null;

  const ready = payoutsEnabled && !busy && parsed !== null && !error && parsed > 0n;

  async function submit() {
    if (!ready || parsed === null) return;
    try {
      await onWithdraw(parsed);
      notify.success(
        "Claim confirmed",
        `$${formatUsdc(parsed)} USDC was sent to your wallet.`,
      );
      await onDone();
    } catch (err) {
      notify.error(
        "Withdrawal failed",
        err instanceof Error ? err.message.split("\n")[0] : "Try again in a moment.",
      );
    }
  }

  return (
    <Card className="shadow-none ring-0">
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2">
          <BanknoteIcon className="size-4 text-primary" />
          Withdraw
        </CardTitle>
        <CardDescription>
          Claim USDC from the dedicated referral pool. ArcFlow processes the payout for you.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 pt-6">
        <div className="flex items-center gap-2">
          <Input
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={busy || belowMin}
            aria-label="Withdrawal amount in USDC"
          />
          <button
            type="button"
            className="btn ghost sm shrink-0"
            disabled={busy || belowMin}
            onClick={() => setAmount(formatUsdc(availableUnits, 6))}
          >
            Max
          </button>
        </div>

        <p className="text-[0.78rem] text-white/60">
          Available ${formatUsdc(availableUnits)} · minimum ${formatUsdc(minUnits)}
        </p>

        {!payoutsEnabled ? (
          <div className="form-notice form-notice-warn" role="status">
            <div className="form-notice-body">
              <strong>Claims not live yet</strong>
              <p>On-chain referral claims unlock after the lock contract upgrade.</p>
            </div>
          </div>
        ) : belowMin ? (
          <div className="form-notice form-notice-warn" role="status">
            <div className="form-notice-body">
              <strong>Keep going</strong>
              <p>
                You need ${formatUsdc(minUnits - availableUnits)} more before you can withdraw.
              </p>
            </div>
          </div>
        ) : error ? (
          <div className="form-notice form-notice-warn" role="status">
            <div className="form-notice-body">
              <strong>Check the amount</strong>
              <p>{error}</p>
            </div>
          </div>
        ) : null}

        <button
          type="button"
          className="btn block"
          disabled={!ready}
          onClick={() => void submit()}
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : null}
          {busy ? "Claiming…" : "Claim USDC"}
        </button>

        <p className="text-[0.72rem] leading-relaxed text-white/50">
          Sign to authorize the payout. USDC is sent from the referral pool wallet to your connected
          wallet.
        </p>
      </CardContent>
    </Card>
  );
}
