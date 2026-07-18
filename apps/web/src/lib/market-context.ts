export interface MarketContext {
  market: string;
  countryName: string;
  locale: string;
  fallbackLocale: string;
  currency: string;
  currencyExponent: number;
  configVersion: number;
  enabled: boolean;
}

// Phân biệt 3 kết cục để trang hiển thị đúng thay vì crash:
// - ok: có dữ liệu country từ API/DB
// - not-found: market không tồn tại (API trả 404) -> notFound()
// - api-unreachable: fetch chết (chưa chạy `pnpm dev:api` / Postgres) -> báo thân thiện
export type MarketFetchResult =
  | { status: "ok"; context: MarketContext }
  | { status: "not-found" }
  | { status: "api-unreachable" };

const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:3001";

export async function fetchMarketContext(market: string): Promise<MarketFetchResult> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/markets/${market}/context`, { cache: "no-store" });
  } catch {
    // Network error: API không chạy hoặc không tới được.
    return { status: "api-unreachable" };
  }

  if (res.status === 404) return { status: "not-found" };
  if (!res.ok) return { status: "api-unreachable" };

  return { status: "ok", context: (await res.json()) as MarketContext };
}
