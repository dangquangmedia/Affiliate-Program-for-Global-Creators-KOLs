// Client trình duyệt cho campaign (N9). Bearer từ session đã lưu.
import { API_BASE } from "./api-base";
import { loadSession } from "./auth-client";

export interface CampaignSummary {
  id: string;
  title: string;
  brand: string;
  platform: string;
  requiredHashtag: string;
  currency: string;
  rewardMinor: number;
  status: "ACTIVE" | "PAUSED" | "ENDED";
  slotsTotal: number;
  slotsTaken: number;
  slotsLeft: number;
  full: boolean;
}
export interface RewardRule {
  triggerType: string;
  pricingType: string;
  capType: string;
  flatAmountMinor: number | null;
  capSlots: number | null;
  budgetCapMinor: number | null;
}
export interface CampaignDetail extends CampaignSummary {
  brief: string;
  reward: RewardRule | null;
}
export interface CreateCampaignInput {
  title: string;
  brand: string;
  platform: string;
  requiredHashtag: string;
  brief: string;
  rewardMinor: number;
  slotsTotal: number;
}

function authHeaders(json = false): Record<string, string> {
  const s = loadSession();
  return {
    ...(s ? { authorization: `Bearer ${s.token}` } : {}),
    ...(json ? { "content-type": "application/json" } : {}),
  };
}

export async function listCampaigns(market: string): Promise<CampaignSummary[] | { unauthorized: true }> {
  const res = await fetch(`${API_BASE}/markets/${market.toLowerCase()}/campaigns`, { headers: authHeaders() });
  if (res.status === 401) return { unauthorized: true };
  if (!res.ok) return [];
  return (await res.json()) as CampaignSummary[];
}

export async function getCampaign(market: string, id: string): Promise<CampaignDetail | null> {
  const res = await fetch(`${API_BASE}/markets/${market.toLowerCase()}/campaigns/${id}`, { headers: authHeaders() });
  if (!res.ok) return null;
  return (await res.json()) as CampaignDetail;
}

export interface Participation {
  campaignId: string;
  campaignTitle?: string;
  state: string;
  snapshotRewardMinor: number | null;
  currency: string | null;
  submitDeadlineAt: string | null;
  waitlistedAt: string | null;
  waitlistPosition: number | null;
  joinedAt: string | null;
  strikeCount: number;
}

export type JoinResult =
  | { ok: true; participation: Participation }
  | { ok: false; code: string; status: number };

export async function joinCampaign(market: string, id: string): Promise<JoinResult> {
  const res = await fetch(`${API_BASE}/markets/${market.toLowerCase()}/campaigns/${id}/join`, {
    method: "POST",
    headers: authHeaders(),
  });
  if (res.ok) return { ok: true, participation: (await res.json()) as Participation };
  let code = "UNKNOWN";
  try {
    code = (await res.json())?.error?.code ?? "UNKNOWN";
  } catch {
    /* ignore */
  }
  return { ok: false, code, status: res.status };
}

export async function leaveCampaign(market: string, id: string): Promise<void> {
  await fetch(`${API_BASE}/markets/${market.toLowerCase()}/campaigns/${id}/leave`, {
    method: "POST",
    headers: authHeaders(),
  });
}

export async function suggestSimilar(market: string, id: string): Promise<CampaignSummary[]> {
  const res = await fetch(`${API_BASE}/markets/${market.toLowerCase()}/campaigns/${id}/similar`, {
    headers: authHeaders(),
  });
  if (!res.ok) return [];
  return (await res.json()) as CampaignSummary[];
}

export async function myParticipations(market: string): Promise<Participation[]> {
  const res = await fetch(`${API_BASE}/me/country/${market.toLowerCase()}/participations`, { headers: authHeaders() });
  if (!res.ok) return [];
  return (await res.json()) as Participation[];
}

export async function createCampaign(
  market: string,
  input: CreateCampaignInput,
): Promise<{ ok: true; campaign: CampaignDetail } | { ok: false; status: number }> {
  const res = await fetch(`${API_BASE}/markets/${market.toLowerCase()}/campaigns`, {
    method: "POST",
    headers: authHeaders(true),
    body: JSON.stringify(input),
  });
  if (!res.ok) return { ok: false, status: res.status };
  return { ok: true, campaign: (await res.json()) as CampaignDetail };
}
