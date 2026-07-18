import { access, readFile } from "node:fs/promises";

const required = [
  "docs/architecture/ERD.md",
  "docs/architecture/DATA_RULES.md",
  "docs/architecture/API_CONTRACT.md",
  "docs/architecture/COUNTRY_ISOLATION.md",
  "docs/architecture/ARCHITECTURE.md",
  "docs/architecture/adr/ADR-001-modular-monolith.md",
  "docs/architecture/adr/ADR-002-identity-country-isolation.md",
  "docs/architecture/adr/ADR-003-product-offer-campaign.md",
  "docs/architecture/adr/ADR-004-money-ledger-snapshots.md",
  "docs/architecture/adr/ADR-005-provider-adapters.md",
  "docs/qa/TEST_STRATEGY.md",
  "packages/contracts/openapi/week2.yaml",
];

await Promise.all(required.map((path) => access(path)));

const erd = await readFile("docs/architecture/ERD.md", "utf8");
for (const entity of [
  "User", "Country", "CreatorCountryProfile", "Product", "Offer", "Campaign",
  "ParticipationSnapshot", "Earning", "LedgerEntry", "ReconciliationBatch",
  "PayoutRequest", "PayoutAttempt", "AuditEvent", "IdempotencyRecord", "ExternalEvent",
]) {
  if (!erd.includes(entity)) throw new Error(`ERD missing ${entity}`);
}

const rules = await readFile("docs/architecture/DATA_RULES.md", "utf8");
for (const invariant of ["BIGINT amount_minor", "never overwrite", "SET LOCAL", "Migration order"]) {
  if (!rules.includes(invariant)) throw new Error(`Data rules missing: ${invariant}`);
}

const api = await readFile("docs/architecture/API_CONTRACT.md", "utf8");
for (const convention of ["COUNTRY_BODY_FORBIDDEN", "Idempotency-Key", "amountMinor", "UTC RFC 3339", "Cursor pagination"]) {
  if (!api.includes(convention)) throw new Error(`API contract missing: ${convention}`);
}

const country = await readFile("docs/architecture/COUNTRY_ISOLATION.md", "utf8");
for (const securityRule of ["transaction-local", "FORCE ROW LEVEL SECURITY", "ISO-10", "Global Admin has no automatic bypass"]) {
  if (!country.includes(securityRule)) throw new Error(`Country contract missing: ${securityRule}`);
}

const rtm = await readFile("docs/product/RTM.md", "utf8");
const mustLocked = [...rtm.matchAll(/^\| (CP|AD|CR)-\d{2} .*\| (DESIGN_READY|SKELETON_VERIFIED) \|$/gm)];
if (mustLocked.length !== 22) {
  throw new Error(`Expected 22 DESIGN_READY/SKELETON_VERIFIED Must rows, found ${mustLocked.length}`);
}

const openapi = await readFile("packages/contracts/openapi/week2.yaml", "utf8");
for (const path of ["/health:", "/markets/{market}/context:", "/{market}/profiles:", "/{market}/kyc/checklist:", "/{market}/ops/kyc/cases:"]) {
  if (!openapi.includes(path)) throw new Error(`OpenAPI missing ${path}`);
}

console.log(`architecture OK: ${required.length} artifacts, 22/22 Must DESIGN_READY, Week 2 API contract present`);

