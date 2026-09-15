import { dateFmt, nowSec } from "@/lib/form-time";

export function shortenAddr(value?: string) {
  if (!value) return "—";
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

export function formatAmount(raw?: string) {
  if (!raw) return "—";
  try {
    const n = BigInt(raw);
    const whole = n / 1_000_000n;
    const frac = n % 1_000_000n;
    if (frac === 0n) return whole.toLocaleString("en-US");
    const dec = frac.toString().padStart(6, "0").replace(/0+$/, "");
    return `${whole.toLocaleString("en-US")}.${dec}`;
  } catch {
    return raw;
  }
}

export function formatUnlock(unix?: string | number) {
  const n = Number(unix);
  if (!Number.isFinite(n) || n <= 0) return "—";
  return `${dateFmt.format(new Date(n * 1000))} UTC`;
}

export function lockStatus(row: { kind?: string; amount?: string; claimed?: string; end_at?: string | number }) {
  const now = nowSec();
  const end = Number(row.end_at);
  const amount = BigInt(row.amount || "0");
  const claimed = BigInt(row.claimed || "0");
  if (amount > 0n && claimed >= amount) return "Claimed";
  if (Number.isFinite(end) && now >= end) return "Unlocked";
  return row.kind === "vest" ? "Vesting" : "Sealed";
}

export function moduleLabel(module: string) {
  if (module === "lock") return "Lock";
  if (module === "stream") return "Stream";
  if (module === "campaign") return "Airdrop";
  if (module === "escrow") return "Escrow";
  if (module === "pool") return "Stake";
  return module;
}
