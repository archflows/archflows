import { formatUnits } from "viem";

/** Compact a human number (already decimalized): 1.2K / 3.4M / 2.1B / 1.5T */
export function formatCompactNumber(n: number): string {
  if (!Number.isFinite(n)) return "—";
  if (n === 0) return "0";

  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";

  const tiers: { div: number; suffix: string }[] = [
    { div: 1e12, suffix: "T" },
    { div: 1e9, suffix: "B" },
    { div: 1e6, suffix: "M" },
    { div: 1e3, suffix: "K" },
  ];

  for (const { div, suffix } of tiers) {
    if (abs >= div) {
      const scaled = abs / div;
      const digits = scaled >= 100 ? 0 : scaled >= 10 ? 1 : 2;
      const text = scaled
        .toFixed(digits)
        .replace(/\.0+$/, "")
        .replace(/(\.\d*[1-9])0+$/, "$1");
      return `${sign}${text}${suffix}`;
    }
  }

  return `${sign}${abs.toLocaleString("en-US", {
    maximumFractionDigits: abs >= 100 ? 2 : 4,
  })}`;
}

/** Compact token amounts from raw on-chain units. */
export function formatCompactAmount(
  value: bigint | undefined,
  decimals: number,
): string {
  if (value === undefined) return "—";
  const n = Number(formatUnits(value, decimals));
  if (!Number.isFinite(n)) return formatUnits(value, decimals);
  return formatCompactNumber(n);
}
