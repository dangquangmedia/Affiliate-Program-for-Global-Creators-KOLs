# Test strategy v1 — architecture to release evidence

> Gate G4 baseline. Tests must prove negative/isolation/idempotency behavior, not only happy paths.

## Test pyramid and ownership

| Layer | Scope | Primary evidence |
|---|---|---|
| Static/contract | schema validation, OpenAPI, enum/error/money DTO, module dependency | check scripts, generated/parsed contract |
| Unit/domain | state guards, eligibility, tax/rounding, payout result classification | deterministic table-driven tests |
| Database invariant | unique keys, composite country FK, RLS, ledger balance, locked immutability | migration from empty + SQL/integration tests |
| API integration | auth/context/RBAC, idempotency, state/version errors, audit | HTTP against PostgreSQL |
| UI/component | context marker, CTA guard, money/status/error rendering | component/accessibility tests |
| E2E | S01–S04 across shared surfaces | browser + API/DB/audit evidence |

## Week 2 minimum

- `/health`; `/vn` and `/ph` market context same code path.
- Session/local adapter disclosure, expired session, unauthorized role/market.
- Profile create/list/switch idempotency and VN/PH data independence.
- KYC Draft/Submit/NeedsChanges/partial Resubmit/Approve.
- Direct cross-country ID, list/count/cursor/body tampering.
- Audit redaction and rejected-action evidence.

## Invariant suites carried forward

1. Duplicate join/content approve/batch lock/provider callback produces one business/money effect.
2. Terms/tax/FX snapshots remain unchanged after source config changes.
3. Locked batch/approved version/Paid attempt cannot be edited.
4. Confirmed payout failure releases once; Unknown holds; refund appends reversal.
5. Ledger transaction group balances per currency and UI total equals projection.
6. Runtime connection pool alternating VN/PH never leaks rows/counts.

## Evidence rules

- Each RTM Must points to test type, scenario and evidence artifact; `DESIGN_READY` is never runtime `DONE`.
- Mock provider runs are labeled `MOCK`; real-provider claims require credential-backed evidence or signed waiver.
- Failure output/logs redact OTP, token, cookie, bank/tax/document ID and signed URL.
- A flaky, skipped or manually assumed result is not Green; exception needs owner/deadline.

