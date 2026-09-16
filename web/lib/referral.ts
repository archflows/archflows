const STORAGE_KEY = "arcflow:ref";
const CODE_RE = /^[A-Z2-9]{6,16}$/;

export const REFERRAL_PARAM = "ref";

export function normalizeCode(raw: string | null | undefined) {
  const code = (raw ?? "").trim().toUpperCase();
  return CODE_RE.test(code) ? code : null;
}

/**
 * A referral is captured on the click and spent much later, on the first lock. Persist it
 * so a wallet connect, a faucet detour, or a reload in between does not lose the attribution.
 */
export function rememberCode(code: string) {
  const valid = normalizeCode(code);
  if (!valid || typeof window === "undefined") return null;
  try {
    window.localStorage.setItem(STORAGE_KEY, valid);
  } catch {
    // Private mode or storage disabled — the link still works for this page view.
  }
  return valid;
}

export function storedCode() {
  if (typeof window === "undefined") return null;
  try {
    return normalizeCode(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
}

export function forgetCode() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to clean up if storage is unavailable.
  }
}

export function referralLink(code: string, origin?: string) {
  const base =
    origin ?? (typeof window === "undefined" ? "https://arcflows.finance" : window.location.origin);
  return `${base.replace(/\/$/, "")}/r/${code}`;
}

const USDC_UNIT = 1_000_000n;

/** USDC 6-decimal units to a display string. Balances are money — never route them through Number. */
export function formatUsdc(units: string | number | bigint | null | undefined, maxFraction = 2) {
  let value: bigint;
  try {
    value = BigInt(units ?? 0);
  } catch {
    return "0";
  }
  const negative = value < 0n;
  if (negative) value = -value;

  const whole = value / USDC_UNIT;
  const frac = (value % USDC_UNIT).toString().padStart(6, "0").slice(0, maxFraction).replace(/0+$/, "");
  const head = whole.toLocaleString("en-US");
  return `${negative ? "-" : ""}${frac ? `${head}.${frac}` : head}`;
}

export function parseUsdcInput(value: string) {
  const trimmed = value.trim();
  if (!/^\d*\.?\d*$/.test(trimmed) || trimmed === "" || trimmed === ".") return null;
  const [whole, frac = ""] = trimmed.split(".");
  if (frac.length > 6) return null;
  return BigInt(whole || "0") * USDC_UNIT + BigInt((frac || "0").padEnd(6, "0"));
}

export function bpsToPercent(bps: number) {
  return `${(bps / 100).toLocaleString("en-US", { maximumFractionDigits: 2 })}%`;
}
