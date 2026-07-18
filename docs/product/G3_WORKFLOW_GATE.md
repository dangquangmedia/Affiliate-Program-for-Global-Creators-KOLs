# Gate G3 — Workflow, state and permission review

> Review date: 2026-07-18  
> Result: **GREEN / PASS**  
> Prototype mode: clickable HTML fallback theo DEC-14

## Task completion

| Task | Result | Evidence |
|---|---|---|
| W1-D3-T01 Admin/Finance IA | PASS | `ADMIN_FINANCE_IA.md`; V09–V12 navigation, Creator handoff và role/country contract |
| W1-D3-T02 4 core views + variants | PASS | `creator-prototype.html` v0.4; V09 shell, V10 review, V11 builder, V12 finance |
| W1-D3-T03 7 state machines | PASS | `STATE_MACHINES.md`; actor, command/event, guard, effect, audit, idempotency và invalid action |
| W1-D3-T04 Permission matrix | PASS | `PERMISSION_MATRIX.md`; role × action × country × state; deny-by-default; API recheck |
| W1-D3-T05 Provider failure matrix | PASS | `PROVIDER_FAILURE_MATRIX.md`; success/validation/timeout/duplicate/retry/release/reversal |
| W1-D3-T06 Clickable S03/S04 | PASS | Shared Creator/Ops/Finance frames; no separate dead-end scenario screen |
| W1-D3-T07 PostgreSQL/environment | PASS | `compose.yaml`, `.env.example`, `INFRA_ENVIRONMENT.md`; container healthy + `pg_isready` accepting connections |
| W1-D3-T08 G3/RTM/log | PASS | Checklist này; CP-01/02 + 7 Admin Must `DESIGN_READY`; execution log chuyển Ngày 4 |

## G3 acceptance checklist

- [x] Approve, reject, batch lock, payout và cross-country action có actor, country, reason/outcome và audit contract.
- [x] Cả transition hợp lệ và invalid action đều có expected error/recovery.
- [x] Provider timeout/Unknown chỉ cho reconcile; không tự retry hoặc release.
- [x] Confirmed pre-payment failure release reserve đúng một lần; duplicate callback là no-op.
- [x] Post-success refund tạo linked reversal; không overwrite `Paid` hoặc attempt cũ.
- [x] Locked batch không có Edit/Unlock; correction dùng linked adjustment.
- [x] Join tạo immutable terms/reward/commission snapshot một lần.
- [x] S01–S04 đều clickable qua 12 shared views.
- [x] Local actor khác country bị conceal/deny; Global bypass cần explicit permission + MFA + reason + audit.
- [x] Không có Prisma schema, migration hoặc business logic trước G4.

## Automated/runtime evidence

- `node scripts/check-workspace.mjs`: 15 required files, 12 views, S01–S04, 7 state machines, no business schema.
- `corepack pnpm -r check` và `corepack pnpm check`: workspace checks pass.
- `docker compose config --quiet`: environment/Compose contract hợp lệ khi password local được cấp.
- `docker ps`: `affiliate-global-postgres-1` = `healthy`.
- `docker exec ... pg_isready`: `/var/run/postgresql:5432 - accepting connections`.
- Prototype snapshot v0.4: `docs/product/mockup/creator-prototype-v04.png`; visual review không thấy overlap/clipping nghiêm trọng ở viewport chính.
- Execution log vẫn local-excluded; secret scan chỉ được phép trúng placeholder/documented variable names.

## Interruption note

Lần triển khai trước bị dừng trong lúc Docker Desktop khởi động/pull image và lệnh health-check chờ quá lâu. Product artifacts đã được ghi an toàn, nhưng G3/log chưa được tạo nên Ngày 3 chưa từng được tính hoàn tất. Ngày 2026-07-18 đã chạy lại kiểm tra, xác nhận PostgreSQL healthy và hoàn tất các artifact còn thiếu.

## Handoff Ngày 4

- Bắt đầu `W1-D4-T01`: ERD v1 từ 7 state machine và screen/data contract đã khóa.
- Giữ hard cap 12 core views; không đổi state/permission/money invariant nếu không thêm decision supersede.
- Chỉ khởi tạo Prisma schema/migration sau G4 design review theo đúng kế hoạch.

