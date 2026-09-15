/** Read a named ABI tuple whether viem returned an array, a named object, or both. */
export function abiField<T>(raw: unknown, index: number, name: string): T | undefined {
  if (raw == null || (typeof raw !== "object" && !Array.isArray(raw))) return undefined;
  const rec = raw as Record<string | number, unknown>;
  if (rec[name] !== undefined) return rec[name] as T;
  return rec[index] as T | undefined;
}

export function asBigint(value: unknown, fallback = 0n): bigint {
  if (typeof value === "bigint") return value;
  if (typeof value === "number" && Number.isFinite(value)) return BigInt(value);
  if (typeof value === "string" && value !== "") {
    try {
      return BigInt(value);
    } catch {
      return fallback;
    }
  }
  return fallback;
}

export function asBool(value: unknown): boolean {
  return value === true;
}

export function asAddress(value: unknown): `0x${string}` | undefined {
  if (typeof value !== "string") return undefined;
  if (!/^0x[a-fA-F0-9]{40}$/.test(value)) return undefined;
  return value as `0x${string}`;
}
