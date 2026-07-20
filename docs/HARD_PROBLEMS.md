# HARD_PROBLEMS — Bộ hỏi đáp mentor (7 bài toán khó + audit)

> Mục đích: mỗi bài toán = 1 mục, trả lời được bằng lời trong 60 giây, **có file:dòng code chứng
> minh**. Đọc kèm `docs/PRODUCT.md` (vì sao làm), `docs/DATA_MODEL.md` (bảng nào chống bug gì),
> `docs/ARCHITECTURE.md` (đường đi của lòng tin). Đường dẫn dòng đúng với code tại N19; nếu lệch,
> tin code — grep từ khóa trong ngoặc.

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
  - `apps/api/src/auth/rbac.ts` — `isStaffForCountry`/`assertStaffForCountry` (chỉ khớp khi
    `role.countryId === countryId`), `assertGlobalAdmin`.
  - `apps/api/src/kyc/kyc.service.ts:191` — case không thuộc nước Ops → `NotFoundException` (404).
  - `apps/api/src/content/content.service.ts:265` — submission nước khác → 404.
- **Test**: `apps/api/test/rbac.negative.test.ts` nhóm **A** (A1–A4): Ops/Finance PH đụng KYC/
  content/batch/payout của VN → **404**.

---

## 2. Tiền không dùng số thực (CP-06)

- **Mentor có thể hỏi**: "Vì sao không lưu tiền bằng `float`/`decimal` cho tiện?"
- **Vì sao khó**: `float` làm tròn nhị phân → sai 1 xu × chục nghìn giao dịch = lệch sổ, mất niềm
  tin. VN và PH lại khác số lẻ (VND không có xu, PHP có 2 chữ số thập phân).
- **Giải pháp**: lưu **minor units bằng `BigInt`** (VND: đồng; PHP: centavo) + `currency_code` +
  `currency_exponent` theo nước. Mọi phép tính là số nguyên; thuế **floor** bằng chia nguyên
  BigInt. Định dạng hiển thị theo `locale` chỉ ở tầng UI.
- **Chứng minh trong code**:
  - `apps/api/prisma/schema.prisma:156` — `currencyExponent` (SmallInt); các cột tiền là `BigInt`
    (`reward_minor`, `gross_minor`, `tax_minor`, `amount_minor`…).
  - `apps/api/src/content/content.service.ts:297` — `tax = (gross * BigInt(taxPercent)) / 100n`
    (số nguyên, floor — không có số thực nào chen vào).
  - `apps/web/src/lib/i18n.ts` — `formatMoney(minor, currency, locale)` chỉ định dạng lúc hiện.
  - Seed `apps/api/prisma/seed.sql` — VN: exponent 0 / thuế 10% / tối thiểu 200000; PH: exponent 2
    / thuế 8% / tối thiểu 50000.

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
  - `apps/api/src/content/content.service.ts:278` — claim `UPDATE content_submission ... WHERE
    state='SUBMITTED' RETURNING id`; dòng 288 → 409 nếu khớp 0 hàng.
  - `apps/api/src/content/content.service.ts:299` — earning `create` chỉ trong nhánh thắng claim.
  - `apps/api/prisma/schema.prisma:365` — `submissionId String @unique`.
- **Test**: `apps/api/test/*` — RACE 2 approve song song → đúng 1 earning; double-approve → 409 +
  vẫn 1 earning (xem log N11).

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
  - `apps/api/src/payout/payout.service.ts:313` — `applyProviderOutcome`; dòng 325 claim
    `UPDATE payout_request ... WHERE state=fromState`; dòng 347 `PAYOUT_RELEASE` chỉ khi FAIL.
  - `apps/api/src/payout/payout.service.ts:286` — `resolveHold` (đối soát tay UNKNOWN_HOLD).
  - `apps/api/prisma/schema.prisma:464` — `providerRef @unique`.
- **Test**: `apps/api/test/payout.smoke.test.ts` — FAIL hoàn 1 lần + số dư phục hồi + double 409;
  UNKNOWN giữ + không release + hiện ở holds; resolve SUCCESS/FAIL. `money-spine.test.ts` chạy cả
  spine VN + PH.

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
  - `apps/api/src/campaign/join.service.ts:98` — `joinSnapshot()` ghi `snapshotRewardMinor =
    campaign.rewardMinor` tại thời điểm join.
  - `apps/api/src/content/content.service.ts:293` — earning `gross = p.snapshotRewardMinor` (đọc
    snapshot, KHÔNG đọc campaign hiện tại).
  - `apps/api/prisma/schema.prisma:312` — cột `snapshot_*` trên participation.

---

## 6. Sổ cái append-only (bút toán đảo) (AD-06)

- **Mentor có thể hỏi**: "Ghi sai một bút toán tiền thì sửa thế nào?"
- **Vì sao khó**: `UPDATE`/`DELETE` bản ghi tiền = xoá dấu vết, không audit được, dễ gian lận.
- **Giải pháp**: `ledger_entry` **chỉ CREATE** — không bao giờ sửa/xoá. Sửa sai = ghi **bút toán
  đảo** (`REVERSAL`) có link về bản gốc. Số dư = **tổng** các bút toán (tính lại từ sổ, không lưu
  một con số có thể lệch). `UNIQUE(ref_type, ref_id, entry_type)` đảm bảo 1 sự kiện không ghi sổ 2
  lần (chống double-pay ở tầng DB).
- **Chứng minh trong code**:
  - `apps/api/src/ledger/ledger.service.ts:63` — `post()` chỉ gọi `create` (append-only), luôn
    nhận `tx` để ghi trong cùng transaction hành động.
  - `apps/api/prisma/schema.prisma:404` — `@@unique([refType, refId, entryType])`.
  - `apps/api/src/ledger/ledger.service.ts:114` — `view()` tính số dư luỹ kế từ chuỗi bút toán.
- **Điểm hiểu-sâu**: PENDING→AVAILABLE lúc khoá batch **không** ghi sổ — đó là cổng quy trình, net
  đã accrue vào sổ lúc duyệt; sổ chỉ ghi *sự kiện tiền* (xem `reconciliation.service.ts` lockBatch).

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
  - `apps/api/src/reconciliation/reconciliation.service.ts:199` — claim khoá batch → dòng 205 409
    `BATCH_ALREADY_LOCKED` (LOCKED là bất biến).
  - `apps/api/src/campaign/join.service.ts:164` — `SELECT ... FOR UPDATE` serial-hóa join;
    `schema.prisma:327` `@@unique([profileId, campaignId])` chống giữ 2 suất.
  - `row_version` (`schema.prisma:320,348`) làm version check cho các transition khác.
- **Test**: `apps/api/test/rbac.negative.test.ts` nhóm **C** (C1–C3): double review/lock/settle →
  409; RACE 3 người tranh 1 suất → 1 JOINED + 2 WAITLISTED (xem log N10/N10b).

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
  - `apps/api/src/audit/audit.service.ts:64` — `record()` chỉ `auditEvent.create` trên `client`
    truyền vào (là `tx`).
  - Điểm nối, mỗi cái trong transaction hành động: `content.service.ts` (trong tx claim),
    `reconciliation.service.ts` (createBatch/lockBatch), `payout.service.ts` (`applyProviderOutcome`),
    `kyc.service.ts` + `campaign.service.ts` (bọc hành động vào `$transaction`).
  - `apps/api/src/audit/audit.controller.ts` — `GET /admin/audit` (chỉ GLOBAL_ADMIN).
- **Test (mạnh nhất)**: `apps/api/test/audit.test.ts` — "a rolled-back decision leaves NO audit":
  double-approve lần 2 trả **409** và **không** để lại vết audit thứ 2 → chứng minh audit ATOMIC
  với quyết định.

---

## Kịch bản demo 15 phút (bám tài khoản demo trong README)

Chuẩn bị: `corepack pnpm bootstrap` → `dev:api` + `dev:web` → mở `http://localhost:3000/mockup`.
Đăng nhập bằng mock SSO (nút "đăng nhập vai …" trên từng màn). Domain `@demo.affiliate.gl`.

| # | Bước | Màn | Nói gì (bài toán chứng minh) |
|---|---|---|---|
| 1 | Đăng nhập creator email mới, chọn **VN** | V01→V02 | 1 tài khoản, hồ sơ riêng từng nước (#1) |
| 2 | Nộp KYC → đăng nhập `ops.vn@` duyệt theo field | V03/V10 | Duyệt từng trường; nộp lại chỉ sửa field bị từ chối |
| 3 | Join 1 campaign VN | V04→V05 | **Snapshot điều khoản** lúc join (#5); KYC-gate |
| 4 | Nộp content link | V06 | Sai nền tảng chặn sớm; mỗi lần nộp = 1 attempt |
| 5 | `ops.vn@` duyệt content | V10 | **Claim → earning exactly-once** (#3); thử double-click thấy 409 |
| 6 | Xem thu nhập + **sổ cái** | V07 | Gross–Thuế–Net (#2); sổ **append-only** số dư luỹ kế (#6) |
| 7 | `finance.vn@` tạo batch → khoá | V12 | Batch **immutable** (#7); PENDING→AVAILABLE |
| 8 | Creator rút tiền (OTP + reserve) | V08 | Reserve trong transaction, không rút vượt |
| 9 | `finance.vn@` settle: thử **FAIL** rồi 1 lệnh khác **UNKNOWN** | V12 | **Payout 3 kết cục** (#4): FAIL hoàn 1 lần, UNKNOWN giữ chờ đối soát |
| 10 | `global.admin@` xem nhật ký | V13 | **Audit atomic** mọi quyết định (#8); lọc VN/PH |
| 11 | (Tùy) đổi **PH** + công tắc **EN** + **$USD** | mọi màn | Cùng bộ code chạy nước khác tiền tệ/thuế; i18n + USD tham chiếu |

Câu chốt khi demo: *"Mọi chỗ 'đúng 1 lần' đều có DB làm trọng tài (UNIQUE + claim), không chỉ tin
logic ứng dụng — nên dưới double-click hay chạy song song vẫn không nhân đôi tiền."*
