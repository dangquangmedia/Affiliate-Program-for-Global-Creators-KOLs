# HARD_PROBLEMS — Bộ hỏi đáp mentor (7 bài toán khó + audit)

> Mục đích: mỗi bài toán = 1 mục, trả lời được bằng lời trong 60 giây, **có file:dòng code chứng
> minh**. Đọc kèm `docs/PRODUCT.md` (vì sao làm), `docs/DATA_MODEL.md` (bảng nào chống bug gì),
> `docs/ARCHITECTURE.md` (đường đi của lòng tin). Backend thật là **Go** (`apps/api-go`) — mọi
> file:dòng dưới đây trỏ vào Go, cập nhật sau khi port xong Tuần 6 (22/07/2026). NestJS
> (`apps/api`) giữ làm oracle lịch sử, cùng logic/bất biến, không xoá. Nếu lệch, tin code — grep
> từ khóa trong ngoặc.

Nguyên tắc chung xuyên suốt (nói 1 lần, áp cho mọi bài): **server không tin client**. Route `/vn`
`/ph` chỉ là *ý định*; danh tính/vai/nước lấy từ **session**, không từ URL/body. Mọi chỗ "đúng 1
lần" đều dựa vào **DB là trọng tài cuối** (UNIQUE constraint) chứ không chỉ tin logic ứng dụng.

---

## 1. Cách ly dữ liệu theo quốc gia (CP-02)

- **Mentor có thể hỏi**: "Ops Việt Nam mở hồ sơ KYC của Philippines bằng cách gõ thẳng ID vào URL
  thì sao?"
- **Vì sao khó**: nếu tin `country` từ route/body, chỉ cần đổi URL là rò dữ liệu xuyên nước — sai
  về pháp lý (dữ liệu định danh) lẫn nghiệp vụ.
- **Giải pháp**: vai + phạm vi nước lấy từ `role_assignment` gắn **session**; mọi service kiểm
  `staff thuộc ĐÚNG nước` trước khi thao tác; tài nguyên không thuộc nước của phiên trả **404**
  (không lộ tồn tại), sai vai trả **403**. `GLOBAL_ADMIN` là vai duy nhất `country_id = NULL` được
  vượt biên giới (chỉ để xem audit).
- **Chứng minh trong code**:
  - `apps/api-go/internal/auth/rbac.go:9,27` — `IsStaffForCountry`/`AssertStaffForCountry` (chỉ
    khớp khi role gắn đúng `countryID`).
  - `apps/api-go/internal/kyc/service.go:234-237` — case không thuộc nước Ops → 404
    `RESOURCE_NOT_FOUND`.
  - `apps/api-go/internal/content/service.go:316-321` — submission nước khác → 404 (query
    `GetSubmissionForReviewCountry` đã scope theo `country_id`, `db/queries/content.sql:71-80`).
- **Test**: `apps/api/test/rbac.negative.test.ts` nhóm **A** (A1–A4), chạy qua Go bằng harness
  `apps/api/test/go-api-harness.ts`: Ops/Finance PH đụng KYC/content/batch/payout của VN →
  **404**.

---

## 2. Tiền không dùng số thực (CP-06)

- **Mentor có thể hỏi**: "Vì sao không lưu tiền bằng `float`/`decimal` cho tiện?"
- **Vì sao khó**: `float` làm tròn nhị phân → sai 1 xu × chục nghìn giao dịch = lệch sổ, mất niềm
  tin. VN và PH lại khác số lẻ (VND không có xu, PHP có 2 chữ số thập phân).
- **Giải pháp**: lưu **minor units bằng `BigInt`** (VND: đồng; PHP: centavo) + `currency_code` +
  `currency_exponent` theo nước. Mọi phép tính là số nguyên; thuế **floor** bằng chia nguyên
  BigInt. Định dạng hiển thị theo `locale` chỉ ở tầng UI.
- **Chứng minh trong code**:
  - `apps/api-go/db/migrations/000001_init_lean_schema.up.sql:64` — `currency_exponent SMALLINT`
    trên bảng `country`; các cột tiền là `BIGINT` (`reward_minor`, `gross_minor`, `tax_minor`,
    `amount_minor`…).
  - `apps/api-go/internal/content/service.go:263-269` — `calculateTax(gross int64, percent
    int32) int64` — chia nguyên floor (`(gross/100)*pct + ((gross%100)*pct)/100`), gọi tại dòng
    353; không có số thực nào chen vào.
  - `apps/web/src/lib/i18n.ts` — `formatMoney(minor, currency, locale)` chỉ định dạng lúc hiện.
  - Seed `apps/api-go/db/seed/reference.sql` — VN: exponent 0 / thuế 10% / tối thiểu 200000; PH:
    exponent 2 / thuế 8% / tối thiểu 50000.

---

## 3. Earning tạo đúng một lần (AD-03 / CR-07)

- **Mentor có thể hỏi**: "Ops double-click Approve, hoặc 2 Ops cùng bấm — có tạo 2 khoản thu nhập
  không?"
- **Vì sao khó**: đây là chỗ tiền *ra đời*. Trùng = trả gấp đôi. Không thể chỉ tin `if đã duyệt` ở
  tầng ứng dụng vì 2 request chạy song song đọc cùng trạng thái cũ.
- **Giải pháp**: 2 lớp. (a) **Claim** bằng `UPDATE ... WHERE state='SUBMITTED'` trong transaction:
  chỉ 1 người đổi được trạng thái, người đến sau khớp 0 hàng → **409 ALREADY_REVIEWED**, không chạy
  tiếp. (b) Earning chỉ được tạo bởi người thắng claim; và **`UNIQUE(earning.submission_id)`** là
  chốt chặn cuối trong DB — kể cả logic sai cũng không thể có 2 earning cho 1 submission.
- **Chứng minh trong code**:
  - `apps/api-go/db/queries/content.sql:82-93` — `ClaimContentReview`: `UPDATE content_submission
    SET ... WHERE id=$1 AND state='SUBMITTED' RETURNING *`.
  - `apps/api-go/internal/content/service.go:331-339` — `pgx.ErrNoRows` trên claim → 409
    `ALREADY_REVIEWED`; earning chỉ được tạo trong nhánh APPROVE thắng claim (dòng 341-374).
  - `apps/api-go/db/migrations/000001_init_lean_schema.up.sql:370` — `UNIQUE INDEX
    earning_submission_id_key ON earning(submission_id)`.
- **Test**: `apps/api-go/integration/week4_test.go` — RACE 2 approve song song → đúng 1
  earning/ledger/audit; double-approve → 409 + vẫn 1 earning.

---

## 4. Payout ba kết cục (AD-07 / CR-08)

- **Mentor có thể hỏi**: "Provider trả về timeout/không rõ — bạn hoàn tiền cho creator luôn chứ?"
- **Vì sao khó**: nếu **UNKNOWN mà vội hoàn** → creator rút lại, nhưng provider thật ra ĐÃ chuyển →
  **trả 2 lần**. Nếu **FAIL mà không hoàn** → creator mất tiền oan. Phải phân biệt 3 kết cục.
- **Giải pháp**: máy trạng thái 3 ngả, mỗi lần xử lý là 1 **claim** `WHERE state=fromState`
  (chống xử lý 2 lần → 409):
  - `SUCCESS` → `PAID` (reserve đã trừ, số dư không đổi).
  - `FAIL` (provider xác nhận KHÔNG chuyển) → `FAILED_RELEASED` + ghi sổ `PAYOUT_RELEASE +amount`
    **hoàn đúng 1 lần**; muốn rút lại phải tạo lệnh MỚI.
  - `UNKNOWN` → `UNKNOWN_HOLD`: **giữ tiền, không hoàn**; Finance đối soát tay với sao kê rồi
    `resolveHold` kết luận. Mỗi lần gọi provider = 1 `payout_attempt` với `provider_ref` khác nhau
    (UNIQUE) → callback/retry idempotent.
- **Chứng minh trong code**:
  - `apps/api-go/internal/payout/service.go:328-400` — `applyOutcome` (tương đương
    `applyProviderOutcome`), gọi từ `Settle` (320-322) và `Resolve` (324-326, tương đương
    `resolveHold`).
  - `apps/api-go/db/queries/payout.sql:68-72` — `ClaimPayoutState`: `UPDATE payout_request ...
    WHERE id=$1 AND state=$2`; `internal/payout/service.go:362-368` — 0 hàng → 409 (`NOT_ON_HOLD`
    khi resolve).
  - `apps/api-go/internal/payout/service.go:380-388` — ghi `PAYOUT_RELEASE` chỉ khi `result ==
    "FAIL"`.
  - `apps/api-go/db/migrations/000001_init_lean_schema.up.sql:394` — `UNIQUE INDEX
    payout_attempt_provider_ref_key ON payout_attempt(provider_ref)`.
- **Test**: `apps/api/test/payout.smoke.test.ts` (chạy trên Go qua harness) — FAIL hoàn 1 lần +
  số dư phục hồi + double 409; UNKNOWN giữ + không release + hiện ở holds; resolve SUCCESS/FAIL.
  `money-spine.test.ts` chạy cả spine VN + PH trên Go.

---

## 5. Snapshot điều khoản lúc Join (CR-05)

- **Mentor có thể hỏi**: "Admin sửa % hoa hồng sau khi creator đã tham gia — earning cũ tính theo
  giá nào?"
- **Vì sao khó**: nếu earning tính theo campaign *hiện tại*, một lần sửa giá sẽ hồi tố toàn bộ
  người đã tham gia → sai cam kết, vỡ ngân sách.
- **Giải pháp**: lúc GIỮ SUẤT (join mới hoặc được đôn từ waitlist) **copy điều khoản vào
  participation** (`snapshot_reward_minor`, `snapshot_currency`, trigger/pricing). Earning tính từ
  **snapshot**, không đọc lại campaign. Admin sửa giá về sau chỉ ảnh hưởng người join SAU đó.
- **Chứng minh trong code**:
  - `apps/api-go/internal/campaign/join.go:111-121,234-244` — `Join()` ghi `SnapshotRewardMinor`/
    `SnapshotCurrency`/`SnapshotTriggerType`/`SnapshotPricingType` vào participation tại thời
    điểm join (không có hàm `joinSnapshot()` riêng — logic inline trong `Join`).
  - `apps/api-go/internal/content/service.go:342-345` — earning `gross =
    submission.SnapshotRewardMinor` (đọc snapshot qua `GetSubmissionForReviewCountry`, KHÔNG đọc
    campaign hiện tại).
  - `apps/api-go/db/migrations/000001_init_lean_schema.up.sql:181-182` — cột `snapshot_*` trên
    participation.

---

## 6. Sổ cái append-only (bút toán đảo) (AD-06)

- **Mentor có thể hỏi**: "Ghi sai một bút toán tiền thì sửa thế nào?"
- **Vì sao khó**: `UPDATE`/`DELETE` bản ghi tiền = xoá dấu vết, không audit được, dễ gian lận.
- **Giải pháp**: `ledger_entry` **chỉ CREATE** — không bao giờ sửa/xoá. Sửa sai = ghi **bút toán
  đảo** (`REVERSAL`) có link về bản gốc. Số dư = **tổng** các bút toán (tính lại từ sổ, không lưu
  một con số có thể lệch). `UNIQUE(ref_type, ref_id, entry_type)` đảm bảo 1 sự kiện không ghi sổ 2
  lần (chống double-pay ở tầng DB).
- **Chứng minh trong code**:
  - `apps/api-go/internal/content/service.go:271-287` (`postLedger`) và
    `internal/payout/service.go:248-254,381-388` — chỉ gọi `CreateLedgerEntry` (append-only,
    trong cùng transaction hành động qua `queries` truyền vào); SQL insert-only tại
    `db/queries/content.sql:103-109` (không có query UPDATE/DELETE nào cho `ledger_entry`).
  - `apps/api-go/db/migrations/000001_init_lean_schema.up.sql:379` — `UNIQUE INDEX
    ledger_entry_ref_type_ref_id_entry_type_key ON ledger_entry(ref_type, ref_id, entry_type)`.
  - `apps/api-go/internal/earnings/service.go:132-144` — tính số dư luỹ kế
    (`running += row.AmountMinor`) từ chuỗi bút toán, không lưu một con số rời có thể lệch.
- **Điểm hiểu-sâu**: PENDING→AVAILABLE lúc khoá batch **không** ghi sổ — đó là cổng quy trình, net
  đã accrue vào sổ lúc duyệt; sổ chỉ ghi *sự kiện tiền* (xem `internal/reconciliation/service.go`
  hàm lock batch).

---

## 7. Máy trạng thái & xung đột đồng thời (409) (AD-06 / concurrency)

- **Mentor có thể hỏi**: "Hai người cùng khoá 1 batch, hoặc tranh 1 suất cuối — hệ thống xử sao?"
- **Vì sao khó**: đọc-rồi-ghi ngây thơ dưới tải song song sẽ oversell suất, khoá 2 lần, hoặc cho
  phép chuyển trạng thái không hợp lệ.
- **Giải pháp**: hai kỹ thuật.
  - **Claim có điều kiện** `UPDATE ... WHERE state=<kỳ vọng>`: người đến sau khớp 0 hàng → **409**.
    Dùng cho khoá batch, settle payout, duyệt content.
  - **Khóa hàng `SELECT ... FOR UPDATE`** để serial-hóa khi tranh suất: đếm suất + tạo participation
    trong khóa → **không oversell** (kèm `UNIQUE(profile, campaign)`); hết suất → vào waitlist FCFS.
- **Chứng minh trong code**:
  - `apps/api-go/db/queries/reconciliation.sql:73-77` — `ClaimReconciliationBatchLock`: `UPDATE
    reconciliation_batch SET status='LOCKED', ... WHERE id=$1 AND status='OPEN' RETURNING *`;
    `internal/reconciliation/service.go:222-226` — 0 hàng → 409 `BATCH_ALREADY_LOCKED`.
  - `apps/api-go/db/queries/join.sql:1-17` — `LockCampaignForJoin` (`... FOR UPDATE OF c`), gọi
    tại `internal/campaign/join.go:169`; `UNIQUE INDEX
    participation_profile_id_campaign_id_key` chống giữ 2 suất
    (`db/migrations/000001_init_lean_schema.up.sql:364`).
  - Go dùng **conditional claim `WHERE state=X`** cho mọi transition khác (không dùng
    `row_version` làm predicate optimistic-lock, dù cột này tồn tại và được tăng để ghi log):
    `ClaimContentReview` (`content.sql:92`), `ClaimPayoutState` (`payout.sql:71`),
    `ClaimReconciliationBatchLock` (`reconciliation.sql:76`) — cùng một kỹ thuật, nhất quán trên
    toàn bộ 4 điểm race bắt buộc.
- **Test**: `apps/api/test/rbac.negative.test.ts` nhóm **C** (C1–C3, chạy trên Go qua harness):
  double review/lock/settle → 409; RACE 3 người tranh 1 suất → 1 JOINED + 2 WAITLISTED
  (`apps/api-go/integration/week3_test.go`).

---

## 8. Audit trail append-only, atomic với quyết định (AD-02)

- **Mentor có thể hỏi**: "Làm sao biết ai đã duyệt/từ chối/chi trả cái gì? Nếu hành động lỗi giữa
  chừng thì vết audit có bị lệch không?"
- **Vì sao khó**: nếu ghi audit ở một bước riêng, có thể xảy ra (a) hành động thành công nhưng
  audit trượt → mất dấu, hoặc (b) audit ghi rồi hành động rollback → dấu ma cho việc chưa từng xảy
  ra.
- **Giải pháp**: `AuditService.record(client, …)` nhận **`client` = transaction của hành động** →
  vết audit + quyết định **cùng commit hoặc cùng rollback**. Append-only như sổ cái. Nối vào **cả 5
  điểm quyết định staff**: KYC review, content approve/reject, reconcile create/lock, payout
  settle/resolve, campaign create. Chỉ `GLOBAL_ADMIN` đọc nhật ký toàn cục.
- **Chứng minh trong code**:
  - `apps/api-go/internal/audit/service.go:47-78` — `Record(ctx, queries, input)` nhận
    `*sqlcgen.Queries` của transaction gọi vào (`CreateAuditEvent` dòng 70-76), tự thân không tự
    mở transaction riêng.
  - Điểm nối, mỗi cái trong cùng `WithinTx` với hành động: KYC review
    (`internal/kyc/service.go:233…278-283`), content approve/reject
    (`internal/content/service.go:315…389-394`), payout settle/resolve
    (`internal/payout/service.go:358…389-393`), reconciliation create/lock
    (`internal/reconciliation/service.go:129…153-157` và `216…231-235`), campaign create
    (`internal/campaign/service.go:234…251-257`).
  - `apps/api-go/internal/httpapi/week2.go:318-327` — route `GET /admin/audit`; enforcement tại
    `internal/audit/service.go:80-83` gọi `auth.AssertGlobalAdmin` (`internal/auth/rbac.go:34-48`).
- **Test (mạnh nhất)**: `apps/api/test/audit.test.ts` (chạy trên Go qua harness) — "a rolled-back
  decision leaves NO audit": double-approve lần 2 trả **409** và **không** để lại vết audit thứ 2
  → chứng minh audit ATOMIC với quyết định.

---

## Kịch bản demo 15 phút (bám tài khoản demo trong README)

Chuẩn bị: `corepack pnpm bootstrap` → `dev:api` + `dev:web` → mở `http://localhost:3000/portal`
(UI thật, không phải mockup). Vào từng vai bằng thẻ chọn vai ở landing (mock SSO, domain
`@demo.affiliate.gl`); nút **"Đổi vai"** cuối rail đưa về `/portal` để đổi sang vai khác.

| # | Bước | Dashboard `/portal` | Nói gì (bài toán chứng minh) |
|---|---|---|---|
| 1 | Vào **Creator**, chọn **VN** | `/portal/creator` | 1 tài khoản, hồ sơ riêng từng nước (#1) |
| 2 | Nộp KYC → đổi vai **Local Ops** duyệt theo field | `creator` → `ops` | Duyệt từng trường; nộp lại chỉ sửa field bị từ chối |
| 3 | Join 1 campaign VN | `/portal/creator` | **Snapshot điều khoản** lúc join (#5); KYC-gate |
| 4 | Nộp content link | `/portal/creator` | Sai nền tảng chặn sớm; mỗi lần nộp = 1 attempt |
| 5 | **Local Ops** duyệt content | `/portal/ops` | **Claim → earning exactly-once** (#3); thử double-click thấy 409 |
| 6 | Xem thu nhập + **sổ cái** | `/portal/creator` | Gross–Thuế–Net (#2); sổ **append-only** số dư luỹ kế (#6) |
| 7 | **Local Finance** tạo batch → khoá | `/portal/finance` | Batch **immutable** (#7); PENDING→AVAILABLE |
| 8 | Creator rút tiền (OTP + reserve) | `/portal/creator` | Reserve trong transaction, không rút vượt |
| 9 | **Local Finance** settle: thử **FAIL** rồi 1 lệnh khác **UNKNOWN** | `/portal/finance` | **Payout 3 kết cục** (#4): FAIL hoàn 1 lần, UNKNOWN giữ chờ đối soát |
| 10 | **Global Admin** xem nhật ký | `/portal/global` | **Audit atomic** mọi quyết định (#8); lọc VN/PH |
| 11 | (Tùy) đổi **PH** + bật **$USD** | mọi dashboard | Cùng bộ code chạy nước khác tiền tệ/thuế; USD tham chiếu |

Câu chốt khi demo: *"Mọi chỗ 'đúng 1 lần' đều có DB làm trọng tài (UNIQUE + claim), không chỉ tin
logic ứng dụng — nên dưới double-click hay chạy song song vẫn không nhân đôi tiền."*
