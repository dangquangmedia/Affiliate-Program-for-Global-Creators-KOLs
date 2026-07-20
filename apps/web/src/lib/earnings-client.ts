// Client trình duyệt cho dashboard thu nhập + sổ cái (N12). Bearer từ session đã lưu.
import { loadSession } from "./auth-client";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";

export interface Earning {
  id: string;
  campaignTitle: string | null;
  grossMinor: number;
  taxMinor: number;
  netMinor: number;
  currency: string;
  status: "PENDING" | "AVAILABLE" | "PAID" | "REVERSED";
  createdAt: string;
}
export interface EarningsSummary {
  currency: string | null;
  totalGrossMinor: number;
  totalTaxMinor: number;
  totalNetMinor: number;
  pendingNetMinor: number;
  availableNetMinor: number;
  paidNetMinor: number;
}
export interface LedgerEntry {
  id: string;
  entryType: string;
  amountMinor: number;
  currency: string;
  refType: string;
  refId: string;
  createdAt: string;
  balanceAfterMinor: number;
}
export interface LedgerView {
  entries: LedgerEntry[];
  balanceMinor: number;
  currency: string | null;
}
export interface EarningsDashboard {
  earnings: Earning[];
  summary: EarningsSummary;
  ledger: LedgerView;
}

function authHeaders(): Record<string, string> {
  const s = loadSession();
  return s ? { authorization: `Bearer ${s.token}` } : {};
}

export async function getEarnings(market: string): Promise<EarningsDashboard | { unauthorized: true }> {
  const res = await fetch(`${API_BASE}/me/country/${market.toLowerCase()}/earnings`, { headers: authHeaders() });
  if (res.status === 401) return { unauthorized: true };
  if (!res.ok) {
    return {
      earnings: [],
      summary: {
        currency: null,
        totalGrossMinor: 0,
        totalTaxMinor: 0,
        totalNetMinor: 0,
        pendingNetMinor: 0,
        availableNetMinor: 0,
        paidNetMinor: 0,
      },
      ledger: { entries: [], balanceMinor: 0, currency: null },
    };
  }
  return (await res.json()) as EarningsDashboard;
}
