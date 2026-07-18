# ADR-001 — Modular monolith and app topology

- Status: Accepted for MVP
- Date: 2026-07-18
- Decision owners: Architect, Product

## Context

One full-stack developer must deliver a coherent five-week MVP across identity, KYC, affiliate, content and money. Four separate role UIs and microservices would multiply contracts/deployment/debugging before traffic or team boundaries justify them.

## Decision

Use one Next.js application with role-based shells, one NestJS modular-monolith API, one PostgreSQL database and an optional worker invoking the same application use cases. Module imports follow the boundaries in `ARCHITECTURE.md`; cross-module money/provider work uses explicit ports and transactional outbox.

## Consequences

- Positive: one contract/toolchain/deployment path; transactions can enforce exactly-once business effects; faster end-to-end debugging.
- Negative: discipline is needed to prevent repository/table coupling; a single API has wider blast radius.
- Mitigation: module dependency tests, scoped repositories, DTO contracts, outbox and ownership docs.

## Alternatives rejected/deferred

- Microservices/event broker: deferred until independent scaling/team/SLA evidence.
- Four separate frontend apps: rejected for MVP due duplicated auth/context/UI.

## Revisit trigger

Measured module-specific scaling, release ownership or availability requirement that cannot be solved within the modular deployable.

