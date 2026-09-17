import http from "node:http";
import https from "node:https";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function backendConfig() {
  const base = (process.env.ARCFLOW_API_URL || "http://localhost:4000").replace(/\/$/, "");
  const key = process.env.ARCFLOW_API_KEY || "";
  return { base, key };
}

type Upstream = {
  status: number;
  headers: http.IncomingHttpHeaders;
  body: Buffer;
};

/**
 * Bypass Next's patched `fetch`. That patch follows 301/302 by turning POST into GET, which
 * is why `/v1/referrals/signup` never reached the real route and nothing landed in the DB.
 */
function requestUpstream(
  url: string,
  opts: { method: string; headers: Record<string, string>; body?: Buffer; timeoutMs: number },
): Promise<Upstream> {
  const maxHops = 5;

  const run = (current: string, hops: number): Promise<Upstream> =>
    new Promise((resolve, reject) => {
      const parsed = new URL(current);
      const lib = parsed.protocol === "https:" ? https : http;
      const headers = { ...opts.headers };
      if (opts.body?.length) headers["content-length"] = String(opts.body.length);

      const req = lib.request(
        parsed,
        { method: opts.method, headers, timeout: opts.timeoutMs },
        (res) => {
          const status = res.statusCode ?? 500;
          const location = res.headers.location;
          if (location && status >= 300 && status < 400 && hops < maxHops) {
            res.resume();
            resolve(run(new URL(location, current).toString(), hops + 1));
            return;
          }
          const chunks: Buffer[] = [];
          res.on("data", (chunk) => chunks.push(chunk as Buffer));
          res.on("end", () =>
            resolve({ status, headers: res.headers, body: Buffer.concat(chunks) }),
          );
          res.on("error", reject);
        },
      );
      req.on("error", reject);
      req.on("timeout", () => {
        req.destroy();
        reject(new Error("timeout"));
      });
      if (opts.body?.length) req.write(opts.body);
      req.end();
    });

  return run(url, 0);
}

function headerValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value.join(", ");
  return value;
}

async function proxy(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  if (!path?.length || path[0] !== "v1") {
    return NextResponse.json(
      { ok: false, error: { code: "not_found", message: "Not found" } },
      { status: 404 },
    );
  }

  const { base, key } = backendConfig();
  if (!key) {
    return NextResponse.json(
      { ok: false, error: { code: "misconfigured", message: "API is not configured" } },
      { status: 500 },
    );
  }

  const url = `${base}/${path.map(encodeURIComponent).join("/")}${req.nextUrl.search}`;
  const headers: Record<string, string> = {
    accept: "application/json",
    "x-api-key": key,
  };
  const contentType = req.headers.get("content-type");
  if (contentType && req.method !== "GET" && req.method !== "HEAD") {
    headers["content-type"] = contentType;
  }

  const rawBody =
    req.method === "GET" || req.method === "HEAD" ? undefined : Buffer.from(await req.arrayBuffer());

  let upstream: Upstream;
  try {
    upstream = await requestUpstream(url, {
      method: req.method,
      headers,
      body: rawBody?.length ? rawBody : undefined,
      timeoutMs: 12_000,
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: { code: "upstream_timeout", message: "API did not respond in time" } },
      { status: 504 },
    );
  }

  const res = new NextResponse(new Uint8Array(upstream.body), { status: upstream.status });
  const type = headerValue(upstream.headers["content-type"]);
  if (type) res.headers.set("content-type", type);
  const cacheControl = headerValue(upstream.headers["cache-control"]);
  if (cacheControl) res.headers.set("cache-control", cacheControl);
  return res;
}

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const PUT = proxy;
export const DELETE = proxy;
