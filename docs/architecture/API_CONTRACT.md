# API contract v1 — Week 2 implementation surface

> Gate G4 contract, 2026-07-18. Base path `/api/v1`; JSON UTF-8; timestamps UTC RFC 3339. Campaign/ledger/payout detailed commands are inventory-only until their implementation week.

## 1. Request context and authentication

- Market route: web `/vn/...` or `/ph/...`; API path always includes `/{market}` for country-local resources.
- API authenticates session/cookie or bearer adapter, resolves role assignments, and verifies `market` against authorized country.
- Request body/query must not contain authoritative `country_id`. If present on a scoped command, return `400 COUNTRY_BODY_FORBIDDEN`.
- Sensitive commands require `Idempotency-Key` (UUID/ULID opaque string) and `X-Correlation-Id`; server may generate correlation ID when absent.
- Finance/Global Admin commands require session `mfa_level=STEP_UP` and unexpired verification.

## 2. Representation conventions

### IDs, time and enums

- IDs are opaque strings (UUID v7 target); clients never parse ordering/tenant from ID.
- Time is `2026-07-18T03:15:30.123Z`; date-only uses ISO `YYYY-MM-DD`.
- Enums use stable uppercase snake case: `SUBMITTED`, `NEEDS_CHANGES`, `APPROVED`. Unknown enum from newer server must be rendered as safe fallback, not coerced.
- Mutable aggregate responses include integer `version`; commands send `If-Match: "<version>"` or `expectedVersion` where specified.

### Money

```json
{
  "amountMinor": "450000",
  "currency": "VND",
  "formatted": "450.000 ₫",
  "referenceUsd": {
    "amount": "17.6500",
    "rate": "0.0000392222",
    "capturedAt": "2026-07-18T03:15:30.123Z",
    "disclaimer": "REFERENCE_ONLY"
  }
}
```

`amountMinor` is a decimal string to avoid JavaScript integer loss. Reference rate is fixed decimal string; local money remains authoritative.

### Cursor pagination

```json
{
  "items": [],
  "page": { "nextCursor": null, "hasMore": false, "limit": 25 }
}
```

- Default 25, maximum 100. Cursor is opaque and bound to market/filter/sort; mismatched reuse returns `400 INVALID_CURSOR`.
- Stable queue sort: `createdAt ASC, id ASC`; timeline sort: `createdAt DESC, id DESC`.

## 3. Error envelope

```json
{
  "error": {
    "code": "KYC_FIELD_LOCKED",
    "message": "Only fields requiring changes can be edited.",
    "status": 409,
    "correlationId": "01J2...",
    "details": [{ "field": "bankAccount", "reason": "FIELD_ALREADY_ACCEPTED" }],
    "retryable": false
  }
}
```

| HTTP | Use | Example code |
|---:|---|---|
| 400 | malformed/forbidden country body/cursor | `COUNTRY_BODY_FORBIDDEN` |
| 401 | missing/expired authentication | `SESSION_EXPIRED` |
| 403 | authenticated but role/MFA/country bypass absent | `ACTION_FORBIDDEN`, `MFA_REQUIRED` |
| 404 | resource absent or foreign-country concealed | `RESOURCE_NOT_FOUND` |
| 409 | version/state/idempotency conflict | `STALE_VERSION`, `INVALID_TRANSITION`, `IDEMPOTENCY_CONFLICT` |
| 422 | valid shape but business guard fails | `KYC_INCOMPLETE`, `CAMPAIGN_NOT_JOINABLE` |
| 429 | rate/OTP attempt limit | `RATE_LIMITED`, `OTP_ATTEMPTS_EXCEEDED` |
| 503 | provider unavailable before terminal result | `PROVIDER_UNAVAILABLE` |

Validation never returns raw provider payload, stack trace, secret, OTP or private identifier.

## 4. Week 2 endpoint contract

### Auth/session and market

| Method/path | Auth | Purpose | Response/critical errors |
|---|---|---|---|
| `GET /health` | public | liveness/readiness summary without secrets | `200 {status, db}` / `503` |
| `POST /auth/oauth/start` | public | create provider state/PKCE attempt | `{authorizationUrl, expiresAt, mockDisclosed}` |
| `GET /auth/oauth/callback` | provider | consume state/code once and create session | redirect/session; replay `409` |
| `POST /auth/local/session` | dev-only adapter | deterministic disclosed local session | disabled outside local/test |
| `GET /session` | session | current user, MFA and role summaries | `401 SESSION_EXPIRED` |
| `DELETE /session` | session | revoke current session | `204`; idempotent |
| `GET /markets/{market}/context` | public/session optional | active country config projection | locale/currency/enabled/configVersion |

Market context response:

```json
{
  "market": "VN",
  "countryName": "Vietnam",
  "locale": "vi-VN",
  "fallbackLocale": "en",
  "currency": "VND",
  "currencyExponent": 0,
  "configVersion": 1,
  "enabled": true
}
```

### Country profiles

| Method/path | Idempotency | Purpose | Guard |
|---|---:|---|---|
| `GET /profiles` | no | list own country profile summaries | owner only; no staff data |
| `POST /{market}/profiles` | required | create profile in authorized market | unique user+country; replay same result |
| `GET /{market}/profiles/me` | no | active own profile | foreign market unauthorized -> 404/403 policy |
| `PATCH /{market}/profiles/me/preferences` | required | locale/display preference | supported locale; version match |
| `POST /{market}/profiles/me/select` | required | select/switch active profile | session authorized; no data copy |

Create profile body excludes country:

```json
{ "displayName": "Minh Anh", "preferredLocale": "vi-VN" }
```

### Creator KYC

| Method/path | Idempotency | Purpose | Guard/state |
|---|---:|---|---|
| `GET /{market}/kyc/checklist` | no | active country/version checklist | country config active |
| `POST /{market}/kyc/cases` | required | create/retrieve own Draft case | one active case policy |
| `GET /{market}/kyc/cases/current` | no | state, editable fields, redacted history | owner only |
| `PATCH /{market}/kyc/cases/{caseId}/fields/{fieldKey}` | required | save new field version/reference | Draft or exact NeedsChanges field |
| `POST /{market}/uploads/intents` | required | private upload metadata/signed operation | allowed MIME/size/purpose; short expiry |
| `POST /{market}/kyc/cases/{caseId}/submit` | required | Draft/NeedsChanges -> Submitted/Resubmitted | required current fields; `If-Match` |

KYC status never returns raw document URL. Field projection includes `fieldKey`, `state`, `reasonCode`, localized `reasonMessage`, `editable`, `version`.

### Ops KYC review

| Method/path | Idempotency | Purpose | Guard/state |
|---|---:|---|---|
| `GET /{market}/ops/kyc/cases?state=&cursor=` | no | scoped queue | Local Ops same country; stable cursor |
| `GET /{market}/ops/kyc/cases/{caseId}` | no | redacted detail/current versions | foreign ID concealed as 404 |
| `POST /{market}/ops/kyc/cases/{caseId}/claim` | required | claim current case | Submitted/Resubmitted; version |
| `POST /{market}/ops/kyc/cases/{caseId}/request-changes` | required | field-level decisions + reasons | InReview; at least one field |
| `POST /{market}/ops/kyc/cases/{caseId}/approve` | required | approve all resolved fields | InReview; no unresolved field |
| `POST /{market}/ops/kyc/cases/{caseId}/reject` | required | terminal policy rejection | InReview; policy code/reason |

Request-changes example:

```json
{
  "expectedVersion": 4,
  "decisions": [
    { "fieldKey": "bank_account", "fieldVersion": 2, "decision": "NEEDS_CHANGES", "reasonCode": "NAME_MISMATCH" }
  ]
}
```

### Audit projection

| Method/path | Auth | Purpose |
|---|---|---|
| `GET /{market}/admin/audit?aggregateType=&actorId=&cursor=` | scoped audit permission | redacted critical-event timeline |
| `GET /{market}/admin/audit/{eventId}` | scoped audit permission | single redacted event; raw secret/PII never exposed |

Every sensitive command writes audit attempt/outcome in the same transaction when possible. Provider completion links correlation/external-event IDs.

## 5. Later endpoint inventory — boundary only

| Module | Endpoint families | Implementation gate |
|---|---|---|
| Catalog/campaign | `/admin/products`, `/admin/offers`, `/admin/campaigns`, `/campaigns` | Week 3 |
| Participation/content | `/campaigns/{id}/join`, `/participations`, `/submissions`, `/ops/content` | Week 3 |
| Earnings/reconciliation | `/earnings`, `/finance/reconciliation-batches` | Week 4 |
| Payout/provider | `/payout-intents`, `/payout-requests`, `/finance/payouts`, `/provider-events` | Week 4 |

These use the same error, country, money, audit, version and idempotency conventions; detailed fields freeze before their implementation gate.

## 6. Idempotency response contract

- First valid request: `201/200`, header `Idempotency-Replayed: false`.
- Same actor/scope/key + same canonical request hash: return stored status/body reference, `Idempotency-Replayed: true`.
- Same key + different payload/path: `409 IDEMPOTENCY_CONFLICT`.
- Keys are scoped by authenticated actor and command family; client cannot inspect another actor's key.
- Provider events dedupe separately by `provider + externalEventId`.

## 7. Contract-test minimum

1. VN and PH market response from the same handler/schema.
2. Body country tampering rejected.
3. Expired session -> 401; wrong role -> 403; foreign direct ID -> concealed 404.
4. Invalid field -> 400; business guard -> 422; stale state/version -> 409.
5. Idempotent create/submit/approve replay produces same ID and no second effect.
6. Pagination cursor cannot cross market/filter.
7. Decimal strings, UTC timestamps and unknown enum fallback round-trip without loss.

