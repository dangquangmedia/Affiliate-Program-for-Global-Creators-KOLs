import { notFound } from "next/navigation";
import Link from "next/link";
import { fetchMarketContext } from "../../lib/market-context";

export default async function MarketPage({
  params,
}: {
  params: Promise<{ market: string }>;
}) {
  const { market } = await params;
  const context = await fetchMarketContext(market);

  if (!context) {
    notFound();
  }

  return (
    <main style={{ padding: 32, maxWidth: 640 }} data-testid="market-context">
      <p>
        <Link href="/">&larr; back</Link>
      </p>
      <h1>
        {context.countryName} / {context.currency}
      </h1>
      <dl>
        <dt>Market</dt>
        <dd data-testid="market-code">{context.market}</dd>
        <dt>Locale</dt>
        <dd data-testid="market-locale">{context.locale}</dd>
        <dt>Fallback locale</dt>
        <dd>{context.fallbackLocale}</dd>
        <dt>Currency</dt>
        <dd data-testid="market-currency">{context.currency}</dd>
        <dt>Currency exponent</dt>
        <dd>{context.currencyExponent}</dd>
        <dt>Config version</dt>
        <dd>{context.configVersion}</dd>
        <dt>Enabled</dt>
        <dd data-testid="market-enabled">{String(context.enabled)}</dd>
      </dl>
    </main>
  );
}
