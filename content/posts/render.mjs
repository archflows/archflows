import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";
import { findChrome } from "./chrome.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(__dirname, "out");

const CARD = { width: 1600, height: 900 };
const CLIP = { width: 1920, height: 1080 };
const FPS = 30;

const args = process.argv.slice(2);
const mode = args.includes("clips") ? "clips" : args.includes("sample") ? "sample" : "cards";
const only = args.find((arg) => arg.startsWith("--only="))?.slice(7);

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

function log(line) {
  process.stdout.write(`${line}\n`);
}

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

function run(cmd, cmdArgs) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, cmdArgs, { stdio: ["ignore", "ignore", "inherit"] });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} exited ${code}`));
    });
  });
}

async function openPage(browser, url, size) {
  const page = await browser.newPage();
  const failures = [];
  page.on("pageerror", (err) => failures.push(String(err)));
  page.on("requestfailed", (req) => failures.push(`asset failed: ${req.url()}`));

  await page.setViewport({ ...size, deviceScaleFactor: 1 });
  await page.goto(url, { waitUntil: "networkidle0" });
  try {
    await page.waitForFunction(() => window.__ready === true, { timeout: 20000 });
  } catch (err) {
    throw new Error(failures.length ? failures.join("\n") : String(err));
  }
  const error = await page.evaluate(() => window.__buildError);
  if (error) throw new Error([error, ...failures].join("\n"));
  if (failures.length) throw new Error(failures.join("\n"));
  return page;
}

async function renderCards(browser, port, data) {
  const posts = only ? data.posts.filter((post) => post.slug.includes(only)) : data.posts;
  for (const post of posts) {
    const page = await openPage(
      browser,
      `http://127.0.0.1:${port}/posts/card.html?slug=${post.slug}`,
      CARD
    );
    const file = path.join(OUT_DIR, `${post.slug}.png`);
    await page.screenshot({
      path: file,
      type: "png",
      clip: { x: 0, y: 0, ...CARD },
    });
    await page.close();
    log(`  ${post.slug}.png  ${post.template}`);
  }
  return posts.length;
}

async function renderClip(browser, port, clip) {
  const framesDir = fs.mkdtempSync(path.join(os.tmpdir(), `arcflows-${clip.slug}-`));
  const page = await openPage(
    browser,
    `http://127.0.0.1:${port}/posts/clip.html?slug=${clip.slug}`,
    CLIP
  );

  const duration = await page.evaluate(() => window.DURATION);
  const total = Math.round(duration * FPS);

  for (let i = 0; i < total; i++) {
    await page.evaluate((time) => window.seek(time), i / FPS);
    await page.screenshot({
      path: path.join(framesDir, `${String(i).padStart(5, "0")}.jpg`),
      type: "jpeg",
      quality: 92,
      clip: { x: 0, y: 0, ...CLIP },
    });
  }
  await page.close();

  const out = path.join(OUT_DIR, `${clip.slug}.mp4`);
  await run("ffmpeg", [
    "-y",
    "-loglevel", "error",
    "-framerate", String(FPS),
    "-i", path.join(framesDir, "%05d.jpg"),
    // X can reject an MP4 with no audio track, so carry a silent one
    "-f", "lavfi",
    "-i", "anullsrc=channel_layout=stereo:sample_rate=44100",
    "-shortest",
    "-c:v", "libx264",
    "-pix_fmt", "yuv420p",
    "-crf", "16",
    "-preset", "medium",
    "-c:a", "aac",
    "-b:a", "128k",
    "-movflags", "+faststart",
    out,
  ]);
  fs.rmSync(framesDir, { recursive: true, force: true });
  log(`  ${clip.slug}.mp4  ${total} frames  ${duration}s`);
}

async function renderClips(browser, port, data) {
  const clips = only ? data.clips.filter((clip) => clip.slug.includes(only)) : data.clips;
  for (const clip of clips) {
    await renderClip(browser, port, clip);
  }
  return clips.length;
}

fs.mkdirSync(OUT_DIR, { recursive: true });
const data = JSON.parse(fs.readFileSync(path.join(__dirname, "posts.json"), "utf8"));
const { server, port } = await startServer();
const browser = await puppeteer.launch({
  executablePath: findChrome(),
  headless: true,
  args: ["--hide-scrollbars", "--font-render-hinting=none", "--force-color-profile=srgb"],
});

try {
  if (mode === "clips") {
    log(`rendering clips ${CLIP.width}x${CLIP.height} @ ${FPS}fps`);
    const count = await renderClips(browser, port, data);
    log(`wrote ${count} clip(s) to out/`);
  } else if (mode === "sample") {
    log(`rendering sample ${CARD.width}x${CARD.height} @2x`);
    const page = await browser.newPage();
    page.setDefaultTimeout(20000);
    await page.setViewport({ ...CARD, deviceScaleFactor: 2 });
    await page.goto(`http://127.0.0.1:${port}/posts/sample-brand.html`, {
      waitUntil: "networkidle0",
    });
    await page.waitForFunction(() => window.__ready === true, { timeout: 20000 });
    const error = await page.evaluate(() => window.__buildError);
    if (error) throw new Error(error);
    const file = path.join(OUT_DIR, "01-lp-lock-isnt-enough.png");
    await page.screenshot({
      path: file,
      type: "png",
      clip: { x: 0, y: 0, ...CARD },
    });
    await page.close();
    log(`  01-lp-lock-isnt-enough.png`);
  } else {
    log(`rendering cards ${CARD.width}x${CARD.height}`);
    const count = await renderCards(browser, port, data);
    log(`wrote ${count} card(s) to out/`);
  }
} finally {
  await browser.close().catch(() => {});
  server.close();
}
