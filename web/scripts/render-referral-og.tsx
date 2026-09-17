import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { renderReferralOgPng } from "../lib/referral-og-compose";
import { referralShareUrl } from "../lib/referral-share";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(scriptDir, "..", "..");
const outDir = join(repoRoot, "content", "referral", "out");

const code = (process.argv[2] ?? "BFK2DHWX").toUpperCase();
const site = "https://arcflows.finance";
const link = referralShareUrl(site, code);

async function main() {
  const png = await renderReferralOgPng(code, link);
  await mkdir(outDir, { recursive: true });

  const previewPath = join(outDir, "referral-og-preview.png");
  const codePath = join(outDir, `referral-og-${code}.png`);

  await writeFile(previewPath, png);
  await writeFile(codePath, png);

  console.log(`Wrote ${previewPath}`);
  console.log(`Wrote ${codePath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
