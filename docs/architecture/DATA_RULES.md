# Data invariants, constraints and migration order

> Companion to `ERD.md`; authoritative constraints for Prisma/PostgreSQL scaffold.

## 1. Exact money model

- Persist local money as signed `BIGINT amount_minor` + ISO-4217 `CHAR(3)`/validated string. VND uses zero minor digits; PHP uses two.
- Percentage/rate uses fixed decimal (`DECIMAL(20,10)`), never IEEE float. Calculated results are rounded once by snapshot rule before posting.
- `gross_minor >= 0`, `tax_minor >= 0`, `net_minor = gross_minor - tax_minor` for the core earning.
- Each ledger transaction group must sum debit and credit amounts to zero per currency before commit.
- USD is optional reference snapshot and never replaces local earning/payout currency.

## 2. Required uniqueness

| Constraint | Purpose |
|---|---|
| `identity_provider(provider, provider_subject_hash)` | one global identity binding |
| `creator_country_profile(user_id, country_id)` | one creator profile per country |
| `country_config(country_id, version)` | version history without overwrite |
| `campaign_localization(campaign_id, locale)` | one copy per locale |
| `participation(profile_id, campaign_id)` | idempotent join |
| `participation_snapshot(participation_id)` | snapshot exactly once |
| `submission_version(submission_id, version)` | append-only ordered history |
| `earning(source_type, source_id)` | one earning per approved deliverable source |
| `reconciliation_line(batch_id, earning_id)` | no duplicate line |
| `payout_request(intent_id)` | verified intent consumed once |
| `payout_attempt(request_id, sequence)` | retry is a new ordered attempt |
| `external_event(provider, external_event_id)` | provider callback dedupe |
| `idempotency_record(actor_user_id, scope, key)` | command replay safety |

## 3. Immutability and snapshots

- Database roles used by application have no delete/update path for finalized ledger entries, locked batches, approved review decisions and consumed provider events.
- Final financial/review/provider history is append-only: never overwrite an original terminal record to represent correction.
- `locked_at`, `paid_at` and terminal provider result can be set only once. A conflicting second result is escalated, not overwritten.
- Join snapshot stores offer version, reward trigger/calculation/value, commission/terms version and display copy hash.
- Earning snapshot stores tax rule/version, FX reference/rate/time, currency exponent and rounding mode.
- Reversal has `reverses_entry_id`/`adjusts_earning_id`; original row remains queryable.

## 4. Country isolation constraints

- Country-local primary/foreign relationships include matching `country_id` or are checked in the same transaction.
- Route/session middleware uses PostgreSQL `SET LOCAL`/transaction-local settings: `app.user_id`, `app.country_id`, `app.is_global_bypass`, `app.correlation_id`.
- RLS policy for local tables requires `country_id = current_setting('app.country_id')`; bypass requires a separate DB role/function path and an audit precondition.
- Missing context fails closed. Pooled connections use transaction-local settings and reset on transaction end.
- `country_id` in JSON/body is rejected for scoped commands; path country is intent, session authorization is source of truth.

## 5. Concurrency/idempotency

- Mutable aggregates carry integer `version`; update uses `WHERE id=? AND version=?`, then increments.
- Join capacity/budget check + participation + snapshot + asset happen in one serializable/locked transaction.
- Content approve inserts unique reward source and outbox/audit in one transaction; unique conflict returns existing result.
- Batch lock and payout reserve/release/pay use unique ledger effect keys.
- External callback is first persisted/deduped, then applied; ambiguous timeout never fabricates terminal failure.

## 6. Migration order

1. PostgreSQL extensions/helpers and enums.
2. Identity: user, identity provider, session.
3. Country/config/profile/role assignment.
4. Partner/product/offer/reward/campaign/localization.
5. KYC/review and participation/tracking/content.
6. Earning/snapshot/ledger.
7. Reconciliation and payout intent/request/attempt.
8. Audit/idempotency/external-event/outbox support.
9. Composite constraints, queue indexes and RLS policies after referenced tables exist.
10. Deterministic VN/PH seed; verify second run is idempotent.

Migrations are forward-only in shared environments. Destructive rollback requires explicit backup/restore plan; release evidence uses `prisma migrate deploy`, never `db push`.
