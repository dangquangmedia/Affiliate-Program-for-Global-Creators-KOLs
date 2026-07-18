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

const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:3001";

export async function fetchMarketContext(market: string): Promise<MarketContext | null> {
  const res = await fetch(`${API_BASE_URL}/markets/${market}/context`, {
    cache: "no-store",
  });

  if (!res.ok) {
    return null;
  }

  return (await res.json()) as MarketContext;
}
