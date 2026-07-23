// Client trình duyệt cho ví + rút tiền (N14). Bearer từ session đã lưu.
import { API_BASE } from "./api-base";
import { loadSession } from "./auth-client";

export interface Payout {
  id: string;
  amountMinor: number;
  currency: string;
  state: "PROCESSING" | "PAID" | "FAILED_RELEASED" | "UNKNOWN_HOLD";
  requestedAt: string;
}
export interface Wallet {
  withdrawableMinor: number;
  minPayoutMinor: number;
  currency: string;
  payouts: Payout[];
}
export interface Otp {
  otpId: string;
  code: string;
  expiresAt: string;
}
export interface PayoutQueueItem extends Payout {
  creatorName: string;
}

function authHeaders(json = false): Record<string, string> {
  const s = loadSession();
  return {
    ...(s ? { authorization: `Bearer ${s.token}` } : {}),
    ...(json ? { "content-type": "application/json" } : {}),
  };
}

export async function getWallet(market: string): Promise<Wallet | { unauthorized: true }> {
  const res = await fetch(`${API_BASE}/me/country/${market.toLowerCase()}/wallet`, { headers: authHeaders() });
  if (res.status === 401) return { unauthorized: true };
  if (!res.ok) return { withdrawableMinor: 0, minPayoutMinor: 0, currency: market === "PH" ? "PHP" : "VND", payouts: [] };
  return (await res.json()) as Wallet;
}

export async function requestOtp(market: string): Promise<Otp | null> {
  const res = await fetch(`${API_BASE}/me/country/${market.toLowerCase()}/payouts/otp`, { method: "POST", headers: authHeaders() });
  if (!res.ok) return null;
  return (await res.json()) as Otp;
}

export type PayoutResult = { ok: true; payout: Payout } | { ok: false; code: string; message: string };

export async function createPayout(
  market: string,
  body: { amountMinor: number; otpId: string; code: string; idempotencyKey: string },
): Promise<PayoutResult> {
  const res = await fetch(`${API_BASE}/me/country/${market.toLowerCase()}/payouts`, {
    method: "POST",
    headers: authHeaders(true),
    body: JSON.stringify(body),
  });
  if (res.ok) return { ok: true, payout: (await res.json()) as Payout };
  let code = "UNKNOWN";
  let message = "Không tạo được lệnh rút.";
  try {
    const e = (await res.json())?.error;
    code = e?.code ?? code;
    message = e?.message ?? message;
  } catch {
    /* ignore */
  }
  return { ok: false, code, message };
}

export type SettleResult = "SUCCESS" | "FAIL" | "UNKNOWN";
export type ResolveResult = "SUCCESS" | "FAIL";

export async function payoutQueue(market: string): Promise<PayoutQueueItem[] | { forbidden: true }> {
  const res = await fetch(`${API_BASE}/ops/${market.toLowerCase()}/payouts`, { headers: authHeaders() });
  if (res.status === 401 || res.status === 403) return { forbidden: true };
  if (!res.ok) return [];
  return (await res.json()) as PayoutQueueItem[];
}

// Lệnh đang UNKNOWN_HOLD chờ đối soát tay (N15).
export async function payoutHolds(market: string): Promise<PayoutQueueItem[] | { forbidden: true }> {
  const res = await fetch(`${API_BASE}/ops/${market.toLowerCase()}/payouts/holds`, { headers: authHeaders() });
  if (res.status === 401 || res.status === 403) return { forbidden: true };
  if (!res.ok) return [];
  return (await res.json()) as PayoutQueueItem[];
}

async function postOutcome(market: string, id: string, path: string, result: string): Promise<{ ok: boolean; code?: string }> {
  const res = await fetch(`${API_BASE}/ops/${market.toLowerCase()}/payouts/${id}/${path}`, {
    method: "POST",
    headers: authHeaders(true),
    body: JSON.stringify({ result }),
  });
  if (res.ok) return { ok: true };
  try {
    return { ok: false, code: (await res.json())?.error?.code };
  } catch {
    return { ok: false };
  }
}

// Gọi provider mock lần đầu (PROCESSING): SUCCESS/FAIL/UNKNOWN.
export function settlePayout(market: string, id: string, result: SettleResult = "SUCCESS") {
  return postOutcome(market, id, "settle", result);
}

// Đối soát tay 1 lệnh UNKNOWN_HOLD: SUCCESS (đã chuyển) / FAIL (hoàn tiền).
export function resolveHold(market: string, id: string, result: ResolveResult) {
  return postOutcome(market, id, "resolve", result);
}
