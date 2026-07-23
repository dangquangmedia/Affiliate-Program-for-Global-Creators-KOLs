// Client trình duyệt cho KYC (N8). Bearer từ session đã lưu.
import { API_BASE } from "./api-base";
import { loadSession } from "./auth-client";

export type FieldState = "EMPTY" | "FILLED" | "ACCEPTED" | "NEEDS_CHANGES";
export type CaseState = "DRAFT" | "SUBMITTED" | "RESUBMITTED" | "APPROVED" | "REJECTED";

export interface KycField {
  key: string;
  label: string;
  value: string | null;
  state: FieldState;
  reason: string | null;
}
export interface KycCase {
  caseId: string;
  state: CaseState;
  fields: KycField[];
}
export interface KycQueueItem {
  caseId: string;
  creatorName: string;
  state: CaseState;
  pendingFields: number;
  fields: KycField[];
}
export interface FieldDecision {
  key: string;
  decision: "ACCEPT" | "NEEDS_CHANGES";
  reason?: string;
}

function authHeaders(json = false): Record<string, string> {
  const s = loadSession();
  return {
    ...(s ? { authorization: `Bearer ${s.token}` } : {}),
    ...(json ? { "content-type": "application/json" } : {}),
  };
}

// ---- Creator ----
export async function getMyKyc(market: string): Promise<KycCase | null> {
  const res = await fetch(`${API_BASE}/me/country/${market.toLowerCase()}/kyc`, { headers: authHeaders() });
  if (!res.ok) return null;
  return (await res.json()) as KycCase;
}

export async function submitKyc(market: string, values: Record<string, string>): Promise<KycCase> {
  const res = await fetch(`${API_BASE}/me/country/${market.toLowerCase()}/kyc`, {
    method: "POST",
    headers: authHeaders(true),
    body: JSON.stringify({ values }),
  });
  if (!res.ok) throw new Error(`submit KYC failed: ${res.status}`);
  return (await res.json()) as KycCase;
}

// ---- Ops ----
export async function getKycQueue(market: string): Promise<KycQueueItem[] | { forbidden: true }> {
  const res = await fetch(`${API_BASE}/ops/${market.toLowerCase()}/kyc/queue`, { headers: authHeaders() });
  if (res.status === 403) return { forbidden: true };
  if (!res.ok) return [];
  return (await res.json()) as KycQueueItem[];
}

export async function reviewKyc(market: string, caseId: string, decisions: FieldDecision[]): Promise<KycCase> {
  const res = await fetch(`${API_BASE}/ops/${market.toLowerCase()}/kyc/${caseId}/review`, {
    method: "POST",
    headers: authHeaders(true),
    body: JSON.stringify({ decisions }),
  });
  if (!res.ok) throw new Error(`review KYC failed: ${res.status}`);
  return (await res.json()) as KycCase;
}
