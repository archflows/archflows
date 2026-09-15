export const DAY = 86400;
export const HOUR = 3600;
export const MINUTE = 60;
export const MIN_DURATION_SEC = 60;
export const ZERO = "0x0000000000000000000000000000000000000000";

export const dateFmt = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "UTC",
});

export function nowSec() {
  return Math.floor(Date.now() / 1000);
}

export function toLocalInput(unix: number) {
  const d = new Date(unix * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function sameAddress(a?: string, b?: string) {
  return Boolean(a && b && a.toLowerCase() === b.toLowerCase());
}

export function parseCount(raw: string) {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n);
}

export function formatDuration(sec: number) {
  if (sec <= 0) return "—";
  const d = Math.floor(sec / DAY);
  const h = Math.floor((sec % DAY) / HOUR);
  const m = Math.floor((sec % HOUR) / MINUTE);
  const parts: string[] = [];
  if (d) parts.push(`${d} day${d === 1 ? "" : "s"}`);
  if (h) parts.push(`${h} hour${h === 1 ? "" : "s"}`);
  if (m || parts.length === 0) parts.push(`${m} min`);
  return parts.join(" ");
}

export function shorten(addr?: string) {
  if (!addr) return "Connect wallet";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}
