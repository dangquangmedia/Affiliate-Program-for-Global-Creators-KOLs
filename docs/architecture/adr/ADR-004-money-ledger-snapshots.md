# ADR-004 — Exact money, ledger, snapshots and immutability

- Status: Accepted for MVP
- Date: 2026-07-18
- Decision owners: Finance, Architect

## Context

Affiliate earnings need explainable Gross/Tax/Net, reconciliation, payout recovery and exactly-once effects. Float and mutable balances cannot reproduce or audit historical results.

## Decision

Store local money as `BIGINT amount_minor + currency`; fixed rates as decimal strings/`DECIMAL`. Persist terms/tax/FX/rounding snapshots. Financial effects append balanced `LedgerEntry` groups. Locked batches, paid entries and terminal attempts are immutable; corrections use linked adjustment/reversal. Provider/command effects have unique business keys.

## Consequences

- Positive: deterministic calculation, auditability, replay protection.
- Negative: more rows and reconciliation logic than a balance column.
- Mitigation: centralized Money module, invariant tests and query projections for UI.

## Alternatives rejected

- Floating point: rounding loss.
- Update a wallet balance directly: cannot explain source/reversal.
- Overwrite Paid on refund: destroys history.

