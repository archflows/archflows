import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const assetsDir = join(dirname(fileURLToPath(import.meta.url)), "og-assets");

function toDataUri(buf: Buffer, mime: string) {
  return `data:${mime};base64,${buf.toString("base64")}`;
}

function toArrayBuffer(buf: Buffer): ArrayBuffer {
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
}

export type OgAssets = {
  backgroundSrc: string;
  logoSrc: string;
  fonts: {
    name: string;
    data: ArrayBuffer;
    weight: 400 | 600 | 700;
    style: "normal";
  }[];
};

export async function loadOgAssets(): Promise<OgAssets> {
  const [bg, logo, sora600, sora700, mono400] = await Promise.all([
    readFile(join(assetsDir, "og-lock-bg.png")),
    readFile(join(assetsDir, "logoarcflows-v2.png")),
    readFile(join(assetsDir, "fonts/Sora-600.ttf")),
    readFile(join(assetsDir, "fonts/Sora-700.ttf")),
    readFile(join(assetsDir, "fonts/IBMPlexMono-400.ttf")),
  ]);

  return {
    backgroundSrc: toDataUri(bg, "image/png"),
    logoSrc: toDataUri(logo, "image/png"),
    fonts: [
      { name: "Sora", data: toArrayBuffer(sora600), weight: 600, style: "normal" },
      { name: "Sora", data: toArrayBuffer(sora700), weight: 700, style: "normal" },
      { name: "IBM Plex Mono", data: toArrayBuffer(mono400), weight: 400, style: "normal" },
    ],
  };
}
