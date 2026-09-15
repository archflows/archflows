/**
 * One-off Arc Testnet wallet round-trip test.
 * Generates temp wallets, funds them from PRIVATE_KEY in .env.local,
 * then sweeps funds back. Does not print private keys.
 */
import { readFileSync } from "fs";
import { resolve } from "path";
import {
  createPublicClient,
  createWalletClient,
  http,
  parseUnits,
  formatUnits,
  defineChain,
} from "viem";
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";

function loadEnv(path) {
  let text;
  try {
    text = readFileSync(path, "utf8");
  } catch {
    return {};
  }
  const out = {};
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    out[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
  return out;
}

const cwd = process.cwd();
const env = {
  ...loadEnv(resolve(cwd, ".env")),
  ...loadEnv(resolve(cwd, ".env.local")),
};
const pk = env.PRIVATE_KEY || env.DEPLOYER_PRIVATE_KEY;
if (!pk?.startsWith("0x")) {
  console.error("PRIVATE_KEY missing in .env / .env.local");
  process.exit(1);
}

const arc = defineChain({
  id: 5042002,
  name: "Arc Testnet",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: { default: { http: [env.ARC_TESTNET_RPC || env.ARC_TESTNET_RPC_URL || "https://rpc.testnet.arc.network"] } },
});

const fees = {
  maxFeePerGas: 20_000_000_000n,
  maxPriorityFeePerGas: 1_000_000_000n,
};

const funder = privateKeyToAccount(pk);
const publicClient = createPublicClient({
  chain: arc,
  transport: http(arc.rpcUrls.default.http[0]),
});
const funderWallet = createWalletClient({
  account: funder,
  chain: arc,
  transport: http(arc.rpcUrls.default.http[0]),
});

async function bal(addr) {
  const native = await publicClient.getBalance({ address: addr });
  return { native, native18: formatUnits(native, 18) };
}

function log(step, data) {
  console.log(JSON.stringify({ step, ...data }));
}

const before = await bal(funder.address);
log("funder_before", { address: funder.address, usdc: before.native18 });

const kids = Array.from({ length: 2 }, () => {
  const key = generatePrivateKey();
  return { key, account: privateKeyToAccount(key) };
});
log("generated", { count: kids.length, addresses: kids.map((k) => k.account.address) });

// Native USDC send — Arc docs recommend native value transfer (18 decimals)
const perWallet = parseUnits("0.2", 18);
for (const kid of kids) {
  const hash = await funderWallet.sendTransaction({
    to: kid.account.address,
    value: perWallet,
    ...fees,
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  log("funded", {
    to: kid.account.address,
    hash,
    status: receipt.status,
    amount: "0.2",
  });
}

for (const kid of kids) {
  const b = await bal(kid.account.address);
  log("kid_funded", { address: kid.account.address, usdc: b.native18 });
}

// Sweep back: leave tiny dust for residual gas accounting
for (const kid of kids) {
  const kidWallet = createWalletClient({
    account: kid.account,
    chain: arc,
    transport: http(arc.rpcUrls.default.http[0]),
  });
  const current = await publicClient.getBalance({ address: kid.account.address });
  const gasLimit = 65_000n;
  const maxCost = gasLimit * fees.maxFeePerGas;
  if (current <= maxCost + 1n) {
    log("skip_return", { address: kid.account.address, usdc: formatUnits(current, 18) });
    continue;
  }
  const value = current - maxCost;
  const hash = await kidWallet.sendTransaction({
    to: funder.address,
    value,
    gas: gasLimit,
    ...fees,
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  log("returned", {
    from: kid.account.address,
    hash,
    status: receipt.status,
    amount: formatUnits(value, 18),
  });
}

const afterKids = [];
for (const kid of kids) {
  const b = await bal(kid.account.address);
  afterKids.push({ address: kid.account.address, usdc: b.native18 });
}
const after = await bal(funder.address);
log("kids_after", { wallets: afterKids });
log("funder_after", { address: funder.address, usdc: after.native18 });
log("done", { ok: true });
