# ADR-002 — Global identity, country profiles and isolation

- Status: Accepted for MVP
- Date: 2026-07-18
- Decision owners: Security Architect, Product

## Context

A creator may operate in VN and PH with one identity, but KYC, bank, tax, campaigns and balances must not cross country. Route/body values are attacker-controlled, and pooled DB connections can leak context if scope is session-global.

## Decision

Keep `User` global and create one `CreatorCountryProfile` per user/country. Resolve country from URL intent plus session role assignment. Reject authoritative country in body. Carry `AuthorizedContext` into transaction-local PostgreSQL settings and enforce country both in repository predicates and RLS. Global bypass is a separate permission requiring MFA, reason and audit.

## Consequences

- Positive: one login without shared compliance/money data; defense in depth against missing application filters.
- Negative: composite constraints/RLS and connection-pool testing add complexity.
- Mitigation: scoped repository API, `SET LOCAL`, negative isolation suite and separate migration/runtime DB roles.

## Alternatives rejected

- Country on global User: rejects multi-country independence.
- Trust `country_id` request body: insecure.
- Application filtering only: insufficient defense for sensitive/money rows.

