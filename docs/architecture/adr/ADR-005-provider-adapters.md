# ADR-005 — Provider adapters, mock disclosure and recovery

- Status: Accepted for MVP
- Date: 2026-07-18
- Decision owners: Architect, Security, QA

## Context

OAuth, OTP, storage and payout credentials may be unavailable during development. Provider calls can timeout after accepting a request, so naive retries may duplicate identity/session/money effects.

## Decision

Define domain-owned provider ports with `real`, `mock` and `disabled` adapters. Mock selection is environment-controlled and disclosed in UI/API/evidence. Persist provider request/event IDs and classify results as success, terminal validation/failure, retryable transport failure or Unknown. Payout Unknown holds reserve and permits status reconciliation only; retry creates a new attempt after terminal resolution.

## Consequences

- Deterministic tests do not depend on credentials; real adapters remain replaceable.
- Mock evidence cannot be presented as real integration evidence.
- Each adapter must pass the same contract suite and redact raw payloads/secrets.

## Alternatives rejected

- Inline SDK calls in controllers: couples domain and loses test/recovery contract.
- Retry every timeout: unsafe for payout.
- Fixed OTP with no expiry/attempt audit: not acceptable even for disclosed mock.

