# ADR-003 — Product, Offer and Campaign canonical model

- Status: Accepted for MVP
- Date: 2026-07-18
- Decision owners: Product, Architect

## Context

Covering multiple affiliate products/reward styles requires separating what is promoted, the commercial rule and the time/country-specific activation. A single Campaign table would duplicate product data and make terms/history ambiguous.

## Decision

Use `Partner -> Product -> Offer -> Campaign`. `RewardRule` belongs to Offer; Campaign selects country, dates, localization, budget/slots and lifecycle. Join creates immutable `ParticipationSnapshot` of terms/reward/commission. `Full` and `Ended` are derived eligibility, not lifecycle states.

## Consequences

- Supports reuse and future reward triggers without changing core campaign ownership.
- Adds joins and versioning, offset by explicit projections/indexes.
- P0 executes only `CONTENT_APPROVED + CONTENT_FLAT`; CPS/lead/install/subscription remain modeled/deferred behind capability validation.

## Alternative rejected

One polymorphic campaign blob: quick initially but weak constraints, poor analytics and unsafe historical terms.

