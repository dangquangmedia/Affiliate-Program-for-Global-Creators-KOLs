import Link from "next/link";

export default function HomePage() {
  return (
    <main style={{ padding: 32, maxWidth: 640 }}>
      <h1>Affiliate GLOBAL — walking skeleton</h1>
      <p>
        Week 1 Day 5 vertical slice: pick a market below to load its country context
        from PostgreSQL through the API (DB → API → UI round-trip).
      </p>
      <ul>
        <li>
          <Link href="/vn" data-testid="link-vn">
            /vn — Vietnam
          </Link>
        </li>
        <li>
          <Link href="/ph" data-testid="link-ph">
            /ph — Philippines
          </Link>
        </li>
      </ul>
      <p style={{ marginTop: 24 }}>
        <Link href="/mockup" data-testid="link-mockup">
          → Prototype product (N2 — luồng Creator)
        </Link>
      </p>
    </main>
  );
}
