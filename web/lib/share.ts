import { dateFmt } from "@/lib/form-time";
import { CONTRACT_LABEL } from "@/lib/brand";
import { proofPath, type ProofModule } from "@/lib/proof";
import { af } from "@/lib/public-env";

export function absoluteUrl(path: string) {
  const origin =
    typeof window !== "undefined" ? window.location.origin : af.site.replace(/\/$/, "");
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${origin}${normalized}`;
}

export function proofAbsoluteUrl(
  module: ProofModule,
  hash?: string | null,
  fallbackId?: string | number | bigint,
) {
  return absoluteUrl(proofPath(module, hash, fallbackId));
}

export function twitterIntentUrl(text: string) {
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
}

export function lockShareText(opts: {
  amount: string;
  symbol: string;
  unlockAt: number;
  proofUrl: string;
  walletCount?: number;
}) {
  const when = dateFmt.format(new Date(opts.unlockAt * 1000));
  const split =
    opts.walletCount && opts.walletCount > 1 ? ` across ${opts.walletCount} wallets` : "";
  return [
    `Token locked successfully on ${CONTRACT_LABEL.locker}.`,
    "",
    `${opts.amount} ${opts.symbol}${split} — unlocks ${when} UTC.`,
    "",
    `Proof: ${opts.proofUrl}`,
  ].join("\n");
}
