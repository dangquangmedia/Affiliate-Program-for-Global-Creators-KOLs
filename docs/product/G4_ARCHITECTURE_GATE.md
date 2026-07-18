# Gate G4 — Architecture review

> Review date: 2026-07-18  
> Phase A design review: **PASS — AUTHORIZED W1-D4-T07**  
> Final gate: **GREEN / PASS**

## Design review before schema

| Check | Result | Evidence |
|---|---|---|
| Product, Offer, Campaign separated | PASS | `ERD.md`, ADR-003 |
| Global identity/profile separated | PASS | `ERD.md`, ADR-002 |
| Country route/session/API/DB contract unified | PASS | `COUNTRY_ISOLATION.md`, API contract |
| Exact money/snapshot/idempotency/audit/immutability | PASS | `DATA_RULES.md`, ADR-004 |
| Week 2 API implementable without field guessing | PASS | `API_CONTRACT.md`, OpenAPI skeleton |
| Modular monolith/provider boundaries | PASS | `ARCHITECTURE.md`, ADR-001/005 |
| 22 Must traced to design/test | PASS | `RTM.md` v0.3, `TEST_STRATEGY.md` |
| State/permission conflicts requiring ERD rewrite | NONE | G3 state/permission compared with ERD/coverage |

Automated evidence: `node scripts/check-architecture.mjs` -> 12 architecture artifacts, 22/22 Must DESIGN_READY, Week 2 contract present.

## Authorization decision

W1-D4-T01..T06 were accepted before schema creation. W1-D4-T07 then created and verified Prisma schema, migration and deterministic seed framework; final Gate G4 is Green.

## Task completion

| Task | Result | Evidence |
|---|---|---|
| W1-D4-T01 ERD v1 | PASS | `docs/architecture/ERD.md`; ownership/cardinality/domain map |
| W1-D4-T02 data rules | PASS | `DATA_RULES.md`; exact money, unique keys, snapshots, immutability, migration order |
| W1-D4-T03 API contract | PASS | `API_CONTRACT.md` + `packages/contracts/openapi/week2.yaml` |
| W1-D4-T04 country/RLS | PASS | `COUNTRY_ISOLATION.md`; route/session/API/DB chain + ISO-01..10 |
| W1-D4-T05 architecture/ADR | PASS | modular monolith + five accepted ADRs + provider ports |
| W1-D4-T06 RTM v0.3 | PASS | 22/22 Must `DESIGN_READY` with G4 coverage |
| W1-D4-T07 DB skeleton | PASS | Prisma 7.8 schema/client, 3 migrations, deterministic SQL seed |
| W1-D4-T08 gate review | PASS | checklist/evidence/exceptions in this file; no blocking exception |

## DB scaffold verification

- `prisma validate`: schema valid.
- `prisma generate`: Prisma Client 7.8.0 generated successfully.
- Empty verification database: all 3 migrations applied in order.
- Seed executed twice: still exactly `countries=2`, `configs=2`, values `PH:PHP,VN:VND`.
- Runtime RLS negative: no `app.country_id` -> insert rejected by row-level policy.
- Runtime RLS positive: `SET LOCAL app.country_id=VN` -> one VN row visible/writable inside transaction; transaction rolled back.
- Append-only triggers protect ledger, audit and review-decision evidence.
- Temporary verification database `affiliate_g4_verify_20260718` was dropped after evidence; project database retained.

## Final G4 acceptance

- [x] Product, Offer and Campaign are separate entities.
- [x] Global User and per-country CreatorProfile are separate.
- [x] URL -> session -> API -> transaction -> RLS country contract is consistent.
- [x] Exact money, snapshots, idempotency, audit, immutability and linked reversal are represented.
- [x] Week 2 API has implementable field/error/pagination/idempotency conventions.
- [x] ADRs state decisions, trade-offs, deferred items and revisit triggers.
- [x] No state/permission ambiguity forces a large ERD rewrite.

## Deferred decisions with owner/deadline

| Deferred item | Why not blocker now | Owner | Deadline |
|---|---|---|---|
| Production Global bypass DB function/grants | local scaffold only; contract already fail-closed | Security Architect | before staging |
| Full Campaign/Ledger/Payout request schemas | implementation is Week 3–4; domain/entity boundary frozen | API/Domain owner | before respective build gate |
| Redis/MinIO runtime | no measured queue need; upload slice not started | Platform | when Week 2 upload/worker requires |
| Partner external authorization | MVP staff internal; partner ownership modeled | Architect | before partner portal/API |
