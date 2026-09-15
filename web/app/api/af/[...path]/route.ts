import { NextRequest, NextResponse } from "next/server";

function backendConfig() {
  const base = (process.env.ARCFLOW_API_URL || "http://localhost:4000").replace(/\/$/, "");
  const key = process.env.ARCFLOW_API_KEY || "";
  return { base, key };
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
  const headers = new Headers({
    accept: "application/json",
    "x-api-key": key,
  });
  const contentType = req.headers.get("content-type");
  if (contentType && req.method !== "GET" && req.method !== "HEAD") {
    headers.set("content-type", contentType);
  }

  const init: RequestInit = {
    method: req.method,
    headers,
    cache: "no-store",
    signal: AbortSignal.timeout(12_000),
  };
  if (req.method !== "GET" && req.method !== "HEAD") {
    const body = await req.arrayBuffer();
    if (body.byteLength) init.body = body;
  }

  let upstream: Response;
  try {
    upstream = await fetch(url, init);
  } catch {
    return NextResponse.json(
      { ok: false, error: { code: "upstream_timeout", message: "API did not respond in time" } },
      { status: 504 },
    );
  }

  const payload = await upstream.arrayBuffer();
  const res = new NextResponse(payload, { status: upstream.status });
  const type = upstream.headers.get("content-type");
  if (type) res.headers.set("content-type", type);
  const cacheControl = upstream.headers.get("cache-control");
  if (cacheControl) res.headers.set("cache-control", cacheControl);
  return res;
}

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const PUT = proxy;
export const DELETE = proxy;
