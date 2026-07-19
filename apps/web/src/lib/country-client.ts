// Client trình duyệt gọi API country-context (N7). Mọi request gắn Bearer từ session đã lưu.
import { loadSession } from "./auth-client";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";

export interface CountryContext {
  market: string;
  countryName: string;
  currency: string;
  currencyExponent: number;
  locale: string;
  fallbackLocale: string;
}
export interface MyCountryProfile {
  profileId: string;
  onboardingState: string;
  context: CountryContext;
}

function authHeaders(): Record<string, string> {
  const s = loadSession();
  return s ? { authorization: `Bearer ${s.token}` } : {};
}

/** Danh sách nước creator đã có hồ sơ (của chính phiên). [] nếu chưa đăng nhập/chưa có. */
export async function listMyCountries(): Promise<MyCountryProfile[]> {
  const res = await fetch(`${API_BASE}/me/countries`, { headers: authHeaders() });
  if (!res.ok) return [];
  return (await res.json()) as MyCountryProfile[];
}

/** Chọn 1 nước -> tạo/lấy hồ sơ nước đó (idempotent phía server). */
export async function selectCountry(market: string): Promise<MyCountryProfile> {
  const res = await fetch(`${API_BASE}/me/country/${market.toLowerCase()}`, {
    method: "POST",
    headers: authHeaders(),
  });
  if (!res.ok) {
    throw new Error(`select country failed: ${res.status}`);
  }
  return (await res.json()) as MyCountryProfile;
}
