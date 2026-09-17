import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const webDir = join(__dirname, "..", "..", "web");
const code = process.argv[2] ?? "BFK2DHWX";

const child = spawn(
  "npx",
  ["--yes", "tsx", "scripts/render-referral-og.tsx", code],
  { cwd: webDir, stdio: "inherit", shell: true },
);

child.on("exit", (exitCode) => process.exit(exitCode ?? 1));
