import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { findChrome } from "../../posts/chrome.mjs";

const require = createRequire(
  path.join(path.dirname(fileURLToPath(import.meta.url)), "../../posts/package.json")
);
const puppeteer = require("puppeteer-core");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const OUT_DIR = path.join(__dirname, "out");
const CARD = { width: 1600, height: 900 };

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ttf": "font/ttf",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
      const file = path.normalize(path.join(ROOT, urlPath));
      if (!file.startsWith(ROOT)) {
        res.writeHead(403);
        res.end();
        return;
      }
      fs.readFile(file, (err, data) => {
        if (err) {
          res.writeHead(404);
          res.end("not found");
          return;
        }
        res.writeHead(200, {
          "Content-Type": MIME[path.extname(file)] || "application/octet-stream",
          "Cache-Control": "no-store",
        });
        res.end(data);
      });
    });
    server.listen(0, "127.0.0.1", () => {
      resolve({ server, port: server.address().port });
    });
  });
}

fs.mkdirSync(OUT_DIR, { recursive: true });
const data = JSON.parse(fs.readFileSync(path.join(__dirname, "data.json"), "utf8"));
const { server, port } = await startServer();
const browser = await puppeteer.launch({
  executablePath: findChrome(),
  headless: true,
  args: ["--hide-scrollbars", "--font-render-hinting=none", "--force-color-profile=srgb"],
});

try {
  process.stdout.write(`rendering article cards ${CARD.width}x${CARD.height}\n`);
  for (const post of data.posts) {
    const page = await browser.newPage();
    const failures = [];
    page.on("pageerror", (err) => failures.push(String(err)));
    page.on("requestfailed", (req) => failures.push(`asset failed: ${req.url()}`));
    await page.setViewport({ ...CARD, deviceScaleFactor: 1 });
    await page.goto(
      `http://127.0.0.1:${port}/articles/once-sealed/stage.html?slug=${post.slug}`,
      { waitUntil: "networkidle0" }
    );
    try {
      await page.waitForFunction(() => window.__ready === true, { timeout: 20000 });
    } catch (err) {
      throw new Error(failures.length ? failures.join("\n") : String(err));
    }
    const error = await page.evaluate(() => window.__buildError);
    if (error) throw new Error([error, ...failures].join("\n"));
    if (failures.length) throw new Error(failures.join("\n"));
    const file = path.join(OUT_DIR, `${post.slug}.png`);
    await page.screenshot({
      path: file,
      type: "png",
      clip: { x: 0, y: 0, ...CARD },
    });
    await page.close();
    process.stdout.write(`  ${post.slug}.png  ${post.template}\n`);
  }
  process.stdout.write(`wrote ${data.posts.length} card(s) to out/\n`);
} finally {
  await browser.close().catch(() => {});
  server.close();
}
