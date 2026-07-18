# Gate G5 — Walking skeleton and Week 1 release gate

> Review date: 2026-07-18
> Decision: **GO** — proceed to Week 2 (Ngày 6)

## What this gate proves

A real `Web → API → PostgreSQL` vertical slice runs end-to-end and is reproducible from
an empty database. This is **not** a business feature (no Auth, KYC, Campaign, Ledger or
Payout runtime) — see `Plan/KE_HOACH_CHI_TIET_TUAN_1.md` section 8 for what Week 1 is and
is not allowed to claim.

## Task completion

| Task | Result | Evidence |
|---|---|---|
| W1-D5-T01 monorepo Web/API/Compose | PASS | `apps/api` NestJS app, `apps/web` Next.js app, `compose.yaml` Postgres service |
| W1-D5-T02 migration/seed from empty DB | PASS | see "DB verification" below |
| W1-D5-T03 market-context round-trip | PASS | `GET /markets/{market}/context` (API) + `/{market}` (Web), see "Round-trip verification" |
| W1-D5-T04 verify command + smoke/test baseline | PASS | `pnpm verify`; API `node:test` DB-backed smoke; Web Playwright Chromium E2E |
| W1-D5-T05 README + clean restart | PASS | `README.md` |
| W1-D5-T06 integration buffer | Used to fix Prisma 7 driver-adapter constructor and NestJS DI-under-esbuild issues (see "Known issues resolved") | commits on `main` |
| W1-D5-T07 demo/gate/log update | PASS | this file + `Plan/00_PROJECT_EXECUTION_LOG.md` |

## DB verification

```text
docker compose up -d postgres            -> healthy
prisma migrate deploy (empty database)   -> 3/3 migrations applied, pass
prisma db seed (run 1)                   -> pass
prisma db seed (run 2)                   -> no duplicate: country=2, country_config=2 (VN/VND, PH/PHP)
```

The local Postgres volume from Day 3–4 was reset once during Day 5 (unrecoverable local
password from a prior session; confirmed with the project owner before running
`docker compose down -v` — local data is synthetic-only per `docs/engineering/INFRA_ENVIRONMENT.md`).

## Round-trip verification

```text
GET http://localhost:3001/health          -> 200 {"status":"ok","db":"up"}
GET http://localhost:3001/markets/vn/context -> 200 {market:"VN", currency:"VND", locale:"vi-VN", enabled:true, ...}
GET http://localhost:3001/markets/ph/context -> 200 {market:"PH", currency:"PHP", locale:"fil-PH", enabled:true, ...}
GET http://localhost:3001/markets/xx/context -> 404 {error:{code:"RESOURCE_NOT_FOUND", ...}}  (API_CONTRACT.md envelope)

http://localhost:3000/     -> renders links to /vn and /ph
http://localhost:3000/vn   -> renders "Vietnam / VND" sourced live from PostgreSQL through the API
http://localhost:3000/ph   -> renders "Philippines / PHP" sourced live from PostgreSQL through the API
http://localhost:3000/xx   -> controlled 404 (Next.js notFound()), no fake market rendered
```

Verified twice: once via `curl`, once via a real Chromium browser (Playwright).

## `pnpm verify` evidence (full run, 2026-07-18)

```text
check      -> workspace OK (17 files) / architecture OK (12 artifacts, 22/22 Must locked)
              / db scaffold OK (32 models, 3 migrations) / runtime skeleton OK (14 Day 5 artifacts)
lint       -> 0 errors, 0 warnings (apps/api + apps/web, shared eslint.config.mjs)
typecheck  -> apps/api tsc --noEmit: pass; apps/web tsc --noEmit: pass
test       -> apps/api: 4/4 node:test (DB-backed: /health, /markets/vn, /markets/ph, /markets/xx)
              apps/web: 4/4 Playwright Chromium E2E (home links, /vn, /ph, /xx 404)
build      -> apps/api: tsc build pass; apps/web: next build pass (4 routes generated)
```

## Known issues resolved during Day 5 (kept as notes for Week 2+)

1. **Prisma 7 client requires an explicit driver adapter.** The `prisma-client` generator
   (moduleFormat `esm`) no longer reads `DATABASE_URL` implicitly from `new PrismaClient()`;
   it needs `new PrismaClient({ adapter: new PrismaPg({ connectionString }) })`
   (`@prisma/adapter-pg` + `pg`). See `apps/api/src/prisma.service.ts`.
2. **The generated Prisma client ships as ESM `.ts` source**, not compiled `.js`. The API
   process must run under `tsx` (see `apps/api/package.json` `dev`/`start` scripts); a plain
   `node dist/main.js` after `tsc build` will not resolve the dynamic import. `pnpm build`
   exists to prove the app's own TypeScript compiles cleanly, not as the runtime entrypoint.
3. **NestJS constructor DI breaks under esbuild/tsx** because esbuild does not implement
   `emitDecoratorMetadata`, so `design:paramtypes` is never emitted and Nest cannot resolve
   providers by type. Fixed by adding explicit `@Inject(Token)` on every constructor
   parameter across the API (`health.controller.ts`, `markets.controller.ts`,
   `markets.service.ts`). Any new controller/service added in Week 2+ must follow the same
   pattern while the project runs on `tsx`.
4. **`.env` was not loaded automatically**, so `pnpm dev:api` run directly in a fresh shell
   (no manual `source .env` first) left `DATABASE_URL` undefined and `/health` returned `503`.
   Found by manual testing after G5 (real browser hit `ERR_CONNECTION_REFUSED` on the Web
   port because only the API terminal had been started, and the API itself was silently
   unhealthy). Fixed with `apps/api/src/load-env.ts`, imported first in both `main.ts` and
   the test suite, using Node's built-in `process.loadEnvFile()` — no new dependency. `db:*`
   Prisma CLI scripts still need `.env` sourced manually (see `README.md` Troubleshooting).
   Also added a friendly `GET /` (`app.controller.ts`) instead of a bare 404 at the API root.

## RTM impact

`CP-03` (route market resolution) moved from `DESIGN_READY` to `SKELETON_VERIFIED` in
`docs/product/RTM.md` — this is runtime evidence for the route→API→DB context resolution,
not a claim that Auth/Country management (`CP-01`, `CP-02`) or any other Must is done.
`scripts/check-architecture.mjs` now accepts `DESIGN_READY` or `SKELETON_VERIFIED` for the
22/22 Must count.

## Final G5 acceptance

- [x] Web, API and PostgreSQL start with a documented, reproducible setup (`README.md`).
- [x] `/health` returns `200` with DB connectivity proven, not mocked.
- [x] `/vn` and `/ph` resolve locale/currency/config from PostgreSQL through the same
      handler/schema (no hard-coded per-market branching in the UI).
- [x] Invalid market returns a controlled 404, not a fake market or a crash.
- [x] Migration from an empty database passes; seed is deterministic and idempotent on rerun.
- [x] Lint, type-check, DB-backed unit/smoke tests, a real-browser E2E smoke test, and build
      all pass via one `pnpm verify` command.
- [x] Evidence exists as files/command output, not only as chat/claims.

## Deferred / not claimed

- Auth/session, Country Profile CRUD, KYC, Campaign, Ledger, Payout: **not implemented**.
  Week 2 starts exactly where `Plan/KE_HOACH_CHI_TIET_TUAN_1.md` section 15 says to.
- API/Web are not containerized; only PostgreSQL runs in Docker (matches
  `docs/engineering/INFRA_ENVIRONMENT.md`, which never proposed Dockerizing them in Week 1).
- Only one browser (Chromium) is covered; Firefox/WebKit breadth is a Week 5 item per the
  plan's own risk register.
- `apps/worker`, `packages/ui`, `packages/contracts` beyond the existing OpenAPI file remain
  empty scaffolds — untouched by Day 5, as planned.

## Next exact action — Ngày 6

Per `Plan/KE_HOACH_CHI_TIET_TUAN_1.md` section 15: implement the Auth/session adapter and
local fallback per `API_CONTRACT.md`, then global `User` + `CreatorCountryProfile`, resolving
country context from route + session (never request body). Do not start Campaign, Content or
Money work before Auth/Country/KYC (G10) is Green.
