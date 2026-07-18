# Affiliate GLOBAL

Multi-country affiliate marketing platform (VN + PH) — local MVP. Week 1 status: **walking
skeleton** (`Web → API → PostgreSQL`), not business features. See `Plan/00_PROJECT_EXECUTION_LOG.md`
and `docs/product/G5_WEEK1_GATE.md` for what is and isn't done.

## Prerequisites

- Node.js `24.11.1` (see `.nvmrc`)
- pnpm `10.15.1` via Corepack: `corepack enable && corepack prepare pnpm@10.15.1 --activate`
- Docker Desktop (for local PostgreSQL only — the API and Web apps run natively, not in containers)

## First-time setup

```powershell
git clone <repo-url>
cd affiliate-global
corepack pnpm install

Copy-Item .env.example .env
# Edit .env: set AFFILIATE_DB_PASSWORD to a local random value, and update
# DATABASE_URL to use the same password.

docker compose up -d postgres
docker compose ps                          # wait for "healthy"

corepack pnpm db:generate
corepack pnpm db:migrate:deploy            # applies all migrations to an empty database
corepack pnpm db:seed                      # deterministic VN/PH seed; safe to re-run
```

## Run the walking skeleton

Two terminals. The API auto-loads `.env` from the repo root on startup, so you do **not**
need to source it into the shell first for `dev:api`/`dev:web`/`test` (only the `db:*`
Prisma CLI commands above still need it manually — see Troubleshooting):

```powershell
# Terminal 1 — API (NestJS), http://localhost:3001
corepack pnpm dev:api

# Terminal 2 — Web (Next.js), http://localhost:3000
corepack pnpm dev:web
```

Then open a browser:

- `http://localhost:3000/` — landing page, links to `/vn` and `/ph`
- `http://localhost:3000/vn` — Vietnam context (VN / VND / vi-VN) loaded from PostgreSQL through the API
- `http://localhost:3000/ph` — Philippines context (PH / PHP / fil-PH) loaded from PostgreSQL through the API
- `http://localhost:3000/xx` — unknown market renders a controlled 404, not a fake market
- `http://localhost:3001/health` — `{"status":"ok","db":"up"}` when PostgreSQL is reachable

## Verify

```powershell
corepack pnpm check      # docs/architecture/DB-scaffold/runtime-skeleton evidence gates
corepack pnpm lint       # eslint (flat config, apps/api + apps/web)
corepack pnpm typecheck  # tsc --noEmit for apps/api and apps/web
corepack pnpm test       # apps/api: node:test DB-backed smoke tests
                          # apps/web: Playwright Chromium E2E (auto-starts API + Web)
corepack pnpm build      # tsc build (api) + next build (web)

# or all of the above in one shot:
corepack pnpm verify
```

`pnpm test` (API and Web) requires PostgreSQL to be up and seeded (see setup above); the API
auto-loads `.env` so no manual shell export is needed.

## Clean restart (fresh database)

```powershell
docker compose down -v      # deletes the local Postgres volume — local/synthetic data only
docker compose up -d postgres
corepack pnpm db:migrate:deploy
corepack pnpm db:seed
```

## Project layout

```text
apps/web      Next.js App Router — Creator/Ops/Finance/Admin shells (only the market
              context route is implemented as of Week 1 Day 5)
apps/api      NestJS modular monolith — REST + OpenAPI (only /health and
              /markets/:market/context are implemented as of Week 1 Day 5)
apps/worker   background execution, not yet started
packages/contracts   OpenAPI contracts (docs/design artifacts)
packages/ui          shared UI components, not yet started
docs/         product, architecture and QA design contracts (source of truth for scope)
Plan/         week-by-week execution plan, decision log and execution history
```

## Troubleshooting

- **`P1000: Authentication failed`** on `db:migrate:deploy`/`db:seed`: the Postgres
  container's data volume was created with a different password than the one in your
  current `.env`. Either recover the original password, or reset the local volume with
  `docker compose down -v` (local data is synthetic-only per project policy — see
  `docs/engineering/INFRA_ENVIRONMENT.md`).
- **Port already in use**: change `AFFILIATE_DB_PORT` (Postgres), or free port `3000`/`3001`
  before starting Web/API.
- **`DATABASE_URL` not resolved when running a `db:*` script** (`db:generate`,
  `db:migrate:*`, `db:seed`): these invoke the `prisma` CLI directly, which does not
  auto-load the repo-root `.env`. Load it into the shell first (PowerShell:
  `Get-Content .env | ForEach-Object { if ($_ -match '^(\w+)=(.*)$') { [Environment]::SetEnvironmentVariable($matches[1], $matches[2]) } }`).
  `dev:api`/`dev:web`/`pnpm test` do not need this — the API loads `.env` itself on startup.
