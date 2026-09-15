type Json = Record<string, unknown>;

export type ApiList<T> = {
  items: T[];
  page: { total: number; limit: number; offset: number };
};

const BASE = "/api/af";

export function isBackendConfigured() {
  return true;
}

export function backendUrl() {
  return BASE;
}

async function request<T>(path: string, init?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: {
        "content-type": "application/json",
        ...(init?.headers ?? {}),
      },
    });
    const body = (await res.json()) as { ok?: boolean; data?: T; error?: { message?: string } };
    if (!res.ok || !body.ok) {
      console.warn("[arcflow-api]", path, res.status, body.error?.message ?? body);
      return null;
    }
    return (body.data ?? null) as T;
  } catch (error) {
    console.warn("[arcflow-api]", path, error);
    return null;
  }
}

function qs(params: Record<string, string | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}

export type LiveStats = {
  totals: {
    locks: number;
    hardLocks: number;
    vests: number;
    streams: number;
    campaigns: number;
    claims: number;
    escrow: number;
    pools: number;
  };
  wallet: {
    locksCreated: number;
    locksReceiving: number;
    streamsSent: number;
    streamsReceived: number;
    campaigns: number;
    escrow: number;
    pools: number;
  } | null;
  featured: {
    id: string;
    kind: string;
    token: string;
    beneficiary: string;
    creator: string;
    amount: string;
    claimed: string;
    start_at: string | number;
    cliff_at: string | number;
    end_at: string | number;
    created_at: string;
    tx_hash?: string | null;
    unlock_tx_hash?: string | null;
  } | null;
  series: { date: string; locks: number; claims: number }[];
  activity: {
    module: string;
    id: string;
    subtype: string;
    token: string;
    wallet: string;
    amount: string;
    end_at: string | number;
    created_at: string;
    tx_hash?: string | null;
    unlock_tx_hash?: string | null;
  }[];
};

export function pingBackend() {
  return request<Json>("/v1/config");
}

export function getStats(filters?: { wallet?: string; days?: number }) {
  return request<LiveStats>(`/v1/stats${qs({ wallet: filters?.wallet, days: filters?.days ? String(filters.days) : undefined })}`);
}

export function listLocks(filters: { creator?: string; beneficiary?: string; token?: string; kind?: string }) {
  return request<ApiList<Json>>(`/v1/locks${qs(filters)}`);
}

export function getLock(id: string) {
  return request<Json>(`/v1/locks/${encodeURIComponent(id)}`);
}

export function getStream(id: string) {
  return request<Json>(`/v1/streams/${encodeURIComponent(id)}`);
}

export function getCampaign(id: string) {
  return request<Json>(`/v1/campaigns/${encodeURIComponent(id)}`);
}

export function getEscrow(id: string) {
  return request<Json>(`/v1/escrow/${encodeURIComponent(id)}`);
}

export function getPool(id: string) {
  return request<Json>(`/v1/pools/${encodeURIComponent(id)}`);
}

export function listStreams(filters: { sender?: string; recipient?: string; token?: string }) {
  return request<ApiList<Json>>(`/v1/streams${qs(filters)}`);
}

export function listCampaigns(filters: { funder?: string; token?: string }) {
  return request<ApiList<Json>>(`/v1/campaigns${qs(filters)}`);
}

export function listEscrow(filters: { buyer?: string; seller?: string }) {
  return request<ApiList<Json>>(`/v1/escrow${qs(filters)}`);
}

export function listPools(filters: { owner?: string }) {
  return request<ApiList<Json>>(`/v1/pools${qs(filters)}`);
}

export function upsertLock(body: Json) {
  return request<Json>("/v1/locks", { method: "POST", body: JSON.stringify(body) });
}

export function patchLock(id: string, body: Json) {
  return request<Json>(`/v1/locks/${id}`, { method: "PATCH", body: JSON.stringify(body) });
}

export async function persistLockClaim(input: {
  id: string;
  claimed: string;
  unlockTxHash: string;
  token: string;
  beneficiary: string;
  creator: string;
  amount: string;
  start: string | number;
  cliff: string | number;
  end: string | number;
  kind?: "lock" | "vest";
  txHash?: string;
}) {
  const patched = await patchLock(input.id, {
    claimed: input.claimed,
    unlockTxHash: input.unlockTxHash,
  });
  if (patched) return patched;
  return upsertLock({
    id: input.id,
    kind: input.kind,
    token: input.token,
    beneficiary: input.beneficiary,
    creator: input.creator,
    amount: input.amount,
    claimed: input.claimed,
    start: Number(input.start),
    cliff: Number(input.cliff),
    end: Number(input.end),
    txHash: input.txHash,
    unlockTxHash: input.unlockTxHash,
  });
}

export function upsertStream(body: Json) {
  return request<Json>("/v1/streams", { method: "POST", body: JSON.stringify(body) });
}

export function upsertStreams(items: Json[]) {
  return request<Json>("/v1/streams/batch", { method: "POST", body: JSON.stringify({ items }) });
}

export function patchStream(id: string, body: Json) {
  return request<Json>(`/v1/streams/${id}`, { method: "PATCH", body: JSON.stringify(body) });
}

export function upsertCampaign(body: Json) {
  return request<Json>("/v1/campaigns", { method: "POST", body: JSON.stringify(body) });
}

export function patchCampaign(id: string, body: Json) {
  return request<Json>(`/v1/campaigns/${id}`, { method: "PATCH", body: JSON.stringify(body) });
}

export function upsertClaim(campaignId: string, body: Json) {
  return request<Json>(`/v1/campaigns/${campaignId}/claims`, { method: "POST", body: JSON.stringify(body) });
}

export function upsertEscrow(body: Json) {
  return request<Json>("/v1/escrow", { method: "POST", body: JSON.stringify(body) });
}

export function patchEscrow(id: string, body: Json) {
  return request<Json>(`/v1/escrow/${id}`, { method: "PATCH", body: JSON.stringify(body) });
}

export function upsertPool(body: Json) {
  return request<Json>("/v1/pools", { method: "POST", body: JSON.stringify(body) });
}

export function upsertStake(poolId: string, body: Json) {
  return request<Json>(`/v1/pools/${poolId}/stakes`, { method: "POST", body: JSON.stringify(body) });
}

export function resolveTs(arg: bigint, fallback: number) {
  return arg === 0n ? fallback : Number(arg);
}
