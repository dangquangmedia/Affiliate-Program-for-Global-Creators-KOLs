# BÁO CÁO HOÀN TẤT TUẦN 4 — GO BACKEND REWRITE

> Dự án: Affiliate GLOBAL  
> Ngày kiểm chứng: 22/07/2026  
> Kế hoạch đối chiếu: `Plan/GO_BACKEND_REWRITE_PLAN.md`  
> Kết luận: **PASS — hoàn tất toàn bộ phạm vi và 3/3 gate Tuần 4**

## 1. Phạm vi đã triển khai

Go API hiện phục vụ **25/36 HTTP operation**. Tuần 4 bổ sung:

- `GET/POST /me/country/:market/campaigns/:campaignId/content`;
- `GET /ops/:market/content/queue`;
- `POST /ops/:market/content/:submissionId/review`;
- `GET /me/country/:market/earnings`.

## 2. Content submit và attempt chain

- Creator chỉ submit khi participation là `JOINED` hoặc `REJECTED`; đã approve, đang chờ review
  hoặc không giữ suất nhận mã lỗi typed tương ứng.
- URL bắt buộc HTTP(S). TikTok/Instagram/YouTube/Facebook được kiểm tra hostname và subdomain,
  không chấp nhận hostname giả có hậu tố đánh lừa.
- Sai platform bị chặn 400; thiếu hashtag chỉ gắn `hashtagOk=false` để Ops xem, không chặn submit.
- Participation được khóa trước khi tính `attempt_no`. Hai submit đồng thời cho cùng participation
  cho kết quả một 201, một 409 và chỉ có một attempt.
- Resubmit tăng attempt và `supersedes_id` trỏ đúng bản `REJECTED` gần nhất.
- Tạo submission và chuyển participation sang `CONTENT_SUBMITTED` cùng transaction, nhờ đó đồng hồ
  reclaim dừng khi creator đang chờ Ops.

## 3. Review race-safe và exactly-once

- Queue chỉ trả submission `SUBMITTED` của đúng country; Ops nước khác không nhìn thấy và review
  cross-country trả 404.
- `LOCAL_OPS`, `LOCAL_ADMIN` đúng country hoặc `GLOBAL_ADMIN` mới review được.
- Reject bắt buộc reason, chuyển participation `REJECTED` và đặt fix deadline 24 giờ.
- Review claim dùng `UPDATE content_submission ... WHERE state='SUBMITTED' RETURNING *`.
- Hai approve đồng thời: đúng một request 201; request còn lại 409 `ALREADY_REVIEWED`.
- Unique `earning.submission_id` vẫn là chốt chặn DB cuối cùng chống double earning.

## 4. Earning, thuế, ledger và audit atomic

- Earning lấy gross/currency từ snapshot lúc giữ suất, không đọc giá campaign hiện tại.
- Thuế tính hoàn toàn bằng `int64` minor units, không dùng `float`:
  `gross/100*percent + gross%100*percent/100`.
- Công thức giữ phép floor của nghiệp vụ và tránh overflow ở trường hợp `MaxInt64 × 100%`.
- Approve tạo earning `PENDING`, ledger `EARNING_ACCRUE +gross`, ledger `TAX -tax`, cập nhật
  participation và ghi `CONTENT_APPROVED` audit trong cùng transaction.
- Reject và audit `CONTENT_REJECTED` cũng cùng transaction.
- Fixture cố ý đặt tax config sai 101% làm approval fail đã chứng minh rollback toàn bộ: submission
  vẫn `SUBMITTED`; earning, ledger và audit đều bằng 0.

## 5. Dashboard và running balance

- Dashboard trả earning mới nhất trước và tính lại net = gross − tax.
- Summary có tổng gross/tax/net và net theo `PENDING`, `AVAILABLE`, `PAID`.
- Ledger là append-only; running balance tính theo thứ tự bút toán tăng dần rồi đảo để hiển thị mới
  nhất trước.
- Các bút toán trong cùng transaction có chung `CURRENT_TIMESTAMP`, vì vậy query có type rank
  xác định `EARNING_ACCRUE` trước `TAX`, tránh running balance không ổn định do UUID ngẫu nhiên.
- Profile/country scope được áp cho cả earning lẫn ledger.

## 6. Typed SQL và cấu trúc

- Query nguồn: `db/queries/content.sql`, `db/queries/earnings.sql`.
- Generated: `internal/store/sqlcgen/{content,earnings}.sql.go`.
- Domain service: `internal/content/service.go`, `internal/earnings/service.go`.
- HTTP wiring: `internal/httpapi/week2.go`; dependency wiring: `internal/app/app.go`.
- Acceptance: `integration/week4_test.go`; unit tax: `internal/content/service_test.go`.

## 7. Bằng chứng kiểm thử

### Go trên database sạch

Database synthetic `affiliate_go_week4` được tạo mới rồi chạy hoàn toàn bằng Go:

| Kiểm tra | Kết quả |
|---|---|
| Migration | `version=3`, `dirty=false` |
| Demo seed | PASS |
| Platform validation + hashtag advisory | PASS |
| Concurrent submit | một 201, một 409, một attempt |
| Reject/resubmit/supersedes chain | PASS |
| Double approve | một 201, một 409 |
| Earning / ledger pair / approve audit | đúng 1 / 2 / 1 |
| Approval failure rollback | submission `SUBMITTED`, money/audit bằng 0 |
| VN gross/tax/net | `500000 / 50000 / 450000` |
| PH gross/tax/net | `100001 / 8000 / 92001` |
| Running ledger | PASS |
| `go test -count=1 ./...` | PASS |
| `go vet ./...` | PASS |

Database nghiệm thu đã được xóa sau test (`remaining=0`).

### Container

- Image local: `affiliate-api-go:week4`.
- Health, session, earnings dashboard và Ops content queue chạy được từ container.
- Runtime user: `nonroot:nonroot`.
- Container smoke tạm đã dừng/xóa.

### Regression oracle/frontend

| Bộ kiểm tra | Kết quả |
|---|---:|
| Root ESLint | PASS |
| API + web TypeScript typecheck | PASS |
| Nest oracle API | **105/105 PASS** |
| Playwright frontend E2E | **25/25 PASS** |

## 8. Gate cuối Tuần 4

- [x] Double approve đồng thời: một request thắng, một earning và một bộ ledger entry.
- [x] Reject/resubmit đúng attempt chain.
- [x] Tổng gross/tax/net đúng cho VND và PHP.

## 9. Ranh giới bàn giao

Còn **11/36 operation** thuộc Reconciliation, Wallet/OTP và Payout sẽ được port trong Tuần 5.
NestJS vẫn là oracle; frontend chưa đổi API base và production traffic chưa cutover.
