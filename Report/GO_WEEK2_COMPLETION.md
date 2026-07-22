# BÁO CÁO HOÀN TẤT TUẦN 2 — GO BACKEND REWRITE

> Dự án: Affiliate GLOBAL  
> Ngày kiểm chứng: 22/07/2026  
> Kế hoạch đối chiếu: `Plan/GO_BACKEND_REWRITE_PLAN.md`  
> Kết luận: **PASS — hoàn tất toàn bộ phạm vi và 3/3 gate Tuần 2**

## 1. Phạm vi đã triển khai

Go API hiện phục vụ **17/36 HTTP operation**: 2 platform operation từ Tuần 1 và 15 operation thuộc
nhóm core/market/auth/profile/KYC/campaign/audit của Tuần 2.

| Nhóm | Operation đã chạy trên Go |
|---|---|
| Platform | `GET /`, `GET /health` |
| Market | `GET /markets/:market/context` |
| Auth | `POST /auth/mock-login`, `GET /auth/me`, `POST /auth/logout` |
| Country profile | `GET /me/countries`, `POST /me/country/:market` |
| KYC creator | `GET/POST /me/country/:market/kyc` |
| KYC Ops | `GET /ops/:market/kyc/queue`, `POST /ops/:market/kyc/:caseId/review` |
| Campaign | `GET/POST /markets/:market/campaigns`, `GET .../:id`, `GET .../:id/similar` |
| Audit | `GET /admin/audit?market=` và helper ghi audit dùng transaction của hành động |

## 2. Auth, session và RBAC

- Mock login chuẩn hóa email lowercase, upsert theo `(mock-google, normalized email)`.
- Token ngẫu nhiên 32 byte/64 ký tự hex; server chỉ lưu SHA-256 hash.
- Session có TTL 7 ngày, resolve hoàn toàn từ PostgreSQL và trả role assignment từ DB.
- Logout revoke phiên hiện tại; token cũ lập tức trả 401.
- Bearer middleware không tin user/role/country từ body hoặc URL.
- `GLOBAL_ADMIN` với `country_id=NULL` là vai duy nhất vượt biên giới.
- Local staff phải có đúng role và đúng `country_id`; sai role trả 403.
- Staff đúng role nhưng mở tài nguyên nước khác nhận 404 để không lộ sự tồn tại.

## 3. Country profile và market context

- Market context đọc country + country config từ DB; không dựng dữ liệu giả cho market lạ.
- Chỉ market enabled mới tạo được creator country profile.
- Chọn lại cùng `(user, country)` trả đúng profile cũ nhờ unique key/upsert.
- Danh sách profile chỉ lấy theo user ID đã resolve từ session.

## 4. KYC workflow

- Tạo draft idempotent với bốn field theo thứ tự ổn định: `fullName`, `idNumber`, `bankAccount`,
  `taxId`.
- Creator submit lần đầu chuyển `DRAFT → SUBMITTED`; sau reject chuyển `REJECTED → RESUBMITTED`.
- Field `ACCEPTED` bị khóa server-side; resubmit chỉ cập nhật field chưa được chấp nhận.
- Ops queue chỉ chứa `SUBMITTED/RESUBMITTED` của đúng country và sắp theo thời gian chờ.
- `NEEDS_CHANGES` bắt buộc reason; validation chạy trước transaction nên request lỗi không cập nhật
  field và không sinh audit.
- Toàn bộ field decision, kết luận case, reviewer/timestamp và `KYC_REVIEWED` audit cùng một
  PostgreSQL transaction.

Điểm này chặt hơn implementation Nest oracle hiện tại: Nest cập nhật từng field trước transaction
kết luận. Go giữ nguyên HTTP behavior nhưng bảo đảm gate atomicity mà kế hoạch Tuần 2 yêu cầu.

## 5. Campaign và reward rule

- Discover/detail/similar đều khóa theo country; campaign VN mở dưới path PH trả 404.
- `full` và `slotsLeft` được suy ra từ `slots_total - slots_taken`, không lưu cờ riêng.
- Similar chỉ lấy campaign active/còn suất/cùng nước, ưu tiên cùng platform rồi reward gần nhất,
  tối đa ba kết quả.
- Chỉ `LOCAL_ADMIN` đúng country hoặc `GLOBAL_ADMIN` được tạo campaign.
- Currency luôn lấy từ country, không tin client.
- Validate title, positive integer `rewardMinor` và `slotsTotal`.
- Campaign, reward rule ba trục `CONTENT_APPROVED / FLAT / SLOTS_X_PRICE` và
  `CAMPAIGN_CREATED` audit được tạo trong cùng transaction.
- `budgetCapMinor = flatAmountMinor × capSlots` được trả đúng contract.

## 6. Typed SQL và cấu trúc code

- Thêm query nguồn theo module tại `db/queries/{auth,country,kyc,campaign,audit}.sql`.
- Code `internal/store/sqlcgen` được sinh bằng sqlc v1.31.1; domain service không ghép SQL động.
- Thêm các package `internal/auth`, `country`, `kyc`, `campaign`, `audit`, `apierr`.
- HTTP handler chỉ decode/coerce body, lấy auth context và encode response; business rule nằm ở
  service.
- Error được chuẩn hóa về envelope có `code`, `message`, `status`, `correlationId`, `retryable`.

## 7. Bằng chứng kiểm thử

### Go trên database sạch

Database synthetic `affiliate_go_week2` được tạo mới, sau đó:

| Kiểm tra | Kết quả |
|---|---|
| Go migration | `version=3`, clean |
| Schema parity | 20 application table / 15 enum |
| Demo seed | PASS |
| `TestWeek2AuthMarketAndCountryParity` | PASS |
| `TestWeek2KycRBACIsolationAndAuditAtomicity` | PASS |
| `TestWeek2CampaignAndGlobalAuditParity` | PASS |
| `go vet ./...` | PASS |
| `go test -count=1 ./...` | PASS |

Acceptance kiểm trực tiếp: 401 thiếu/sai session; 403 sai role; 404 cross-country; profile idempotent;
KYC reject/resubmit/approve; accepted-field lock; failed-review không audit; campaign reward cap;
campaign audit; global-admin audit filter.

Database test đã được xóa sau kiểm chứng (`remaining=0`) và có thể tái tạo hoàn toàn bằng Go
migration + demo seed.

### Container

- Image: `affiliate-api-go:week2`, multi-stage/distroless.
- Runtime user: `nonroot:nonroot`.
- Container smoke: health `ok/up`, market `VN/VND`, login + `/auth/me`, profile VN, KYC
  `DRAFT/4-fields`, campaign list/create và campaign audit đều PASS.
- Campaign smoke `100000 × 2` trả `budgetCapMinor=200000`.
- Container tạm được dừng/xóa sau test.

### Regression oracle/frontend

| Bộ kiểm tra | Kết quả |
|---|---:|
| Root ESLint | PASS |
| API + web TypeScript typecheck | PASS |
| Nest oracle API | **105/105 PASS** |
| Playwright frontend E2E | **25/25 PASS** |

Playwright vẫn trỏ Nest ở port 3001 vì Go chưa có các route Join/Content/Earnings/Payout của Tuần
3–5. Acceptance Tuần 2 đã chạy trực tiếp trên Go; chưa chuyển frontend sang Go sớm.

## 8. Gate cuối Tuần 2

- [x] Nhóm test auth, market, profile, KYC và campaign xanh với Go.
- [x] Sai session/role/country trả đúng 401/403/404.
- [x] KYC review + field update + audit atomic trong Go.

## 9. Ranh giới bàn giao

Còn **19/36 operation** thuộc Join/Waitlist, Content, Earnings/Ledger, Reconciliation và Payout được
port trong Tuần 3–5. NestJS vẫn là oracle; chưa thay `apps/api`, chưa đổi frontend API base và chưa
chuyển traffic.

