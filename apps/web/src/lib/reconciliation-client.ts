// Client trình duyệt cho đối soát Finance (N13). Bearer từ session đã lưu.
import { loadSession } from "./auth-client";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";

export interface ReconLine {
  id: string;
  earningId: string;
  creatorName: string;
  campaignTitle: string | null;
  netMinor: number;
  currency: string;
  anomaly: string | null;
}
export interface ReconBatch {
  id: string;
  period: string;
  status: "OPEN" | "LOCKED";
  lockedAt: string | null;
  lineCount: number;
  totalNetMinor: number;
  currency: string | null;
  lines?: ReconLine[];
}

function authHeaders(json = false): Record<string, string> {
  const s = loadSession();
  return {
    ...(s ? { authorization: `Bearer ${s.token}` } : {}),
    ...(json ? { "content-type": "application/json" } : {}),
  };
}

export async function listBatches(market: string): Promise<ReconBatch[] | { forbidden: true }> {
  const res = await fetch(`${API_BASE}/ops/${market.toLowerCase()}/reconciliation`, { headers: authHeaders() });
  if (res.status === 401 || res.status === 403) return { forbidden: true };
  if (!res.ok) return [];
  return (await res.json()) as ReconBatch[];
}

export async function getBatch(market: string, batchId: string): Promise<ReconBatch | null> {
  const res = await fetch(`${API_BASE}/ops/${market.toLowerCase()}/reconciliation/${batchId}`, { headers: authHeaders() });
  if (!res.ok) return null;
  return (await res.json()) as ReconBatch;
}

export type CreateResult = { ok: true; batch: ReconBatch } | { ok: false; code: string; message: string };

export async function createBatch(market: string, period?: string): Promise<CreateResult> {
  const res = await fetch(`${API_BASE}/ops/${market.toLowerCase()}/reconciliation`, {
    method: "POST",
    headers: authHeaders(true),
    body: JSON.stringify({ period }),
  });
  if (res.ok) return { ok: true, batch: (await res.json()) as ReconBatch };
  let code = "UNKNOWN";
  let message = "Không tạo được batch.";
  try {
    const e = (await res.json())?.error;
    code = e?.code ?? code;
    message = e?.message ?? message;
  } catch {
    /* ignore */
  }
  return { ok: false, code, message };
}

export async function lockBatch(market: string, batchId: string): Promise<{ ok: boolean; batch?: ReconBatch; code?: string }> {
  const res = await fetch(`${API_BASE}/ops/${market.toLowerCase()}/reconciliation/${batchId}/lock`, {
    method: "POST",
    headers: authHeaders(),
  });
  if (res.ok) return { ok: true, batch: (await res.json()) as ReconBatch };
  try {
    return { ok: false, code: (await res.json())?.error?.code };
  } catch {
    return { ok: false };
  }
}
