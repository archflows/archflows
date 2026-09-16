"use client";

import Link from "next/link";
import { CheckCircle2, Copy, ExternalLink, Share2 } from "lucide-react";
import { TxExplorerLink } from "@/components/TxExplorerLink";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { copyToClipboard } from "@/lib/clipboard";
import { CONTRACT_LABEL } from "@/lib/brand";
import { dateFmt, formatCountdown, remainingUntil, shorten } from "@/lib/form-time";
import { proofPath } from "@/lib/proof";
import { lockShareText, proofAbsoluteUrl, twitterIntentUrl } from "@/lib/share";
import { useNowSec } from "@/hooks/useNowSec";

export type CreatedLock = {
  id: string;
  txHash: string;
  amount: string;
  beneficiary: string;
};

export type LockSuccessResult = {
  locks: CreatedLock[];
  symbol: string;
  unlockAt: number;
  totalAmount: string;
};

function sharePayload(result: LockSuccessResult) {
  const first = result.locks[0];
  const proofUrl = proofAbsoluteUrl("lock", first.txHash, first.id);
  const text = lockShareText({
    amount: result.totalAmount,
    symbol: result.symbol,
    unlockAt: result.unlockAt,
    proofUrl,
    walletCount: result.locks.length,
  });
  return { proofUrl, text, proofHref: proofPath("lock", first.txHash, first.id) };
}

export function LockSuccessDialog({
  open,
  onOpenChange,
  result,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: LockSuccessResult | null;
}) {
  const now = useNowSec();
  if (!result || result.locks.length === 0) return null;

  const first = result.locks[0];
  const { proofUrl, text, proofHref } = sharePayload(result);
  const left = remainingUntil(result.unlockAt, Number(now));
  const unlockLabel = `${dateFmt.format(new Date(result.unlockAt * 1000))} UTC`;
  const remainingLabel = formatCountdown(left, "Unlocked");
  const split = result.locks.length > 1;

  async function copyDetails() {
    await copyToClipboard(text, "Copied — paste this on X");
  }

  async function copyLink() {
    await copyToClipboard(proofUrl, "Proof link copied");
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[min(34rem,calc(100vw-1.5rem))]">
          <DialogHeader>
            <div className="mb-1 flex size-10 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300">
              <CheckCircle2 className="size-5" />
            </div>
            <DialogTitle>Token locked successfully</DialogTitle>
            <DialogDescription>
              Your tokens are on-chain and cannot move until the unlock date. Copy the proof below
              to share on X.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 px-5 py-4">
            <div className="dash-well overflow-hidden">
              {[
                { key: "Amount", value: `${result.totalAmount} ${result.symbol}` },
                { key: "Unlocks", value: unlockLabel },
                { key: "Time left", value: remainingLabel },
                {
                  key: split ? "Wallets" : "Unlock to",
                  value: split
                    ? `${result.locks.length} beneficiaries`
                    : shorten(first.beneficiary),
                },
                {
                  key: split ? "Lock IDs" : "Lock ID",
                  value: result.locks.map((lock) => `#${lock.id}`).join(", "),
                },
              ].map((row) => (
                <div className="kv" key={row.key} style={{ padding: "0.7rem 0.9rem" }}>
                  <span className="kv-key">{row.key}</span>
                  <span className="kv-val">{row.value}</span>
                </div>
              ))}
            </div>

            {split ? (
              <ul className="m-0 grid list-none gap-1.5 p-0">
                {result.locks.map((lock) => (
                  <li
                    key={lock.id}
                    className="dash-well flex items-center justify-between gap-3 px-3 py-2 text-xs"
                  >
                    <span className="font-mono text-white/70">#{lock.id}</span>
                    <span className="text-white">
                      {lock.amount} {result.symbol}
                    </span>
                    <span className="font-mono text-white/55">{shorten(lock.beneficiary)}</span>
                  </li>
                ))}
              </ul>
            ) : null}

            <div className="dash-well px-3.5 py-3">
              <div className="mb-1 text-[0.68rem] font-medium tracking-[0.08em] text-white/45 uppercase">
                {CONTRACT_LABEL.locker}
              </div>
              <p className="m-0 break-all font-mono text-[0.72rem] leading-relaxed text-white/80">
                {proofUrl}
              </p>
            </div>
          </div>

          <DialogFooter>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn sm" onClick={() => void copyDetails()}>
                <Copy className="size-3.5" />
                Copy for X
              </button>
              <a
                className="btn ghost sm"
                href={twitterIntentUrl(text)}
                target="_blank"
                rel="noreferrer"
              >
                <Share2 className="size-3.5" />
                Share on X
              </a>
              <Link className="btn ghost sm" href={proofHref}>
                <ExternalLink className="size-3.5" />
                Open explorer
              </Link>
              <TxExplorerLink hash={first.txHash} variant="text" className="ml-auto self-center">
                Arcscan
              </TxExplorerLink>
            </div>
            <button type="button" className="btn ghost sm" onClick={() => void copyLink()}>
              Copy proof link
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {!open ? (
        <div className="form-notice form-notice-ok" role="status">
          <div className="form-notice-body">
            <strong>Token locked successfully</strong>
            <p>
              {result.totalAmount} {result.symbol} · unlocks {unlockLabel} · {remainingLabel}. Copy
              the proof to share on X.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="form-notice-action" onClick={() => onOpenChange(true)}>
              View details
            </button>
            <button type="button" className="btn ghost sm" onClick={() => void copyDetails()}>
              Copy for X
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
