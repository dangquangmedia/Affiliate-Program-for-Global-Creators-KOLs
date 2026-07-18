# Country isolation and RLS contract

> Security architecture for Gate G4. This document resolves DEC-07 and DEC-16 from browser route through database transaction.

## 1. Trust chain

```text
Browser route /vn or /ph
  -> Web passes market code in API path (intent only)
  -> API validates code against active Country
  -> Session resolves User + RoleAssignment + MFA
  -> Authorization derives AuthorizedContext
  -> scoped transaction SET LOCAL app.user_id/app.country_id/bypass/correlation_id
  -> repository query + PostgreSQL RLS both filter country
  -> response DTO strips internal country/bypass/PII fields
  -> critical allow/deny outcome recorded in AuditEvent
```

The route is not authority. Body/header `country_id` cannot grant or alter scope.

## 2. AuthorizedContext

```ts
type AuthorizedContext = {
  userId: string;
  market: "VN" | "PH";
  countryId: string;
  roles: Array<"CREATOR" | "LOCAL_OPS" | "LOCAL_FINANCE" | "LOCAL_ADMIN" | "GLOBAL_ADMIN">;
  permissions: string[];
  mfaLevel: "BASE" | "STEP_UP";
  bypass: { allowed: boolean; reason?: string; sourceCountryId?: string };
  correlationId: string;
};
```

- Local role must have a `RoleAssignment` for resolved country.
- Creator ownership additionally checks `creator_profile.user_id = context.userId`.
- Global Admin has no automatic bypass. `country:bypass` + step-up MFA + non-empty reason are all required.

## 3. HTTP denial policy

| Situation | Response | Leakage policy |
|---|---|---|
| Unknown/disabled market route | `404 MARKET_NOT_FOUND` | no synthetic/default market |
| Valid market, role not assigned | `403 COUNTRY_ACCESS_DENIED` | country itself is public, role failure can be explicit |
| Direct resource ID belongs to another country | `404 RESOURCE_NOT_FOUND` | conceal existence, row/count/state |
| Body/query tries authoritative country | `400 COUNTRY_BODY_FORBIDDEN` | record tamper attempt |
| Global Admin missing bypass/reason/MFA | `403 COUNTRY_BYPASS_REQUIRED` | no target rows/counts |
| Database context missing | `500/503 CONTEXT_NOT_ESTABLISHED` | transaction rolls back, alert; never run unscoped |

## 4. PostgreSQL transaction contract

Pseudo-flow:

```sql
BEGIN;
SELECT set_config('app.user_id', :user_id, true);
SELECT set_config('app.country_id', :country_id, true);
SELECT set_config('app.is_global_bypass', :bypass, true);
SELECT set_config('app.correlation_id', :correlation_id, true);
-- repository operations
COMMIT;
```

- Third argument `true` means transaction-local; connection pool reuse cannot carry scope after commit/rollback.
- Application repository APIs for local entities require `AuthorizedContext`; no generic unscoped `findMany` is exposed.
- Migration/maintenance role is separate from runtime role. Scaffold creates `affiliate_runtime NOLOGIN`; deployment grants it to a secret-managed login. Runtime does not own tables and cannot disable RLS.

Illustrative policy:

```sql
ALTER TABLE kyc_case ENABLE ROW LEVEL SECURITY;
ALTER TABLE kyc_case FORCE ROW LEVEL SECURITY;

CREATE POLICY kyc_case_country_policy ON kyc_case
USING (
  country_id = nullif(current_setting('app.country_id', true), '')::uuid
  OR (
    current_setting('app.is_global_bypass', true) = 'true'
    AND nullif(current_setting('app.user_id', true), '') IS NOT NULL
  )
)
WITH CHECK (country_id = nullif(current_setting('app.country_id', true), '')::uuid);
```

Production bypass should be a reviewed security-definer function or separate controlled role so a raw setting alone is not sufficient; audit precondition is checked before entering it.

## 5. Composite country integrity

- Local tables have `country_id NOT NULL` and indexes beginning with country.
- High-risk FK paths use composite uniqueness `(id, country_id)` and composite FK `(parent_id, country_id)` where Prisma/native SQL permits.
- `Participation.profile.country_id = Campaign.country_id` is checked transactionally and protected by composite constraints in migration SQL.
- Reconciliation batch, earning and payout must share country and currency.
- Object storage references are private and associated with DB country; signed access is issued only after scoped DB authorization.

## 6. Negative-test plan

| ID | Test | Expected |
|---|---|---|
| ISO-01 | VN Ops list/count/export PH queue | zero disclosure; request denied/scoped, audit |
| ISO-02 | VN Ops direct PH KYC/content ID | concealed 404; no PII/count/state |
| ISO-03 | PH Creator sends body `country_id=VN` on PH route | 400; no mutation |
| ISO-04 | Session role VN uses `/ph` | 403; no DB row read |
| ISO-05 | pooled connection switches VN -> PH | no VN row in PH transaction |
| ISO-06 | query executes without `SET LOCAL` | RLS returns none/denies; alert/fail closed |
| ISO-07 | Global Admin without bypass permission/reason/MFA | 403 + denied audit |
| ISO-08 | authorized Global bypass | target-only result; actor/source/target/reason audit |
| ISO-09 | cursor generated in VN reused in PH | 400 invalid cursor |
| ISO-10 | signed upload reference reused cross-country | 404/403; no object content |

## 7. Deferred items and owner

- Exact production bypass function/grant design: Security Architect, before staging deployment.
- RLS policy rollout for every local table: Backend/Data owner, alongside each domain migration.
- Partner-scoped isolation in addition to country: Architect, before multi-partner external access; partner exists in model but MVP staff access remains internal.
