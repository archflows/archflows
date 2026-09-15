import { isAddress } from "viem";

export type AddressAmountRow = {
  account: `0x${string}`;
  amount: string;
};

/** Parses `address,amount` lines. Header row optional. Comma, semicolon, tab, or space. */
export function parseAddressAmountCsv(text: string): AddressAmountRow[] {
  const rows: AddressAmountRow[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const parts = line.split(/[,;\t]+/).map((p) => p.trim()).filter(Boolean);
    if (parts.length < 2) continue;
    const head = parts[0].toLowerCase();
    if (head === "address" || head === "account" || head === "wallet" || head === "recipient") {
      continue;
    }
    if (!isAddress(parts[0])) {
      throw new Error(`Not an address: ${parts[0]}`);
    }
    rows.push({ account: parts[0], amount: parts[1].replace(/_/g, "") });
  }
  if (rows.length === 0) throw new Error("CSV needs at least one address,amount row.");
  return rows;
}
