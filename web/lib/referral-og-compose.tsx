import React from "react";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ImageResponse } from "next/og";
import sharp from "sharp";
import { referralQrDataUrl } from "@/lib/referral-qr";

export const REFERRAL_OG_SIZE = { width: 1200, height: 630 };

const SRC = { width: 1024, height: 576 };

/** Layout measured from clean referral-card-base.png */
const LAYOUT = {
  code: {
    text: { x: 59, y: 518 },
    fontSize: 26,
    letterSpacing: "0.07em",
    color: "#001347",
  },
  link: {
    text: { x: 428, y: 518 },
    fontSize: 14,
    color: "#01093e",
  },
  qr: { x: 894, y: 462, w: 72, h: 74, padding: 6 },
};

const here = dirname(fileURLToPath(import.meta.url));
const assetsDir = join(here, "..", "app", "r", "[code]", "og-assets");
const lockFonts = join(here, "..", "app", "lock", "[id]", "og-assets", "fonts");

function sx(value: number) {
  return Math.round(value * REFERRAL_OG_SIZE.width / SRC.width);
}

function sy(value: number) {
  return Math.round(value * REFERRAL_OG_SIZE.height / SRC.height);
}

function scaleRect(rect: { x: number; y: number; w: number; h: number }) {
  return { x: sx(rect.x), y: sy(rect.y), w: sx(rect.w), h: sy(rect.h) };
}

function sourceRect(rect: { x: number; y: number; w: number; h: number }) {
  return { x: rect.x, y: rect.y, w: rect.w, h: rect.h };
}

function toArrayBuffer(buf: Buffer): ArrayBuffer {
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
}

function dataUrlToBuffer(dataUrl: string) {
  const base64 = dataUrl.split(",")[1] ?? "";
  return Buffer.from(base64, "base64");
}

function eraseQrPattern(
  data: Buffer,
  width: number,
  rect: { x: number; y: number; w: number; h: number },
) {
  for (let y = rect.y; y < rect.y + rect.h; y++) {
    for (let x = rect.x; x < rect.x + rect.w; x++) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      if (r > 245 && g > 245 && b > 245) continue;
      data[idx] = 255;
      data[idx + 1] = 255;
      data[idx + 2] = 255;
      data[idx + 3] = 255;
    }
  }
}

async function prepareBase(base: Buffer) {
  const { data, info } = await sharp(base).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const width = info.width;
  eraseQrPattern(data, width, sourceRect(LAYOUT.qr));

  return sharp(data, {
    raw: { width, height: info.height, channels: 4 },
  })
    .png()
    .toBuffer();
}

async function stripWhiteBackground(png: Buffer) {
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

  for (let i = 0; i < data.length; i += 4) {
    if (data[i] > 248 && data[i + 1] > 248 && data[i + 2] > 248) {
      data[i + 3] = 0;
    }
  }

  return sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .toBuffer();
}

async function buildTextLayer(
  code: string,
  shortLink: string,
  fonts: { bold: ArrayBuffer; regular: ArrayBuffer },
) {
  const codeSize = sy(LAYOUT.code.fontSize);
  const linkSize = sy(LAYOUT.link.fontSize);
  const codeTop = sy(LAYOUT.code.text.y) - Math.round(codeSize * 0.82);
  const linkTop = sy(LAYOUT.link.text.y) - Math.round(linkSize * 0.82);

  const response = new ImageResponse(
    <div
      style={{
        width: REFERRAL_OG_SIZE.width,
        height: REFERRAL_OG_SIZE.height,
        display: "flex",
        position: "relative",
        background: "transparent",
      }}
    >
      <div
        style={{
          display: "flex",
          position: "absolute",
          left: sx(LAYOUT.code.text.x),
          top: codeTop,
          fontFamily: "Sora",
          fontSize: codeSize,
          fontWeight: 700,
          letterSpacing: LAYOUT.code.letterSpacing,
          color: LAYOUT.code.color,
          lineHeight: 1,
        }}
      >
        {code}
      </div>
      <div
        style={{
          display: "flex",
          position: "absolute",
          left: sx(LAYOUT.link.text.x),
          top: linkTop,
          fontFamily: "Sora",
          fontSize: linkSize,
          fontWeight: 400,
          color: LAYOUT.link.color,
          lineHeight: 1,
        }}
      >
        {shortLink}
      </div>
    </div>,
    {
      width: REFERRAL_OG_SIZE.width,
      height: REFERRAL_OG_SIZE.height,
      fonts: [
        { name: "Sora", data: fonts.bold, weight: 700, style: "normal" },
        { name: "Sora", data: fonts.regular, weight: 400, style: "normal" },
      ],
    },
  );

  const raw = Buffer.from(await response.arrayBuffer());
  return stripWhiteBackground(raw);
}

async function buildQrComposite(qrDataUrl: string) {
  const box = scaleRect(LAYOUT.qr);
  const padding = Math.max(sx(LAYOUT.qr.padding), sy(LAYOUT.qr.padding));
  const size = Math.max(1, Math.min(box.w, box.h) - padding * 2);

  const qrPng = await sharp(dataUrlToBuffer(qrDataUrl))
    .resize(size, size, { fit: "fill" })
    .png()
    .toBuffer();

  return {
    input: qrPng,
    left: box.x + Math.round((box.w - size) / 2),
    top: box.y + Math.round((box.h - size) / 2),
  };
}

export async function renderReferralOgPng(code: string, link: string) {
  const shortLink = link.replace(/^https?:\/\//, "");
  const display = code || "INVITE";

  const [base, fontBold, fontRegular, qrDataUrl] = await Promise.all([
    readFile(join(assetsDir, "referral-card-base.png")),
    readFile(join(lockFonts, "Sora-700.ttf")),
    readFile(join(lockFonts, "Sora-Regular.ttf")),
    referralQrDataUrl(link),
  ]);

  const preparedBase = await prepareBase(base);

  const resizedBase = await sharp(preparedBase)
    .resize(REFERRAL_OG_SIZE.width, REFERRAL_OG_SIZE.height, { fit: "fill" })
    .png()
    .toBuffer();

  const [textLayer, qrComposite] = await Promise.all([
    buildTextLayer(display, shortLink, {
      bold: toArrayBuffer(fontBold),
      regular: toArrayBuffer(fontRegular),
    }),
    buildQrComposite(qrDataUrl),
  ]);

  return sharp(resizedBase)
    .composite([
      { input: textLayer, top: 0, left: 0 },
      qrComposite,
    ])
    .png()
    .toBuffer();
}
