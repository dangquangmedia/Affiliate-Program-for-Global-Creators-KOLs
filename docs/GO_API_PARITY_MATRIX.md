# GO API PARITY MATRIX — TUẦN 6

> Nguồn chuẩn: 105 case từng chạy bằng Nest trong `apps/api/test/*.test.ts`. Tuần 6 giữ nguyên tên
> và business assertion, thay phần dựng `NestFactory`/`PrismaService` bằng Go API external process
> và SQL trực tiếp. Lệnh: `corepack pnpm run test:api:parity`.

| Nhóm acceptance gốc | Case | Go runtime/evidence chính |
|---|---:|---|
| `market-context.smoke.test.ts` | 4 | health + VN/PH context + error envelope |
| `auth.smoke.test.ts` | 5 | login/me/logout/session invalid |
| `country-profile.smoke.test.ts` | 5 | profile idempotency + isolation |
| `kyc.smoke.test.ts` | 9 | draft/submit/reject/resubmit/approve + RBAC |
| `campaign.smoke.test.ts` | 11 | discover/detail/create/reward + RBAC/isolation |
| `join.smoke.test.ts` | 10 | KYC gate, snapshot, race, waitlist, reclaim |
| `content.smoke.test.ts` | 12 | submit/review/resubmit/reclaim + exactly-once |
| `earnings.smoke.test.ts` | 6 | tax/net/ledger/running balance/isolation |
| `reconciliation.smoke.test.ts` | 7 | create/lock/idempotency/isolation |
| `payout.smoke.test.ts` | 15 | OTP/reserve/settle/hold/resolve/idempotency |
| `money-spine.test.ts` (VN + PH × success/fail) | 4 | full money-spine hai thị trường |
| `audit.test.ts` | 6 | append-only, filter, RBAC, rollback atomicity |
| `rbac.negative.test.ts` | 11 | 404 cross-country, 403 wrong-role, 409 transition |
| **Tổng** | **105** | **105/105 chạy qua HTTP trên Go** |

## Harness và differential

- `apps/api/test/go-api-harness.ts`: base URL Go external, SQL assertions không Prisma, gọi
  `cmd/reclaim` thay cho gọi Nest service nội bộ.
- `scripts/run-go-api-acceptance.mjs`: build Go binary tạm, chạy đúng 105 case, tự dọn process/file.
- `scripts/differential-nest-go.mjs`: khởi động Nest oracle và Go song song; chuẩn hóa
  UUID/token/timestamp rồi so status + JSON cho 13 probe nền tảng/stateful.
- Differential đã tìm và sửa hai drift: root endpoint catalog và tie-order campaign.

## Concurrency/hardening

| Race bắt buộc | Test Go |
|---|---|
| KYC review | `integration/week6_test.go` — một 201, một 409, đúng một audit |
| Content submit/review | `integration/week4_test.go` — một attempt/earning/ledger/audit |
| Reconciliation create | `integration/week5_test.go` — earning chỉ vào một batch |
| Payout hai OTP | `integration/week5_test.go` — không reserve vượt balance |

`corepack pnpm run test:api:race` build image Linux CGO, dựng PostgreSQL synthetic cô lập,
migrate/seed, chạy `go test -race ./...`, rồi xóa container/network/volume tạm.
