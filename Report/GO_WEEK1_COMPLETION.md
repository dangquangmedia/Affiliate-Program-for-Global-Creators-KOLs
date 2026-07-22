# BÁO CÁO HOÀN TẤT TUẦN 1 — GO BACKEND REWRITE

> Dự án: Affiliate GLOBAL  
> Ngày kiểm chứng: 22/07/2026  
> Kế hoạch đối chiếu: `Plan/GO_BACKEND_REWRITE_PLAN.md`  
> Kết luận: **PASS — hoàn tất toàn bộ phạm vi và gate Tuần 1**

## 1. Phạm vi đã hoàn tất

| Hạng mục Tuần 1 | Kết quả | Bằng chứng |
|---|---|---|
| Baseline Nest/Next | PASS | lint, typecheck, 105 API test và 25 Playwright test đều xanh |
| Contract matrix | PASS | đủ 36/36 method/path, auth, status, request/response và error |
| Golden contract | PASS | OpenAPI hiện trạng 36 operation và 8 fixture success/error tiêu biểu |
| Nền Go | PASS | module, config, chi router, CORS, JSON log, request/correlation ID, graceful shutdown |
| PostgreSQL | PASS | pgxpool, health query sinh bởi sqlc, transaction helper |
| Migration/seed | PASS | 3 migration forward-only, reference/demo seed idempotent, command migrate/seed riêng |
| Integration harness | PASS | httptest + PostgreSQL integration test chạy trong `go test ./...` |
| Local/container smoke | PASS | `/` và `/health` chạy với DB thật; image distroless chạy non-root |

## 2. Baseline được chốt

| Lệnh | Kết quả |
|---|---:|
| `corepack pnpm lint` | PASS |
| `corepack pnpm typecheck` | PASS |
| `corepack pnpm --filter @affiliate-global/api run test` | **105/105 PASS** |
| `corepack pnpm --filter @affiliate-global/web run test` | **25/25 PASS** |

Playwright ban đầu có 3 case lỗi do các money-flow test dùng chung PostgreSQL fixture nhưng chạy song
song. Cấu hình được chốt chạy tuần tự (`fullyParallel: false`, `workers: 1`) và tăng timeout assertion lên
15 giây để phản ánh đúng đặc tính integration test dùng DB. Sau sửa, 25/25 case xanh trong một lượt đầy đủ.

Lint ban đầu cũng phát hiện ba directive tắt `react-hooks/exhaustive-deps` đã lỗi thời. Chỉ ba directive
này được bỏ; logic frontend không bị thay đổi bởi công việc rewrite.

## 3. Contract hiện trạng

- `docs/API_CONTRACT_CURRENT.md`: ma trận đủ **36/36 endpoint**, được đo từ controller, frontend client
  và test hiện có; không suy đoán từ OpenAPI cũ.
- `packages/contracts/openapi/current.yaml`: OpenAPI 3.1 có **32 path object / 36 operation**.
- `packages/contracts/golden/`: tám JSON fixture gồm root, health, market, login và các error
  400/401/404/503.
- Chốt `POST` thành công theo hành vi Nest hiện tại là HTTP `201`.
- Chốt error envelope:
  `{ "error": { "code", "message", "status", "correlationId", "retryable" } }`.
- YAML đã parse thành công; toàn bộ internal `$ref` và tám JSON fixture hợp lệ.

## 4. Nền Go đã dựng

Workspace Go nằm tạm tại `apps/api-go` để giữ `apps/api` NestJS nguyên vẹn làm oracle trong thời gian
port. Việc thay thế tên thư mục chỉ diễn ra ở cutover sau khi đạt behavioral parity.

Các thành phần đã có:

- Ba entry point độc lập: `cmd/api`, `cmd/migrate`, `cmd/seed`.
- `chi` router; CORS theo cấu hình; request ID/correlation ID; access log JSON bằng `slog`.
- Config từ environment gồm `PORT`, `DATABASE_URL`, CORS origin và timeout shutdown.
- `pgxpool` với ping lúc khởi động; `/health` kiểm tra DB thật.
- Graceful shutdown khi nhận tín hiệu hệ điều hành.
- `sqlc` query/type sinh tự động và helper transaction dùng `pgx.Tx`.
- Error envelope chung và 404 JSON tương thích contract.
- Unit test config/router và integration test contract/schema/PostgreSQL.

Smoke binary local trên port 3002:

| Kiểm tra | Kết quả |
|---|---|
| `GET /health` | `status=ok`, `db=up` |
| `GET /` | `service=affiliate-global-api`, 11 nhóm endpoint |
| Route không tồn tại | HTTP 404, đúng error envelope |
| CORS | trả origin cấu hình `http://localhost:3000` |

## 5. Migration, schema và seed

- Ba migration Go được copy nguyên byte từ ba migration Prisma; SHA-256 từng cặp trùng khớp.
- Migration chạy từ database rỗng đến `version=3 dirty=false`.
- Schema sau migration có đúng **20 application table / 15 PostgreSQL enum**.
- Demo seed chạy hai lần vẫn idempotent; kết quả mẫu: 2 country, 7 user, 5 campaign.
- Có `reference.sql` production-safe chỉ chứa dữ liệu tham chiếu VN/PH và cấu hình thị trường.
- Migration không chạy ngầm khi API startup; đây là command/job riêng, đúng mô hình Cloud Run Job sau này.
- Database synthetic `affiliate_go_week1` được xóa sau kiểm chứng (`remaining=0`); có thể tái tạo hoàn
  toàn bằng Go migration và seed.

## 6. Kiểm chứng Go và container

| Kiểm tra | Kết quả |
|---|---|
| `go fmt ./...` | PASS |
| `go vet ./...` | PASS |
| `go test ./...` | PASS, gồm unit + HTTP/PostgreSQL integration |
| `docker build -t affiliate-api-go:week1 .` | PASS |
| Migration command trong image | `version=3 dirty=false` |
| Container `GET /health` | `status=ok`, `db=up` |
| Container runtime user | `nonroot:nonroot` |

Dockerfile dùng multi-stage build, tạo riêng binary API/migrate/seed và chạy runtime bằng distroless
non-root. Container smoke kết nối tới database sạch qua `host.docker.internal` và được dừng/xóa sau test.

## 7. Gate cuối Tuần 1

- [x] Nest baseline xanh và có báo cáo.
- [x] Go `/health` chạy local và container.
- [x] Migration Go dựng đủ 20 bảng/15 enum trên DB rỗng.
- [x] Contract matrix đủ 36/36, không dùng OpenAPI cũ để đoán.

## 8. Ranh giới bàn giao

Tuần 1 hoàn tất phần nền và contract, **không có nghĩa backend Go đã đạt parity toàn bộ**. Go hiện triển
khai hai platform endpoint `/` và `/health`; 34 business endpoint còn lại được port theo lịch Tuần 2–5.
NestJS vẫn được giữ nguyên làm oracle và frontend vẫn giữ nguyên contract trong giai đoạn này.
