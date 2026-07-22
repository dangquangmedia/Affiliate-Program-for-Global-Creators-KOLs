# BÁO CÁO HOÀN TẤT TUẦN 6 — GO BACKEND REWRITE

> Dự án: Affiliate GLOBAL
> Ngày kiểm chứng: 22/07/2026
> Kế hoạch đối chiếu: `Plan/GO_BACKEND_REWRITE_PLAN.md`
> Kết luận: **PASS — hoàn tất toàn bộ phạm vi và 4/4 gate Tuần 6**

## 1. Phạm vi đã triển khai

Tuần 6 không thêm operation mới (Go API đã đủ 36/36 từ Tuần 5); trọng tâm là **parity đầy đủ +
hardening**: port toàn bộ 105 test case cũ sang chạy thật với Go, differential Nest↔Go, chạy 25
Playwright E2E với Go làm backend, bổ sung concurrency test còn thiếu, và dọn sạch phụ thuộc
Prisma/Nest khỏi runtime chính.

**Xác minh độc lập số route** (đếm trực tiếp trong code, không dựa vào tài liệu): 23 route đăng ký
ở `internal/httpapi/week2.go` + 11 route ở `internal/httpapi/week5.go` + 2 route nền tảng (`GET /`,
`GET /health`) ở `internal/httpapi/router.go` = **36/36**, khớp đúng bảng inventory ở kế hoạch mục 2.

## 2. Parity harness — 105 case cũ chạy thật trên Go

- `apps/api/test/go-api-harness.ts` (mới): thay `NestFactory`/`PrismaService` bằng `fetch` HTTP
  thô tới Go API tại `GO_API_BASE_URL` (mặc định `http://127.0.0.1:3001`), SQL assertion qua `pg`
  (không Prisma), và `runReclaim()` gọi `go run ./cmd/reclaim` thay vì gọi service nội bộ.
- 12 file `apps/api/test/*.test.ts` được port để import harness mới, **giữ nguyên tên test và
  business assertion** — đúng yêu cầu "ma trận 105 cũ → 105 mới" của kế hoạch.
- `docs/GO_API_PARITY_MATRIX.md`: ánh xạ đầy đủ 105 case theo 13 nhóm gốc sang bằng chứng Go.
- `scripts/run-go-api-acceptance.mjs`: build Go binary tạm, chạy đúng 105 case, tự dọn
  process/file sau khi xong.

## 3. Differential Nest ↔ Go

- `scripts/differential-nest-go.mjs`: khởi động Nest (oracle) và Go song song, chuẩn hoá
  UUID/token/timestamp/correlationId rồi so status + JSON cho 13 probe nền tảng/stateful.
- Quá trình này đã **tìm và sửa 2 lỗi drift thật** trước khi đạt xanh: catalog endpoint ở route
  gốc `/` và thứ tự tie-break khi campaign cùng thời điểm tạo. Đây là bằng chứng differential không
  chỉ chạy cho có mà thực sự bắt được sai khác hành vi.

## 4. Concurrency/hardening bắt buộc của Tuần 6

| Race bắt buộc | Vị trí test | Kết quả |
|---|---|---|
| KYC review (2 Ops cùng duyệt 1 case) | `integration/week6_test.go` (mới) | 1×201 + 1×409, đúng 1 audit `KYC_REVIEWED` |
| Content submit/review (double approve) | `integration/week4_test.go` | 1 attempt/earning/ledger/audit |
| Reconciliation create (2 Finance cùng lúc) | `integration/week5_test.go` | earning chỉ vào đúng 1 batch |
| Payout 2 OTP khác nhau cùng rút | `integration/week5_test.go` | không reserve vượt balance |

Cả 4 điểm race bắt buộc của kế hoạch (payout, KYC review, content submit, recon create) đều có
test tái hiện trước khi coi là đạt — đúng nguyên tắc "không âm thầm đổi semantics mà không có test".

## 5. Dọn phụ thuộc Prisma/Nest khỏi runtime chính

Root `package.json` đã trỏ toàn bộ script vận hành sang Go, không còn gọi Prisma CLI hay Nest ở
đường chạy chính:

| Script | Trước (Nest/Prisma) | Sau (Tuần 6) |
|---|---|---|
| `db:migrate:deploy` | `prisma migrate deploy` | `go -C apps/api-go run ./cmd/migrate up` |
| `db:seed` | `prisma db seed` | `go -C apps/api-go run ./cmd/seed …` |
| `dev:api` | `nest start --watch` | `go -C apps/api-go run ./cmd/api` |
| `build` | `nest build` | `go -C apps/api-go build ./…` |
| `lint` | `eslint apps/api/src …` | `go -C apps/api-go vet ./…` (+ eslint web) |
| `typecheck` | `tsc -p apps/api` | `go -C apps/api-go test ./... -run=^$` (+ tsc web) |

`scripts/setup.mjs` (bootstrap) không còn nhắc tới Prisma/NestJS. `apps/api` (NestJS) **vẫn được
giữ nguyên trong repo** — không xoá — vì kế hoạch mục 5 yêu cầu giữ Nest làm oracle cho differential
test và fallback rollback cho tới khi ổn định; nó không còn nằm trên đường chạy `dev`/`build`/`db:*`.

## 6. Bằng chứng kiểm thử (chạy thật trong phiên này, không trích dẫn báo cáo cũ)

| Kiểm tra | Lệnh | Kết quả |
|---|---|---|
| `go build ./...` | — | PASS (exit 0) |
| `go vet ./...` | `corepack pnpm run lint` (phần Go) | PASS |
| `gofmt -l .` | — | sạch, không file nào cần format lại |
| `govulncheck ./...` | `go run golang.org/x/vuln/cmd/govulncheck@latest` | **No vulnerabilities found** |
| `go test ./... -count=1` | `corepack pnpm run test:api` | PASS (integration, config, content, httpapi) |
| **105/105 legacy case trên Go** | `corepack pnpm run test:api:parity` | **105 pass / 0 fail** |
| **Differential Nest ↔ Go** | `corepack pnpm run test:api:differential` | **13/13 normalized probes passed** |
| **25/25 Playwright E2E trên Go** | `corepack pnpm run test:web` | **25 passed** (bao gồm 7 spec `/portal`) |
| `go test -race ./...` (Linux CGO cô lập) | `corepack pnpm run test:api:race` | PASS, container exit 0, không data race |
| **Toàn bộ `pnpm verify`** | `corepack pnpm run verify` | PASS trọn chuỗi: lint → typecheck → test (4 tầng) → build (Go binary + Next.js production, 25/25 static page) |

Race suite dùng `apps/api-go/Dockerfile.race` (`CGO_ENABLED=1`, `go test -race ./... -count=1`) qua
`compose.race.yaml` với PostgreSQL cô lập riêng (`affiliate_race`), migrate/seed/test/dọn tự động —
không đụng DB dev.

### Rà soát code, không chỉ chạy test

- `grep TODO|FIXME|"not implemented"|panic("` trên toàn bộ mã nguồn Go (loại trừ `*_test.go`):
  **không có kết quả** — không còn stub/việc dang dở ẩn trong code.
- Toàn bộ 12 file test Nest cũ đã chuyển sang gọi Go qua HTTP thật (`fetch`), xác nhận bằng đọc
  trực tiếp `go-api-harness.ts` và `auth.smoke.test.ts` — không còn `NestFactory`/`PrismaService`
  nào trong đường parity.

## 7. Gate cuối Tuần 6

- [x] 36/36 endpoint parity (đếm trực tiếp trong router, không suy từ tài liệu).
- [x] 105/105 API case và 25/25 E2E xanh trên Go.
- [x] Frontend client không cần đổi contract (Playwright E2E chạy nguyên bản, chỉ đổi backend đích).
- [x] Không còn Node/Prisma dependency để chạy backend (`dev:api`/`build`/`db:*`/`lint`/`typecheck`
  đều Go; `setup.mjs` không nhắc Prisma/Nest).

## 8. Ranh giới bàn giao

Go API đạt parity đầy đủ + hardening cục bộ (race/vet/gofmt/govulncheck sạch), differential đã bắt
và sửa 2 drift thật, 4 điểm concurrency bắt buộc đều có test race tái hiện. **Chưa triển khai Google
Cloud** (Tuần 7 — Cloud Run/Cloud SQL/Secret Manager/migration+reclaim job/Scheduler) và **chưa soak/
rollback rehearsal** (Tuần 8). Đây là ranh giới đúng theo kế hoạch: Tuần 6 đóng ở "parity đầy đủ +
hardening cục bộ", không bao gồm hạ tầng cloud thật.
