export const TX_HASH_RE = /^0x[a-fA-F0-9]{64}$/;

export type ProofModule = "lock" | "stream" | "airdrop" | "escrow" | "staking";

export function isTxHash(value?: string | null): value is string {
  return typeof value === "string" && TX_HASH_RE.test(value);
}

export function normalizeTxHash(value: string) {
  return value.toLowerCase();
}

export function shortHash(hash?: string | null) {
  if (!isTxHash(hash)) return hash || "";
  return `${hash.slice(0, 10)}…${hash.slice(-4)}`;
}

export function proofPath(
  module: ProofModule,
  hash?: string | null,
  fallbackId?: string | number | bigint,
) {
  if (isTxHash(hash)) return `/${module}/${hash.toLowerCase()}`;
  if (fallbackId != null && String(fallbackId) !== "") return `/${module}/${String(fallbackId)}`;
  return `/${module}`;
}

const ACTIVITY_MODULE: Record<string, ProofModule> = {
  lock: "lock",
  stream: "stream",
  campaign: "airdrop",
  escrow: "escrow",
  pool: "staking",
};

export function activityProofPath(row: {
  module: string;
  tx_hash?: string | null;
  id: string;
}) {
  const module = ACTIVITY_MODULE[row.module];
  if (!module) return undefined;
  return proofPath(module, row.tx_hash, row.id);
}
