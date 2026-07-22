# CURRENT HTTP CONTRACT — NEST ORACLE FOR GO REWRITE

> Frozen on 2026-07-22 from the running Nest controllers, service DTOs, frontend clients and
> 105 DB-backed API tests. This document, `packages/contracts/openapi/current.yaml`, and the golden
> fixtures are the rewrite contract. `openapi/week2.yaml` is historical design material only.

## Global conventions

- Base URL has no `/api/v1` prefix.
- JSON uses camelCase. Money is a JSON integer in minor units; never float or formatted text.
- Authentication is `Authorization: Bearer <opaque-session-token>`.
- Every Nest `@Post` currently returns HTTP **201**, including logout, review, lock and settle.
- Date/time is UTC ISO-8601 with milliseconds, matching JavaScript `Date.toISOString()`.
- Missing/invalid session = 401. Authenticated but wrong role = 403. A resource outside the
  caller's country scope = 404. Invalid transition/idempotency conflict = 409.
- Error body is always:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message.",
    "status": 409,
    "correlationId": "uuid",
    "retryable": false
  }
}
```

- `retryable` is currently true only for HTTP 503.
- Lists keep the ordering implemented by each service; the Go port must not reorder them.

## Route matrix — 36/36

| # | Method/path | Auth | Request | Success | Main errors |
|---:|---|---|---|---|---|
| 1 | `GET /` | Public | — | 200 `RootInfo` | — |
| 2 | `GET /health` | Public | — | 200 `Health` | 503 `INTERNAL_ERROR` |
| 3 | `GET /markets/:market/context` | Public | path market | 200 `MarketContext` | 404 `RESOURCE_NOT_FOUND` |
| 4 | `POST /auth/mock-login` | Public | `MockLoginInput` | 201 `LoginResult` | 400 `VALIDATION_ERROR` |
| 5 | `GET /auth/me` | Bearer | — | 200 `AuthContext` | 401 `UNAUTHENTICATED` |
| 6 | `POST /auth/logout` | Bearer | — | 201 `{ok:true}` | 401 `UNAUTHENTICATED` |
| 7 | `GET /me/countries` | Bearer | — | 200 `MyCountryProfile[]` | 401 |
| 8 | `POST /me/country/:market` | Bearer | path market | 201 `MyCountryProfile` | 401, 404 |
| 9 | `GET /me/country/:market/kyc` | Bearer | path market | 200 `KycCase` | 401, 404 |
| 10 | `POST /me/country/:market/kyc` | Bearer | `KycSubmitInput` | 201 `KycCase` | 400, 401, 404, 409 |
| 11 | `GET /ops/:market/kyc/queue` | Bearer + Ops | path market | 200 `KycQueueItem[]` | 401, 403 |
| 12 | `POST /ops/:market/kyc/:caseId/review` | Bearer + Ops | `KycReviewInput` | 201 `KycCase` | 400, 401, 403, 404, 409 |
| 13 | `GET /markets/:market/campaigns` | Bearer | path market | 200 `CampaignSummary[]` | 401, 404 |
| 14 | `GET /markets/:market/campaigns/:id` | Bearer | path UUID | 200 `CampaignDetail` | 401, 404 |
| 15 | `GET /markets/:market/campaigns/:id/similar` | Bearer | path UUID | 200 `CampaignSummary[]` | 401, 404 |
| 16 | `POST /markets/:market/campaigns` | Bearer + Admin | `CampaignCreateInput` | 201 `CampaignDetail` | 400, 401, 403, 404 |
| 17 | `POST /markets/:market/campaigns/:id/join` | Bearer | path UUID | 201 `Participation` | 401, 404, 409 |
| 18 | `POST /markets/:market/campaigns/:id/leave` | Bearer | path UUID | 201 `Participation` | 401, 404, 409 |
| 19 | `GET /me/country/:market/participations` | Bearer | path market | 200 `Participation[]` | 401, 404 |
| 20 | `GET /me/country/:market/campaigns/:campaignId/content` | Bearer | path UUID | 200 `MyContent` | 401, 404 |
| 21 | `POST /me/country/:market/campaigns/:campaignId/content` | Bearer | `ContentSubmitInput` | 201 `MyContent` | 400, 401, 404, 409 |
| 22 | `GET /ops/:market/content/queue` | Bearer + Ops | path market | 200 `ContentQueueItem[]` | 401, 403 |
| 23 | `POST /ops/:market/content/:submissionId/review` | Bearer + Ops | `ContentReviewInput` | 201 `Submission` | 400, 401, 403, 404, 409 |
| 24 | `GET /me/country/:market/earnings` | Bearer | path market | 200 `EarningsDashboard` | 401, 404 |
| 25 | `GET /ops/:market/reconciliation` | Bearer + Finance | path market | 200 `ReconBatch[]` | 401, 403 |
| 26 | `POST /ops/:market/reconciliation` | Bearer + Finance | `{period?:string}` | 201 `ReconBatch` | 401, 403, 409 |
| 27 | `GET /ops/:market/reconciliation/:batchId` | Bearer + Finance | path UUID | 200 `ReconBatch` with lines | 401, 403, 404 |
| 28 | `POST /ops/:market/reconciliation/:batchId/lock` | Bearer + Finance | path UUID | 201 `ReconBatch` | 401, 403, 404, 409 |
| 29 | `GET /me/country/:market/wallet` | Bearer | path market | 200 `Wallet` | 401, 404 |
| 30 | `POST /me/country/:market/payouts/otp` | Bearer | path market | 201 `Otp` | 401, 404, 409 |
| 31 | `POST /me/country/:market/payouts` | Bearer | `PayoutCreateInput` | 201 `Payout` | 400, 401, 404, 409 |
| 32 | `GET /ops/:market/payouts` | Bearer + Finance | path market | 200 `PayoutQueueItem[]` | 401, 403 |
| 33 | `GET /ops/:market/payouts/holds` | Bearer + Finance | path market | 200 `PayoutQueueItem[]` | 401, 403 |
| 34 | `POST /ops/:market/payouts/:id/settle` | Bearer + Finance | `{result:SUCCESS\|FAIL\|UNKNOWN}` | 201 `Payout` | 400, 401, 403, 404, 409 |
| 35 | `POST /ops/:market/payouts/:id/resolve` | Bearer + Finance | `{result:SUCCESS\|FAIL}` | 201 `Payout` | 400, 401, 403, 404, 409 |
| 36 | `GET /admin/audit?market=` | Bearer + Global Admin | optional market | 200 `AuditEvent[]` | 401, 403, 404 |

## Response-shape notes that are easy to break in Go

- `Participation.campaignTitle` is optional; the other nullable participation fields are present
  as JSON `null`.
- `ReconBatch.lines` is optional and is populated on detail/create paths as implemented; list
  responses may omit it.
- `Campaign.full` and `slotsLeft` are derived, not database fields.
- `RewardRule.budgetCapMinor` is derived from cap slots and flat amount.
- `Earning.netMinor` and all dashboard totals are derived from integer minor units.
- Ledger entries are newest-first, but `balanceAfterMinor` represents the chronological running
  balance after that entry.
- `Otp.code` is deliberately returned only because the current provider is explicitly a mock.
- Audit list is newest-first and limited to 200 events.

## Freeze rule

Until Go reaches parity, new features and schema changes are not added to either implementation.
Any intentional contract correction requires: update this matrix, update OpenAPI, add/change a
golden fixture, and make the Nest and Go acceptance test agree before merging.

