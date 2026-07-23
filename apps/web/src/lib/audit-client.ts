// Client trình duyệt cho nhật ký audit (N17, AD-02). Chỉ Global Admin đọc được. Bearer từ session.
import { API_BASE } from "./api-base";
import { loadSession } from "./auth-client";

export interface AuditEvent {
  id: string;
  actorName: string;
  action: string;
  countryCode: string | null;
  targetType: string | null;
  targetId: string | null;
  metadata: unknown;
  createdAt: string;
}

function authHeaders(): Record<string, string> {
  const s = loadSession();
  return s ? { authorization: `Bearer ${s.token}` } : {};
}

// market rỗng = toàn cục; "vn"/"ph" = lọc theo nước. forbidden = phiên không phải Global Admin.
export async function listAudit(market?: string): Promise<AuditEvent[] | { forbidden: true }> {
  const q = market ? `?market=${market.toLowerCase()}` : "";
  const res = await fetch(`${API_BASE}/admin/audit${q}`, { headers: authHeaders() });
  if (res.status === 401 || res.status === 403) return { forbidden: true };
  if (!res.ok) return [];
  return (await res.json()) as AuditEvent[];
}
