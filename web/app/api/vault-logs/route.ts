import { NextRequest, NextResponse } from "next/server";
import { fetchArcFlowLogsDirect, serializeArcFlowLogs } from "@/lib/arcflow-logs";
import { ARCFLOW_ADDRESS, ZERO } from "@/lib/chain";

export async function GET(req: NextRequest) {
  if (ARCFLOW_ADDRESS === ZERO) {
    return NextResponse.json({ logs: [] });
  }

  const raw = Number(req.nextUrl.searchParams.get("pages") ?? "20");
  const pages = Number.isFinite(raw) ? Math.min(20, Math.max(1, Math.trunc(raw))) : 20;

  try {
    const logs = await fetchArcFlowLogsDirect(pages);
    return NextResponse.json({ logs: serializeArcFlowLogs(logs) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load vault logs";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
