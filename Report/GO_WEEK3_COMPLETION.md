# BÁO CÁO HOÀN TẤT TUẦN 3 — GO BACKEND REWRITE

> Dự án: Affiliate GLOBAL  
> Ngày kiểm chứng: 22/07/2026  
> Kế hoạch đối chiếu: `Plan/GO_BACKEND_REWRITE_PLAN.md`  
> Kết luận: **PASS — hoàn tất toàn bộ phạm vi và 3/3 gate Tuần 3**

## 1. Phạm vi đã triển khai

Go API hiện phục vụ **20/36 HTTP operation**. Tuần 3 bổ sung ba operation:

- `POST /markets/:market/campaigns/:id/join`;
- `POST /markets/:market/campaigns/:id/leave`;
- `GET /me/country/:market/participations`.

Ngoài HTTP API, `cmd/reclaim` là process hữu hạn: kết nối PostgreSQL, chạy đúng một sweep rồi exit,
phù hợp làm Cloud Run Job.

## 2. Join race-safe và snapshot

- Creator bắt buộc có KYC `APPROVED`; thiếu KYC trả `409 KYC_REQUIRED` và không tăng slot.
- Transaction khóa đúng campaign/country bằng `SELECT ... FOR UPDATE` trước khi đọc sức chứa.
- `slots_taken` chỉ tăng trong cùng transaction tạo/cập nhật participation; unique
  `(profile_id, campaign_id)` giữ idempotency.
- Bấm Join lại khi đang `JOINED`, `CONTENT_SUBMITTED`, `APPROVED`, `REJECTED` hoặc `WAITLISTED`
  trả nguyên participation, không giữ thêm suất.
- Khi giữ suất, participation snapshot `reward_minor`, `currency`, `trigger_type`, `pricing_type`,
  đặt `joined_at` và hạn nộp 48 giờ.
- Campaign paused/ended/quá `ends_at` trả `409 CAMPAIGN_NOT_JOINABLE`.

## 3. Waitlist và FCFS promotion

- Campaign đầy tạo/cập nhật participation `WAITLISTED`; snapshot và deadline để `NULL` vì chưa giữ
  điều khoản/suất.
- Timestamp hàng chờ được cấp trong campaign lock, tăng tối thiểu 1 ms so với người cuối. Cách này
  tránh hòa timestamp do cột PostgreSQL có precision millisecond và cho vị trí FCFS nghiêm ngặt.
- Leave khỏi waitlist chỉ chuyển `LEFT`, không sửa slot counter.
- Leave khi đang giữ suất giảm `slots_taken`, sau đó đôn đúng người `WAITLISTED` sớm nhất trong cùng
  transaction. Người được đôn nhận snapshot hiện tại và deadline 48 giờ mới.
- Participation `APPROVED` không được leave (`409 ALREADY_DELIVERED`).

## 4. Deadline, strike và reclaim

- Sweep chọn `JOINED` quá `submit_deadline_at` hoặc `REJECTED` quá `fix_deadline_at`.
- Mỗi candidate được re-check sau khi khóa campaign; stale candidate do submit/leave đồng thời sẽ
  không bị thu hồi nhầm.
- Thu hồi chuyển `EXPIRED`, tăng `strike_count`, giảm slot và promote FCFS trong một transaction.
- Sau hai lần bị thu hồi trên cùng campaign, rejoin trả `409 JOIN_BLOCKED_STRIKE`.
- Hai job/sweep nhìn cùng candidate an toàn: lần đầu thay state; lần sau re-check thấy không còn quá
  hạn ở state hợp lệ nên không tạo side effect.

## 5. Typed SQL và cấu trúc triển khai

- Query nguồn: `apps/api-go/db/queries/join.sql`; generated code:
  `apps/api-go/internal/store/sqlcgen/join.sql.go`.
- Business logic: `apps/api-go/internal/campaign/join.go`.
- HTTP adapter: ba route được nối tại `apps/api-go/internal/httpapi/week2.go`.
- Cloud Run Job entrypoint: `apps/api-go/cmd/reclaim/main.go`.
- Docker image chứa đủ `/app/api`, `/app/migrate`, `/app/seed`, `/app/reclaim`; runtime vẫn là
  `nonroot:nonroot`.
- Acceptance: `apps/api-go/integration/week3_test.go`.

## 6. Bằng chứng kiểm thử

### Go trên database sạch

Database synthetic `affiliate_go_week3` được tạo mới rồi chạy hoàn toàn bằng Go:

| Kiểm tra | Kết quả |
|---|---|
| Migration | `version=3`, `dirty=false` |
| Demo seed | PASS |
| KYC gate | PASS |
| Race 3 creator / 1 slot | đúng 1 `JOINED`, 2 `WAITLISTED` vị trí 1–2, `slots_taken=1` |
| Snapshot reward/currency/trigger/pricing | PASS |
| Join idempotency | PASS |
| Leave promote hai người liên tiếp theo FCFS | PASS |
| Submit deadline reclaim + promote | PASS |
| Fix deadline reclaim | PASS |
| Strike lần 2 chặn rejoin | PASS |
| Sweep lần hai | `reclaimed=0`, `promoted=0` |
| `go test -count=1 ./...` | PASS |
| `go vet ./...` | PASS |

### Container

- Image local: `affiliate-api-go:week3`.
- Health, login token 64 ký tự và campaign list chạy được từ container.
- Image chạy bằng `nonroot:nonroot`.
- Override entrypoint `/app/reclaim` chạy hai lần và đều exit 0; kết quả lần hai không có side effect.

### Regression oracle/frontend

| Bộ kiểm tra | Kết quả |
|---|---:|
| Root ESLint | PASS |
| API + web TypeScript typecheck | PASS |
| Nest oracle API | **105/105 PASS** |
| Playwright frontend E2E | **25/25 PASS** |

## 7. Gate cuối Tuần 3

- [x] Ba creator tranh slot cuối: đúng 1 `JOINED`, 2 `WAITLISTED`, không oversell.
- [x] Leave và reclaim promote đúng người sớm nhất.
- [x] Chạy sweep/job hai lần không tạo side effect sai.

## 8. Ranh giới bàn giao

Còn **16/36 operation** thuộc Content, Earnings/Ledger, Reconciliation và Payout sẽ được port trong
Tuần 4–5. NestJS vẫn là oracle; chưa đổi frontend API base và chưa cutover traffic.
