import {
  encodeAbiParameters,
  encodePacked,
  keccak256,
  parseUnits,
  type Address,
  type Hex,
} from "viem";
import { parseAddressAmountCsv, type AddressAmountRow } from "@/lib/csv";

export type MerkleLeaf = {
  index: number;
  account: Address;
  amount: bigint;
  leaf: Hex;
};

export type MerkleTree = {
  root: Hex;
  leaves: MerkleLeaf[];
  total: bigint;
};

function hashPair(a: Hex, b: Hex): Hex {
  return a.toLowerCase() < b.toLowerCase()
    ? keccak256(encodePacked(["bytes32", "bytes32"], [a, b]))
    : keccak256(encodePacked(["bytes32", "bytes32"], [b, a]));
}

export function leafHash(index: bigint, account: Address, amount: bigint): Hex {
  return keccak256(
    keccak256(
      encodeAbiParameters(
        [
          { type: "uint256" },
          { type: "address" },
          { type: "uint128" },
        ],
        [index, account, amount],
      ),
    ),
  );
}

/** Uniswap-style double-hash leaf + sorted-pair merkle tree. */
export function buildMerkleTree(rows: { account: Address; amount: bigint }[]): MerkleTree {
  if (rows.length === 0) throw new Error("Need at least one recipient.");
  const leaves: MerkleLeaf[] = rows.map((row, index) => ({
    index,
    account: row.account,
    amount: row.amount,
    leaf: leafHash(BigInt(index), row.account, row.amount),
  }));

  let layer: Hex[] = leaves.map((l) => l.leaf);
  const layers: Hex[][] = [layer];
  while (layer.length > 1) {
    const next: Hex[] = [];
    for (let i = 0; i < layer.length; i += 2) {
      if (i + 1 === layer.length) next.push(layer[i]);
      else next.push(hashPair(layer[i], layer[i + 1]));
    }
    layers.push(next);
    layer = next;
  }

  return {
    root: layer[0],
    leaves,
    total: leaves.reduce((sum, l) => sum + l.amount, 0n),
  };
}

export function getProof(tree: MerkleTree, index: number): Hex[] {
  const leaf = tree.leaves[index];
  if (!leaf) throw new Error(`No leaf at index ${index}`);

  let layer: Hex[] = tree.leaves.map((l) => l.leaf);
  let idx = index;
  const proof: Hex[] = [];

  while (layer.length > 1) {
    const sibling = idx % 2 === 0 ? idx + 1 : idx - 1;
    if (sibling < layer.length) proof.push(layer[sibling]);
    const next: Hex[] = [];
    for (let i = 0; i < layer.length; i += 2) {
      if (i + 1 === layer.length) next.push(layer[i]);
      else next.push(hashPair(layer[i], layer[i + 1]));
    }
    layer = next;
    idx = Math.floor(idx / 2);
  }
  return proof;
}

export function treeFromCsv(csv: string, decimals: number): MerkleTree {
  const rows = parseAddressAmountCsv(csv);
  return buildMerkleTree(
    rows.map((r: AddressAmountRow) => ({
      account: r.account,
      amount: parseUnits(r.amount, decimals),
    })),
  );
}

export function downloadProofJson(tree: MerkleTree, campaignId?: string) {
  const payload = {
    campaignId: campaignId ?? null,
    root: tree.root,
    total: tree.total.toString(),
    leaves: tree.leaves.map((l) => ({
      index: l.index,
      account: l.account,
      amount: l.amount.toString(),
      leaf: l.leaf,
      proof: getProof(tree, l.index),
    })),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `arcflow-airdrop${campaignId ? `-${campaignId}` : ""}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
