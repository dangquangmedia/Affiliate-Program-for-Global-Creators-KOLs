# Affiliate GLOBAL Go API

Week 6 local runtime:

- Go API: `http://localhost:3001` (default)
- NestJS remains only as a differential oracle/fallback and is not required to run the backend.

The service loads the repository-root `.env` for local development. Injected environment variables
take precedence in containers and Cloud Run.

```powershell
go run ./cmd/migrate up
go run ./cmd/seed reference.sql # production-safe reference data
go run ./cmd/seed demo.sql      # staging/local synthetic demo data
go run ./cmd/api
go run ./cmd/reclaim            # one reclaim sweep, then exit (Cloud Run Job entrypoint)
go test ./...
go vet ./...
```

From the repository root:

```powershell
corepack pnpm run test:api:parity       # 105/105 HTTP cases against Go
corepack pnpm run test:api:differential # Nest ↔ Go normalized contract probes
corepack pnpm run test:api:race         # isolated Linux CGO race suite
corepack pnpm run test:web              # 25/25 Playwright against Go
```

Regenerate typed query code after editing `db/queries`:

```powershell
go run github.com/sqlc-dev/sqlc/cmd/sqlc@v1.31.1 generate
```

Implemented and parity-verified through Week 6 (**36/36 operations**):

- platform health/root and public market context;
- mock login, server-side bearer session resolution and logout;
- creator country profile select/list;
- creator KYC and country-scoped Ops queue/review;
- campaign discover/detail/similar/create;
- race-safe join, strict-FCFS waitlist, leave/promotion and deadline reclaim;
- content submit/reject/resubmit, race-safe review and country-scoped Ops queue;
- exactly-once earning, append-only accrual/tax ledger and creator earnings dashboard;
- reconciliation create/detail/lock with one-batch-per-earning and atomic `PENDING -> AVAILABLE`;
- creator wallet, cryptographic mock OTP and idempotent payout reservation under a profile row lock;
- payout settlement (`SUCCESS`/`FAIL`/`UNKNOWN`) and manual `UNKNOWN_HOLD` resolution;
- global-admin audit read/filter plus transaction-bound KYC/campaign audit writes.

Go acceptance coverage lives in `integration/week{2,3,4,5,6}_test.go`; it requires a migrated/seeded
PostgreSQL database.

Required environment: `DATABASE_URL`. Optional: `PORT`, `API_PORT`, `WEB_ORIGIN`,
`DB_MAX_CONNS`, `REQUEST_TIMEOUT`, `SHUTDOWN_TIMEOUT`, `MIGRATIONS_PATH`.

Week 6 gates are complete: 105/105 legacy acceptance cases and 25/25 Playwright cases run on Go,
the differential probe is green, KYC/content/reconciliation/payout concurrency is covered, and
`go test -race`, `go vet`, formatting plus `govulncheck` are green. Google Cloud staging remains Week 7.
