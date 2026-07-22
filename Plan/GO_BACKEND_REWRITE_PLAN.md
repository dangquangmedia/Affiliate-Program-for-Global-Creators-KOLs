# KẾ HOẠCH REWRITE TOÀN BỘ BACKEND SANG GO

> Dự án: Affiliate GLOBAL  
> Phạm vi: thay toàn bộ NestJS/TypeScript trong `apps/api` bằng Go; giữ nguyên frontend Next.js,
> PostgreSQL, HTTP contract và hành vi nghiệp vụ.  
> Giả định lập lịch: bắt đầu thứ Hai 27/07/2026, 1 developer làm full-time, đã vững Go và
> PostgreSQL.  
> Mục tiêu bàn giao: Go API đạt behavioral parity, toàn bộ test xanh, chạy trên Google Cloud
> staging, có migration job, reclaim job, monitoring và rollback đã diễn tập.

---

## 1. Kết luận thời gian

### Mốc nên cam kết với mentor

| Phương án | Phạm vi thật sự | Thời gian 1 dev | Có nên gọi là hoàn chỉnh? |
|---|---|---:|---|
| Demo nhanh | API Go chạy luồng chính; giữ test TypeScript làm acceptance; ít soak/hardening | 3–4 tuần | Không |
| Parity local | 36 route tương thích; 105 API case + 25 E2E xanh; chưa hoàn thiện GCP/rollback | 5–6 tuần | Gần đủ về code |
| **Khuyến nghị** | Parity đầy đủ + hardening concurrency + Google Cloud staging + rollback | **7–8 tuần** | **Có** |
| Production thật | Thêm Google OAuth, OTP/SMS, eKYC và payout provider thật | Thêm 4–8+ tuần | Có, sau security/legal review |

Effort cơ sở của phương án khuyến nghị là khoảng **32,5 person-days**. Cộng buffer 20% cho lỗi
contract, concurrency, migration và GCP/IAM thành **38–40 person-days**, tương đương 7–8 tuần.

Nếu có 2 developer Go/PostgreSQL vững, thời gian lịch còn khoảng **4–5 tuần**; tổng effort không
giảm một nửa vì contract, money-spine, integration và cutover nằm trên critical path.

Nếu developer vừa học Go trong lúc làm, nên cam kết **9–11 tuần**.

---

## 2. Phạm vi đã đo trực tiếp từ repository

Đây không phải backend CRUD nhỏ:

| Chỉ số | Quy mô hiện tại |
|---|---:|
| HTTP endpoint | 36 |
| Controller NestJS | 16 |
| Service nghiệp vụ | 13 |
| Backend TypeScript viết tay | khoảng 3.048 dòng |
| PostgreSQL model/table | 20 |
| PostgreSQL enum | 15 |
| Migration hiện có | 3 |
| Interactive transaction | 12 |
| API integration test runtime | 105 case |
| Playwright frontend E2E | 25 case trong 18 file |

Các tài liệu cũ còn ghi 18 hoặc 19 bảng; khi rewrite phải lấy `schema.prisma` và migration SQL thực
tế làm chuẩn: hiện có **20 model**, bao gồm `session` và `audit_event`.

### 36 endpoint phải giữ tương thích

| Nhóm | Endpoint |
|---|---|
| Platform | `GET /`; `GET /health`; `GET /markets/:market/context` |
| Auth/Profile | `POST /auth/mock-login`; `GET /auth/me`; `POST /auth/logout`; `GET /me/countries`; `POST /me/country/:market` |
| KYC | `GET/POST /me/country/:market/kyc`; `GET /ops/:market/kyc/queue`; `POST /ops/:market/kyc/:caseId/review` |
| Campaign/Join | `GET/POST /markets/:market/campaigns`; `GET .../:id`; `GET .../:id/similar`; `POST .../:id/join`; `POST .../:id/leave`; `GET /me/country/:market/participations` |
| Content | `GET/POST /me/country/:market/campaigns/:campaignId/content`; `GET /ops/:market/content/queue`; `POST /ops/:market/content/:submissionId/review` |
| Earnings | `GET /me/country/:market/earnings` |
| Reconciliation | `GET/POST /ops/:market/reconciliation`; `GET .../:batchId`; `POST .../:batchId/lock` |
| Payout | `GET /me/country/:market/wallet`; `POST .../payouts/otp`; `POST .../payouts`; `GET /ops/:market/payouts`; `GET .../holds`; `POST .../:id/settle`; `POST .../:id/resolve` |
| Audit | `GET /admin/audit?market=` |

“Giữ frontend” có nghĩa là từng endpoint phải giữ nguyên:

- Method và path.
- Bearer session behavior.
- Request body và validation.
- HTTP status, kể cả `POST` hiện được Nest trả `201`.
- Tên field, kiểu JSON, `null`/omitted field và thứ tự danh sách có ý nghĩa.
- Error envelope `{ error: { code, message, status, correlationId, retryable } }`.
- Quy ước 401/403/404/409: thiếu session = 401; sai role = 403; tài nguyên khác nước = 404;
  transition/xung đột = 409.

OpenAPI `packages/contracts/openapi/week2.yaml` hiện chỉ phủ một phần nhỏ và còn khác API đang chạy
(ví dụ cookie so với Bearer, path profile khác). Không được dùng file đó làm nguồn sự thật duy nhất.

---

## 3. Phạm vi trong và ngoài kế hoạch

### Trong phạm vi

- Thay NestJS, Prisma runtime và TypeScript backend bằng Go.
- Giữ schema và dữ liệu PostgreSQL.
- Giữ toàn bộ 36 endpoint và hành vi mà frontend đang dùng.
- Port/đổi test harness để chạy được với Go API.
- Bổ sung test concurrency cho các điểm tiền và state transition còn thiếu.
- Tách reclaim scheduler thành process/job chạy một lần.
- Docker hóa Go API.
- Deploy staging: Cloud Run, Cloud SQL, Secret Manager, migration job, Scheduler/reclaim job.
- Logging, health, alert cơ bản và rollback rehearsal.

### Ngoài phạm vi của estimate 7–8 tuần

- Google OAuth thật thay `mock-login`.
- SMS/email OTP thật.
- eKYC provider thật.
- Payout provider/bank thật.
- Thay đổi UI, thêm tính năng, đổi schema nghiệp vụ.
- Multi-region, active-active hoặc compliance certification.

Các mock trên vẫn được port nguyên hành vi để giữ parity. Không được gọi staging này là production
nhận KYC/tiền thật.

---

## 4. Kiến trúc đích

```text
Next.js Web (giữ nguyên)
        │ HTTP/JSON + Bearer token
        ▼
Go API / Cloud Run
  ├─ chi router + middleware
  ├─ handler: HTTP contract
  ├─ service: state machine/business rules
  ├─ sqlc queries + pgx transaction
  └─ slog JSON logs
        │
        ▼
PostgreSQL / Cloud SQL (giữ schema)

Cloud Scheduler → Cloud Run Job `reclaim` → PostgreSQL
Cloud Run Job `migrate` → PostgreSQL
```

### Stack kỹ thuật chốt

| Nhu cầu | Lựa chọn | Lý do |
|---|---|---|
| HTTP routing | `go-chi/chi` | Nhẹ, idiomatic, middleware rõ |
| PostgreSQL | `jackc/pgx/v5` + `pgxpool` | Transaction/locking trực tiếp, pool tốt |
| Typed SQL | `sqlc` | SQL tường minh, sinh type Go; phù hợp money-spine hơn ORM |
| Migration | `golang-migrate` hoặc `goose`, chọn một và dùng forward-only | Bỏ phụ thuộc Prisma CLI sau cutover |
| Validation | `go-playground/validator` + validation nghiệp vụ trong service | Phân biệt shape và business rule |
| Logging | `log/slog` JSON | Cloud Logging đọc được trực tiếp |
| UUID | `google/uuid` | Parse/generate UUID rõ ràng |
| Test | `testing`, `httptest`, PostgreSQL test DB; giữ Playwright làm acceptance | Không phụ thuộc framework |
| Container | Multi-stage build, distroless non-root | Image nhỏ, startup nhanh, giảm attack surface |

Không dùng GORM cho money-spine. Join, content review, reconciliation và payout cần nhìn thấy rõ
`SELECT ... FOR UPDATE`, conditional `UPDATE ... RETURNING`, unique conflict và transaction boundary.

### Cấu trúc thư mục đích

```text
apps/api/
├── cmd/
│   ├── api/main.go
│   ├── migrate/main.go
│   └── reclaim/main.go
├── internal/
│   ├── app/
│   ├── config/
│   ├── httpapi/
│   │   ├── router.go
│   │   ├── errors.go
│   │   └── middleware/
│   ├── auth/
│   ├── country/
│   ├── kyc/
│   ├── campaign/
│   ├── content/
│   ├── earning/
│   ├── ledger/
│   ├── reconciliation/
│   ├── payout/
│   ├── audit/
│   └── postgres/
├── db/
│   ├── migrations/
│   ├── queries/
│   ├── generated/
│   └── seed.sql
├── integration/
├── sqlc.yaml
├── go.mod
├── go.sum
└── Dockerfile
```

Handler chỉ làm HTTP decode/encode. Service giữ luật nghiệp vụ. SQLC/query layer không tự quyết định
RBAC/state transition. Các action cần audit phải nhận cùng `pgx.Tx`; không được mở transaction riêng.

---

## 5. Chiến lược rewrite an toàn

Không thay từng endpoint trên production. Đây là modular monolith có session, transaction và flow
tiền xuyên module; route một nửa qua Nest và một nửa qua Go làm test/cutover khó hơn.

### Cách làm

1. Tag/branch trạng thái Nest đang xanh: `pre-go-rewrite`.
2. Feature-freeze backend: trong giai đoạn rewrite không thêm tính năng hay đổi schema/contract.
3. Trong lúc phát triển, giữ Nest ở port 3001 làm oracle; chạy Go ở port 3002.
4. Nest và Go dùng database test tách biệt được dựng từ cùng migration/seed.
5. Chạy cùng bộ HTTP acceptance test lên cả hai; normalize UUID/time/correlation ID rồi so kết quả.
6. Khi Go đạt parity, cho frontend dùng Go nhưng không sửa frontend client.
7. Chạy full E2E và soak trên staging.
8. Cutover toàn bộ API một lần bằng Cloud Run revision/traffic.
9. Giữ image/revision Nest để rollback; chỉ xóa code legacy sau thời gian ổn định đã chốt.

### Quy tắc database

- Tuần 1–6: **schema freeze**, không tối ưu hay “dọn schema” trong lúc port.
- Copy nguyên nội dung ba migration SQL sang migration tool Go; kiểm checksum/fingerprint schema.
- DB mới: chạy migration Go từ rỗng và seed synthetic.
- DB đã có dữ liệu: đối chiếu schema, backup, ghi baseline version; không chạy lại `CREATE TABLE`.
- Migration production là forward-only, backward-compatible; không tự động chạy trong startup API.
- Migration chạy bằng Cloud Run Job trước khi chuyển traffic.

Nếu database hiện chỉ chứa dữ liệu synthetic local thì có thể dựng DB mới để test. Nếu đã có dữ liệu
thật cần bảo toàn khi chuyển migration history từ Prisma, cộng thêm 2–3 ngày và bắt buộc rehearsal
trên bản restore.

---

## 6. WBS và effort

| # | Giai đoạn | Công việc chính | Effort |
|---:|---|---|---:|
| 0 | Baseline/contract | Chạy baseline; inventory 36 route; request/response/status/error; golden fixtures | 2 ngày |
| 1 | Go foundation | Router, config, `PORT`, CORS, request ID, error envelope, validation, graceful shutdown | 3 ngày |
| 2 | Data layer | pgxpool, sqlc, transaction helper, migration/seed, schema parity | 2,5 ngày |
| 3 | Core platform | Auth/session, Bearer middleware, RBAC, market, country profile | 2,5 ngày |
| 4 | KYC/campaign | KYC state machine; campaign list/detail/similar/create; audit | 3 ngày |
| 5 | Join lifecycle | Lock campaign, idempotent join, waitlist FCFS, leave/promote, strike/reclaim | 3 ngày |
| 6 | Content/money entry | Submit/resubmit, review claim, earning exactly-once, tax, ledger, earnings | 4 ngày |
| 7 | Finance spine | Reconciliation, OTP, wallet, reserve, settle, hold, resolve, audit | 4,5 ngày |
| 8 | Test parity | Port/refactor 105 API cases; concurrency; 25 Playwright E2E; fix contract drift | 4 ngày |
| 9 | Google Cloud | Docker, Cloud Run/SQL/Secrets, migration/reclaim jobs, CI/CD, smoke | 2,5 ngày |
| 10 | Soak/cutover | Monitoring, soak, rollback rehearsal, runbook, cleanup | 1,5 ngày |
|  | **Tổng cơ sở** |  | **32,5 ngày** |
|  | **Buffer 20%** | Contract gaps, race bug, SQL behavior, GCP/IAM | **6–7 ngày** |
|  | **Tổng cam kết** |  | **38–40 ngày** |

---

## 7. Lịch triển khai cụ thể cho 1 developer

### Tuần 1 — 27/07 đến 31/07: baseline, contract và nền Go

**Việc làm**

- Chạy và lưu baseline: lint, typecheck, 105 API test, 25 Playwright test.
- Tạo contract matrix đủ 36 endpoint từ controller + frontend clients + tests.
- Ghi golden response cho success/error; chốt POST status 201 và error envelope.
- Dựng Go module, server, config, `PORT`, CORS, JSON log, request/correlation ID.
- Kết nối pgxpool, `/health`, graceful shutdown.
- Chuyển migration/seed sang tool Go; dựng DB sạch và so schema.
- Dựng integration test harness HTTP + PostgreSQL.

**Gate cuối tuần**

- Nest baseline xanh và có báo cáo.
- Go `/health` chạy local/container.
- Migration Go dựng được đủ 20 bảng/15 enum trên DB rỗng.
- Contract matrix đủ 36/36, không dùng OpenAPI cũ để đoán.

**Trạng thái thực thi ngày 22/07/2026: HOÀN TẤT (4/4 gate).** Bằng chứng và lệnh kiểm chứng được
ghi tại `Report/GO_WEEK1_COMPLETION.md`.

### Tuần 2 — 03/08 đến 07/08: core, auth, RBAC, country, KYC, campaign

**Việc làm**

- Mock login tương thích: upsert user, random token, SHA-256 token, session TTL 7 ngày.
- `GET /auth/me`, logout/revoke, Bearer middleware.
- RBAC và market scoping; giữ 403/404 chống lộ dữ liệu khác nước.
- Market context và creator country profile idempotent.
- KYC draft/submit/resubmit, Ops queue/review theo field.
- Campaign discover/detail/similar/create và reward rule ba trục.
- Audit helper bắt buộc chạy cùng transaction với staff action.

**Gate cuối tuần**

- Nhóm test auth, market, profile, KYC và campaign xanh với Go.
- Sai session/role/country trả đúng 401/403/404.
- KYC review + field update + audit atomic trong Go.

**Trạng thái thực thi ngày 22/07/2026: HOÀN TẤT (3/3 gate).** Bằng chứng và lệnh kiểm chứng được
ghi tại `Report/GO_WEEK2_COMPLETION.md`.

### Tuần 3 — 10/08 đến 14/08: join, waitlist và reclaim

**Việc làm**

- KYC gate trước join.
- Snapshot reward/currency/trigger/pricing lúc giữ suất.
- `SELECT campaign ... FOR UPDATE` trước kiểm/cập nhật slot.
- Join idempotent; full campaign đưa vào waitlist.
- Leave giảm slot và promote người chờ sớm nhất theo FCFS.
- Deadline submit/fix, strike, reclaim quá hạn.
- `cmd/reclaim` chạy đúng một sweep rồi exit để dùng Cloud Run Job.

**Gate cuối tuần**

- Ba creator tranh slot cuối: đúng 1 `JOINED`, 2 `WAITLISTED`, không oversell.
- Leave/reclaim promote đúng người sớm nhất.
- Chạy job hai lần không tạo side effect sai.

**Trạng thái thực thi ngày 22/07/2026: HOÀN TẤT (3/3 gate).** Bằng chứng race, FCFS,
reclaim idempotency, DB sạch và container được ghi tại `Report/GO_WEEK3_COMPLETION.md`.

### Tuần 4 — 17/08 đến 21/08: content, earning và ledger

**Việc làm**

- Submit content, platform validation, hashtag advisory.
- Reject/resubmit và attempt chain.
- Conditional claim review bằng `UPDATE ... WHERE state = 'SUBMITTED' RETURNING`.
- Approve tạo đúng một earning từ snapshot.
- Tính thuế bằng `int64` minor units; tuyệt đối không `float`.
- Ghi `EARNING_ACCRUE` và `TAX` vào ledger append-only.
- Earnings dashboard và running balance.
- Audit approve/reject trong cùng transaction.

**Gate cuối tuần**

- Double approve đồng thời: một request thắng, chỉ một earning và một bộ ledger entry.
- Reject/resubmit đúng attempt chain.
- Tổng gross/tax/net đúng cho VND và PHP.

**Trạng thái thực thi ngày 22/07/2026: HOÀN TẤT (3/3 gate).** Bằng chứng conditional claim,
earning/ledger/audit atomic, phép tính thuế `int64`, DB sạch và container được ghi tại
`Report/GO_WEEK4_COMPLETION.md`.

### Tuần 5 — 24/08 đến 28/08: reconciliation, payout và audit

**Việc làm**

- Reconciliation list/create/detail/lock.
- Earning chỉ vào một batch; lock chuyển `PENDING → AVAILABLE` đúng một lần.
- Wallet và mock OTP consume nguyên tử.
- Payout idempotency, kiểm balance và ghi `PAYOUT_RESERVE` cùng transaction.
- Settlement `SUCCESS`, `FAIL`, `UNKNOWN`.
- `UNKNOWN_HOLD` không release; manual resolve success/fail.
- Audit query global/filter market.
- Thêm khóa profile/wallet hoặc isolation/retry để hai OTP khác nhau không overspend.

**Gate cuối tuần**

- Full money-spine VN và PH xanh.
- Double settle không double release/pay.
- Hai payout đồng thời không thể reserve vượt balance.
- Staff action rollback thì không có audit mồ côi.

**Mốc:** cuối tuần 5 có demo local trọn luồng bằng Go.

**Trạng thái thực thi ngày 22/07/2026: HOÀN TẤT (4/4 gate).** Go API đã đủ **36/36 operation**;
money-spine VN/PH, race reconciliation, concurrent payout chống overspend, double-settle và rollback
audit đều được kiểm chứng trên database sạch. Chi tiết tại `Report/GO_WEEK5_COMPLETION.md`.

### Tuần 6 — 31/08 đến 04/09: full parity và hardening

**Việc làm**

- Port/refactor đủ 105 API integration cases.
- Chạy đủ 25 Playwright E2E với Go API ở port 3001.
- Differential test Nest vs Go cho contract đã freeze.
- Bổ sung concurrent tests cho payout, KYC review, content submit và recon create.
- Chạy `go test ./...`, `go test -race ./...`, `go vet`, formatter/linter, vulnerability scan.
- Cập nhật root scripts, bootstrap và README để không còn cần Prisma/Nest runtime.

**Gate cuối tuần**

- 36/36 endpoint parity.
- 105/105 API case và 25/25 E2E xanh.
- Frontend client không cần đổi contract.
- Không còn Node/Prisma dependency để chạy backend.

**Trạng thái thực thi ngày 22/07/2026: HOÀN TẤT (4/4 gate).** Xác minh độc lập 36/36 route bằng đếm
trực tiếp trong code; 105/105 legacy case + 25/25 Playwright E2E + 13/13 differential Nest↔Go đều
chạy lại thật trong phiên kiểm chứng (không trích dẫn báo cáo cũ); `go test -race`, `go vet`,
`gofmt`, `govulncheck` sạch; root scripts/bootstrap/README không còn phụ thuộc Prisma/Nest ở đường
chạy chính. Bằng chứng đầy đủ tại `Report/GO_WEEK6_COMPLETION.md`.

### Tuần 7 — 07/09 đến 11/09: Google Cloud staging

**Việc làm**

- Build image Go multi-stage/non-root và push Artifact Registry.
- Dựng/deploy Cloud Run API, Cloud SQL và Secret Manager.
- Chạy migration bằng Cloud Run Job.
- Deploy reclaim bằng Cloud Run Job, kích hoạt qua Cloud Scheduler.
- Cấu hình pool DB, `max-instances`, health, logs, metrics và alerts.
- Deploy frontend trỏ vào Go API staging.
- Chạy smoke/E2E trên staging.

**Gate cuối tuần**

- Migration job thành công trên DB staging rỗng và bản restore.
- API/Web staging chạy trọn money-spine.
- Reclaim Scheduler authenticated, không dùng timer trong API.
- Log không lộ token, OTP hoặc dữ liệu KYC.

### Tuần 8 — 14/09 đến 18/09: soak, rollback và bàn giao

**Việc làm**

- Soak test/stress các transaction cạnh tranh.
- Sửa contract drift và lỗi Cloud SQL connection/pool.
- Rehearse rollback Cloud Run revision và database restore procedure.
- Chốt dashboard/alerts và runbook sự cố.
- Tag release Go; lưu Nest image/revision làm fallback.
- Demo mentor: kiến trúc, transaction, concurrency test, Cloud Run deployment.

**Gate bàn giao**

- Staging ổn định trong cửa sổ soak đã chốt.
- Rollback rehearsal có bằng chứng.
- DoD ở mục 12 đạt toàn bộ.

---

## 8. Transaction phải port nguyên vẹn hoặc làm chặt hơn

| Luồng | Điều bắt buộc trong Go |
|---|---|
| Campaign create | Campaign + reward rule + audit cùng transaction |
| Join | Lock campaign; recheck state; participation/waitlist + `slots_taken` cùng transaction |
| Leave/promote | Cùng campaign lock; decrement + promote FCFS cùng transaction |
| Reclaim | Scan candidate rồi lock/recheck từng campaign; expire/strike/decrement/promote atomic |
| Content submit | Claim/lock participation; tạo submission + đổi state atomic; chống double submit |
| Content approve | Conditional claim; earning + ledger + participation + audit cùng transaction |
| KYC review | Tất cả field decision + case state + audit cùng transaction |
| Recon create | Claim earning an toàn; batch + unique lines + audit cùng transaction |
| Recon lock | Conditional `OPEN → LOCKED`; earning `PENDING → AVAILABLE` + audit atomic |
| Payout create | Consume OTP + lock balance/profile + payout + reserve ledger atomic |
| Settle/resolve | Conditional state claim + attempt + paid/release ledger + audit atomic |

### Race condition hiện có nên sửa trong bản Go

Đây là hardening, không phải thay đổi frontend contract:

- Hai payout dùng hai OTP khác nhau hiện có nguy cơ cùng đọc một balance rồi overspend.
- Double content submit có thể cùng tính `attemptNo=count+1` và rơi vào unique conflict/500.
- KYC field updates hiện không nằm hết trong transaction của case/audit.
- Hai finance cùng tạo reconciliation batch có thể đụng unique earning line thành lỗi thô.
- Concurrent create KYC case có thể đụng unique profile.

Mỗi lỗi trên phải có test concurrent tái hiện trước, rồi mới sửa bằng row lock, conditional update,
`SKIP LOCKED` hoặc isolation/retry phù hợp. Không âm thầm đổi semantics mà không có test.

---

## 9. Chiến lược test

### Ba tầng test

1. **Unit tests Go:** validation, mapping, state transition thuần, tax/minor-unit calculation.
2. **Integration tests Go + PostgreSQL:** handler/service/query/transaction thật.
3. **Acceptance/E2E:** bộ HTTP contract và 25 Playwright case chạy với backend Go.

### Cách xử lý 105 test Nest hiện tại

Các test hiện khởi động `NestFactory` trực tiếp; vài test còn lấy `PrismaService` hoặc gọi
`JoinService.reclaimExpired()` nội bộ. Vì vậy phải:

- Tách fixture/login/request helper khỏi Nest.
- Chạy server Go như external process hoặc qua `httptest`.
- Thay DB assertion Prisma bằng SQL/pgx.
- Thay gọi service reclaim bằng chạy `cmd/reclaim` hoặc application command tương ứng.
- Giữ test name và business assertion để có ma trận 105 cũ → 105 mới.

### Test gate bắt buộc

- 105 API runtime cases pass.
- 25 Playwright E2E pass mà không đổi frontend API contract.
- Join race lặp nhiều vòng không oversell.
- Double approve không double earning/ledger.
- Concurrent payout không overspend.
- Concurrent reconciliation không gắn một earning vào hai batch.
- `go test -race ./...` xanh; lưu ý race detector chỉ bắt data race trong Go, không thay cho DB
  concurrency test.

---

## 10. Kế hoạch GCP và cutover

### Thành phần

- Cloud Run service: `affiliate-api-go`.
- Cloud SQL PostgreSQL: giữ cùng version/schema đã xác nhận.
- Secret Manager: `DATABASE_URL` hoặc các thành phần credential.
- Cloud Run Job: `affiliate-migrate`.
- Cloud Run Job: `affiliate-reclaim`.
- Cloud Scheduler: gọi reclaim job bằng service account/OIDC.
- Artifact Registry: image theo commit SHA, không dùng tag `latest` để cutover.
- Cloud Logging/Monitoring: 5xx, latency, DB connections, job failure, payout hold.

### Trình tự release

```text
CI test
→ build immutable image
→ push Artifact Registry
→ backup Cloud SQL
→ chạy migration job
→ deploy Go revision không nhận traffic
→ smoke test revision
→ chuyển traffic có kiểm soát
→ chạy E2E/money-spine
→ theo dõi log/metrics
```

### Rollback

- Nếu lỗi contract/runtime nhưng schema còn backward-compatible: chuyển traffic về Nest revision.
- Không xóa Nest image/revision ngay sau cutover.
- Nếu migration lỗi trước traffic: dừng release, không deploy API mới.
- Nếu có data corruption: dừng money actions, dùng runbook restore/PITR đã diễn tập; không tự chạy
  down migration phá dữ liệu.

---

## 11. Chia việc nếu có 2 developer

| Tuần | Developer A | Developer B | Việc bắt buộc pair-review |
|---|---|---|---|
| 1 | Contract + HTTP foundation | DB/sqlc/migration + test harness | Contract/error/schema |
| 2 | Auth/profile/KYC/campaign | Audit/query layer/ledger primitives | RBAC/country isolation |
| 3 | Join/waitlist/content | Earnings/reconciliation foundation | Locks và idempotency |
| 4 | Integration/frontend parity | Payout/audit/GCP foundation | Toàn bộ money transaction |
| 5 | E2E/soak/fixes | Deploy/monitoring/rollback | Cutover decision |

Không chia mỗi người một service rồi ghép cuối kỳ. Transaction money và audit cắt ngang module nên
phải merge/test liên tục mỗi ngày.

---

## 12. Definition of Done

Chỉ được tuyên bố “rewrite xong” khi đạt đủ:

- [ ] 36/36 method/path tương thích.
- [ ] Request/response/status/error envelope tương thích frontend.
- [ ] Frontend không cần sửa API client để chạy với Go.
- [ ] PostgreSQL giữ đủ 20 bảng, 15 enum và dữ liệu qua migration/cutover.
- [ ] 105/105 API case xanh với Go.
- [ ] 25/25 Playwright E2E xanh với Go.
- [ ] Sai country trả 404; sai role 403; thiếu/hỏng session 401.
- [ ] Join race không oversell và waitlist giữ FCFS.
- [ ] Earning và ledger exactly-once; ledger/audit append-only.
- [ ] Reconciliation lock idempotent.
- [ ] Payout không overspend/double-pay/double-release.
- [ ] `UNKNOWN_HOLD` không tự release tiền.
- [ ] Business action và audit cùng commit hoặc cùng rollback.
- [ ] Reclaim chạy bằng job idempotent, không dùng timer trong Cloud Run API.
- [ ] Go API image non-root, đọc `PORT`, graceful shutdown và health hoạt động.
- [ ] Migration job, backup và rollback đã rehearsal trên staging.
- [ ] Log/alert/runbook đủ để phát hiện và xử lý 5xx, DB/job failure và payout hold.

---

## 13. Câu báo mentor ngắn gọn

> Em đã audit backend hiện tại: 36 endpoint, 20 bảng, 12 transaction và 105 API test. Em không
> dịch cú pháp NestJS sang Go theo kiểu big-bang; em khóa HTTP contract, giữ PostgreSQL schema,
> triển khai Go song song, kiểm chứng bằng cùng acceptance test rồi cutover nguyên API. Với một
> developer Go/PostgreSQL vững, em cam kết 7–8 tuần để đạt parity đầy đủ, test concurrency, deploy
> Google Cloud staging và diễn tập rollback. Mốc demo local trọn money-spine là cuối tuần 5; full
> parity cuối tuần 6; staging cuối tuần 7.
