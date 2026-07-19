// Client trình duyệt cho content submit/review (N11). Bearer từ session đã lưu.
import { loadSession } from "./auth-client";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";

export interface Submission {
  id: string;
  attemptNo: number;
  url: string;
  state: "SUBMITTED" | "APPROVED" | "REJECTED";
  rejectReason: string | null;
  hashtagOk: boolean;
  platformOk: boolean;
  createdAt: string;
}
export interface MyContent {
  participationState: string;
  campaignTitle: string | null;
  requiredHashtag: string | null;
  platform: string | null;
  fixDeadlineAt: string | null;
  submissions: Submission[];
}
export interface ContentQueueItem {
  submissionId: string;
  creatorName: string;
  campaignTitle: string;
  url: string;
  attemptNo: number;
  hashtagOk: boolean;
  platformOk: boolean;
  submittedAt: string;
}

function authHeaders(json = false): Record<string, string> {
  const s = loadSession();
  return {
    ...(s ? { authorization: `Bearer ${s.token}` } : {}),
    ...(json ? { "content-type": "application/json" } : {}),
  };
}

export async function myContent(market: string, campaignId: string): Promise<MyContent | null> {
  const res = await fetch(`${API_BASE}/me/country/${market.toLowerCase()}/campaigns/${campaignId}/content`, {
    headers: authHeaders(),
  });
  if (!res.ok) return null;
  return (await res.json()) as MyContent;
}

export type SubmitResult = { ok: true; content: MyContent } | { ok: false; code: string; message: string };

export async function submitContent(market: string, campaignId: string, url: string, caption: string): Promise<SubmitResult> {
  const res = await fetch(`${API_BASE}/me/country/${market.toLowerCase()}/campaigns/${campaignId}/content`, {
    method: "POST",
    headers: authHeaders(true),
    body: JSON.stringify({ url, caption }),
  });
  if (res.ok) return { ok: true, content: (await res.json()) as MyContent };
  let code = "UNKNOWN";
  let message = "Không nộp được, thử lại sau.";
  try {
    const e = (await res.json())?.error;
    code = e?.code ?? code;
    message = e?.message ?? message;
  } catch {
    /* ignore */
  }
  return { ok: false, code, message };
}

export async function contentQueue(market: string): Promise<ContentQueueItem[] | { forbidden: true }> {
  const res = await fetch(`${API_BASE}/ops/${market.toLowerCase()}/content/queue`, { headers: authHeaders() });
  if (res.status === 401 || res.status === 403) return { forbidden: true };
  if (!res.ok) return [];
  return (await res.json()) as ContentQueueItem[];
}

export async function reviewContent(
  market: string,
  submissionId: string,
  decision: "APPROVE" | "REJECT",
  reason?: string,
): Promise<{ ok: boolean; code?: string }> {
  const res = await fetch(`${API_BASE}/ops/${market.toLowerCase()}/content/${submissionId}/review`, {
    method: "POST",
    headers: authHeaders(true),
    body: JSON.stringify({ decision, reason }),
  });
  if (res.ok) return { ok: true };
  try {
    return { ok: false, code: (await res.json())?.error?.code };
  } catch {
    return { ok: false };
  }
}
