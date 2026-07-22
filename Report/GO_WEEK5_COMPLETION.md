# BÁO CÁO HOÀN TẤT TUẦN 5 — GO BACKEND REWRITE

> Dự án: Affiliate GLOBAL  
> Ngày kiểm chứng: 22/07/2026  
> Kế hoạch đối chiếu: `Plan/GO_BACKEND_REWRITE_PLAN.md`  
> Kết luận: **PASS — hoàn tất toàn bộ phạm vi và 4/4 gate Tuần 5**

## 1. Phạm vi đã triển khai

Go API hiện phục vụ **36/36 HTTP operation**. Tuần 5 bổ sung 11 operation:

- `GET/POST /ops/:market/reconciliation`;
- `GET /ops/:market/reconciliation/:batchId`;
- `POST /ops/:market/reconciliation/:batchId/lock`;
- `GET /me/country/:market/wallet`;
- `POST /me/country/:market/payouts/otp`;
- `POST /me/country/:market/payouts`;
- `GET /ops/:market/payouts` và `GET .../holds`;
- `POST /ops/:market/payouts/:id/settle` và `POST .../:id/resolve`.

`GET /admin/audit?market=` đã có từ Tuần 2 và tiếp tục dùng chung audit append-only.

## 2. Reconciliation race-safe

- Chỉ `LOCAL_FINANCE` đúng country hoặc `GLOBAL_ADMIN` được list/create/get/lock batch.
- Create khóa row `country` trong transaction, sau đó mới chọn earning `PENDING` chưa có line.
  Hai Finance tạo đồng thời cho cùng market cho đúng một 201 và một 409
  `NOTHING_TO_RECONCILE`, không rơi ra lỗi unique/500.
- `reconciliation_line.earning_id` unique giữ vai trò chốt chặn cuối: một earning chỉ thuộc một batch.
- Lock dùng conditional update `OPEN -> LOCKED`; request thứ hai nhận 409 `BATCH_ALREADY_LOCKED`.
- Chỉ line không có anomaly mới chuyển earning `PENDING -> AVAILABLE`, cùng transaction với lock và
  audit `RECON_BATCH_LOCKED`. Cross-country trả 404.

## 3. Wallet, OTP và payout reservation

- Withdrawable = tổng net earning `AVAILABLE` trừ payout đang giữ ở `PROCESSING`, `PAID` hoặc
  `UNKNOWN_HOLD`; min payout đọc từ country config.
- OTP mock là số 6 chữ số sinh bằng `crypto/rand`, TTL 10 phút, ràng buộc đúng user/purpose và chỉ
  consume một lần.
- Payout kiểm positive integer, min payout, OTP, expiry và balance; tạo request `PROCESSING` và ghi
  `PAYOUT_RESERVE -amount` trong cùng transaction.
- Idempotency key được recheck sau khi khóa profile; retry trả đúng payout cũ và không reserve lần hai.
- Profile row lock serialize toàn bộ payout create của một creator/country. Test hai OTP khác nhau
  cùng rút 600.000 từ balance 900.000 cho đúng một request thắng; request thua không consume OTP,
  không tạo payout và không ghi reserve.

## 4. Settlement và UNKNOWN_HOLD

- `SUCCESS -> PAID`, giữ reserve đã trừ.
- `FAIL -> FAILED_RELEASED`, ghi đúng một `PAYOUT_RELEASE +amount`.
- `UNKNOWN -> UNKNOWN_HOLD`, tuyệt đối không release trước khi biết kết cục provider.
- Manual resolve chỉ nhận `SUCCESS` hoặc `FAIL` từ `UNKNOWN_HOLD`.
- Conditional state claim bảo đảm double-settle chỉ một request thắng. Payout attempt, state,
  release và audit được commit/rollback trong cùng transaction.
- Test dùng staff principal có UUID hợp lệ nhưng không tồn tại làm audit insert vi phạm FK sau claim;
  kết quả chứng minh payout vẫn `PROCESSING`, attempt/release/audit đều bằng 0.

## 5. Typed SQL và cấu trúc

- Query nguồn: `db/queries/reconciliation.sql`, `db/queries/payout.sql`.
- Generated: `internal/store/sqlcgen/{reconciliation,payout}.sql.go`.
- Domain service: `internal/reconciliation/service.go`, `internal/payout/service.go`.
- HTTP routes: `internal/httpapi/week5.go`; dependency wiring: `internal/app/app.go`.
- Acceptance: `integration/week5_test.go`.

## 6. Bằng chứng kiểm thử

### Go trên database sạch

Database synthetic `affiliate_go_week5` được tạo mới, migrate/seed và chạy toàn bộ suite:

| Kiểm tra | Kết quả |
|---|---|
| Migration + reference/demo seed | PASS |
| Full money-spine VN `SUCCESS -> PAID` | PASS |
| Full money-spine PH `FAIL -> FAILED_RELEASED` | PASS |
| Concurrent reconciliation create | một 201, một 409, một line/earning |
| Double reconciliation lock | một lần release earning |
| Concurrent payout bằng hai OTP | một 201, một 409, không overspend |
| Idempotency payout/reserve | đúng một payout và một reserve |
| UNKNOWN_HOLD + manual resolve | không release sớm; resolve đúng |
| Double settle | một attempt và tối đa một release |
| Staff audit failure rollback | state/attempt/release/audit không đổi |
| `go test -count=1 ./...` | PASS |
| `go vet ./...` | PASS |

Database nghiệm thu đã được xóa sau test (`remaining=0`).

### Container

- Image local: `affiliate-api-go:week5`.
- Runtime user: `nonroot:nonroot`.
- Health `ok/up` và Finance reconciliation list chạy được từ container.
- Container smoke tạm đã dừng/xóa.

### Regression oracle/frontend

| Bộ kiểm tra | Kết quả |
|---|---:|
| Root ESLint | PASS |
| API + web TypeScript typecheck | PASS |
| Nest oracle API | **105/105 PASS** |
| Playwright frontend E2E | **25/25 PASS** |

## 7. Gate cuối Tuần 5

- [x] Full money-spine VN và PH xanh.
- [x] Double settle không double release/pay.
- [x] Hai payout đồng thời không thể reserve vượt balance.
- [x] Staff action rollback không để audit mồ côi.

## 8. Ranh giới bàn giao

Go API đã có đủ 36 operation và demo local trọn money-spine. Chưa cutover production: Tuần 6 vẫn
phải port/refactor đầy đủ 105 acceptance case sang Go/differential harness, chạy race/hardening và
chứng minh frontend dùng Go API mà không đổi contract.
