import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const landscape = process.argv.includes("landscape") || process.argv.includes("--landscape");
const WIDTH = landscape ? 1920 : 1080;
const HEIGHT = landscape ? 1080 : 1920;
const PAGE = landscape ? "landscape.html" : "index.html";
const OUT = path.join(
  __dirname,
  landscape ? "arcflows-intro-landscape.mp4" : "arcflows-intro.mp4"
);
const FPS = 30;
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
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
        });
        res.end(data);
      });
    });
    server.listen(0, "127.0.0.1", () => {
      resolve({ server, port: server.address().port });
    });
  });
}

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: "inherit", windowsHide: true });
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} exited ${code}`));
    });
  });
}

const { server, port } = await startServer();
console.log(`render ${WIDTH}x${HEIGHT}  ${PAGE}  → ${path.basename(OUT)}`);
const framesDir = fs.mkdtempSync(path.join(os.tmpdir(), "arcflows-intro-"));

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: [
    "--hide-scrollbars",
    "--font-render-hinting=none",
    `--window-size=${WIDTH},${HEIGHT}`,
  ],
});

try {
  const page = await browser.newPage();
  await page.setViewport({ width: WIDTH, height: HEIGHT, deviceScaleFactor: 1 });
  await page.goto(`http://127.0.0.1:${port}/intro/${PAGE}?render=1`, {
    waitUntil: "networkidle0",
  });
  await page.waitForFunction(() => window.__ready === true, { timeout: 20000 });

  const duration = await page.evaluate(() => window.DURATION);
  const total = Math.round(duration * FPS);

  for (let i = 0; i < total; i++) {
    const t = i / FPS;
    await page.evaluate((time) => window.seek(time), t);
    const file = path.join(framesDir, `${String(i).padStart(5, "0")}.jpg`);
    await page.screenshot({
      path: file,
      type: "jpeg",
      quality: 92,
      clip: { x: 0, y: 0, width: WIDTH, height: HEIGHT },
    });
    if (i % 30 === 0) console.log(`frame ${i + 1}/${total}  t=${t.toFixed(2)}s`);
  }

  await browser.close();
  server.close();

  console.log("encoding mp4…");
  await run("ffmpeg", [
    "-y",
    "-framerate",
    String(FPS),
    "-i",
    path.join(framesDir, "%05d.jpg"),
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-crf",
    "16",
    "-preset",
    "medium",
    "-movflags",
    "+faststart",
    OUT,
  ]);

  fs.rmSync(framesDir, { recursive: true, force: true });
  console.log(`wrote ${OUT}`);
} catch (err) {
  await browser.close().catch(() => {});
  server.close();
  throw err;
}
