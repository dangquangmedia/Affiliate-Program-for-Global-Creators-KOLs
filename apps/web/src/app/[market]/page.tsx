import { notFound } from "next/navigation";
import Link from "next/link";
import { fetchMarketContext } from "../../lib/market-context";

export default async function MarketPage({
  params,
}: {
  params: Promise<{ market: string }>;
}) {
  const { market } = await params;
  const result = await fetchMarketContext(market);

  if (result.status === "not-found") {
    notFound();
  }

  if (result.status === "api-unreachable") {
    return (
      <main style={{ padding: 32, maxWidth: 640 }} data-testid="api-unreachable">
        <p>
          <Link href="/">&larr; back</Link>
        </p>
        <h1>API chưa sẵn sàng</h1>
        <p style={{ color: "#a9b6c4" }}>
          Trang này đọc dữ liệu quốc gia từ PostgreSQL qua API tại <code>localhost:3001</code> —
          có vẻ API chưa chạy. Mở một terminal khác và chạy:
        </p>
        <pre
          style={{
            background: "#0b1119",
            border: "1px solid #2b3644",
            borderRadius: 8,
            padding: "12px 14px",
            overflowX: "auto",
          }}
        >
          docker compose up -d postgres{"\n"}corepack pnpm dev:api
        </pre>
        <p style={{ color: "#8b96a3", fontSize: 14 }}>
          Xem hướng dẫn đầy đủ trong <code>README.md</code>. Còn bản prototype product tại{" "}
          <Link href="/mockup">/mockup</Link> dùng dữ liệu mock nên <b>không cần API</b>.
        </p>
      </main>
    );
  }

  const context = result.context;
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
