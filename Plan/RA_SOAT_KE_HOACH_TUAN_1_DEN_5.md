# RÀ SOÁT TÍNH NHẤT QUÁN KẾ HOẠCH TUẦN 1–5

> Dự án: Affiliate GLOBAL  
> Phạm vi rà soát: kế hoạch tổng, kế hoạch chi tiết Tuần 1–5, CPS/P0b, 22 Must, dependency, capacity, terminology và release gate  
> Trạng thái tại thời điểm rà soát: chỉ hoàn thành tài liệu kế hoạch; chưa có implementation/test/seed/release evidence  
> Workbook hiện có: `Plan/docs/Book1.xlsx`

## 1. Kết luận chịu trách nhiệm đầu ra

Sau các chỉnh sửa trong đợt rà soát này, kế hoạch **khớp về dependency và có thể dùng làm execution blueprint cho một MVP 5 tuần**, với các kết luận sau:

1. **Đủ đúng 22 Must:** 7 Core Platform + 7 Admin + 8 Creator; không thiếu requirement ID.
2. **Chuỗi end-to-end không đứt:** Product → Offer → Campaign → Join → Tracking/Content → Commercial Pending Earning → Financialized Earning/Ledger → Reconciliation → Available → Payout.
3. **CPS đã được đặt đúng vai trò:** business label CPS = `PAID_ORDER + SALE_PERCENT`, là P0b; core release dùng `CONTENT_APPROVED + CONTENT_FLAT` và không phụ thuộc CPS.
4. **Hai product chạy sâu dùng cùng core:** VN Beauty và PH SaaS đều chạy `CONTENT_FLAT`; recurring/CPL/CPI/booking/promo-code chỉ modeled/disabled.
5. **Security, i18n và audit được đóng xuyên tuần:** foundation ở Tuần 2, áp dụng cho module Tuần 3–4, final regression/evidence ở Tuần 5.
6. **Money semantics đã thống nhất:** confirmed pre-payment failure release reserve; timeout/UNKNOWN giữ reserve; refund sau success là linked reversal.
7. **Tuần 5 đúng là release sprint:** G21–G25 hardening/evidence/setup/RC/demo; Feature Freeze cuối Ngày 22; không mở lại P0b/P1.

Kế hoạch vẫn **không thể được gọi là production-ready**. Nó chỉ cam kết local MVP cho VN/PH với provider/tax/FX/eKYC/payment synthetic/mock và một canonical extension model.

### Giới hạn của lần rà soát này

Phiên hiện tại không có Codex Excel session kết nối, nên không thể lặp lại việc đọc từng ô workbook bằng công cụ Excel chuẩn. Phần requirement audit dùng baseline 22 Must đã được trích vào kế hoạch tổng/các kế hoạch chi tiết và các acceptance gap đã được phát hiện trong quá trình đối chiếu. Nếu `Plan/docs/Book1.xlsx` thay đổi sau lần trích baseline, `W1-D1-T03` phải re-diff workbook → RTM trước khi freeze scope.

## 2. Chuỗi dependency xuyên năm tuần

| Tuần | Entry Gate | Kết quả bắt buộc | Handoff chính | Kết luận |
|---|---|---|---|---|
| 1 | G0 baseline | Scope/RTM/mockup/state/permission/ERD/API + walking skeleton | G5: Auth/Country/KYC contract + runnable Web/API/DB | Khớp; không báo business feature Done sớm |
| 2 | G5 | Identity, Country Profile, RBAC/RLS/Audit/i18n/KYC E2E | G10: secure profile/KYC foundation cho Campaign | Khớp; CP-02/CP-05/AD-02 chủ ý còn IN_PROGRESS |
| 3 | G10 | Product/Offer/Campaign → Join → Content → Commercial Pending Earning | G15: trustworthy source, snapshot, budget và exactly-once | Khớp sau khi làm rõ financialization handoff |
| 4 | G15 | Money/Ledger → Earnings → Reconciliation → Payout | G20: money/security/provider lifecycle Green | Khớp; P0b default CUT, UNKNOWN semantics an toàn |
| 5 | G20 | Full regression/NFR/docs/clean release/evidence/demo | G25: signed release hoặc NO-GO thật | Khớp; không mở core feature sau G22 |

Canonical gate chain:

~~~text
G0 → G1 → G2 → G3 → G4 → G5
   → G6 → G7 → G8 → G9 → G10
   → G11 → G12 → G13 → G14 → G15
   → G16 → G17 → G18 → G19 → G20
   → G21 → G22 → G23 → G24 → G25
~~~

Không tuần nào được tự coi upstream gate là Green chỉ vì tài liệu đã tồn tại. Gate cần implementation/evidence thật khi bước vào execution.

## 3. Audit CPS/SALE_PERCENT xuyên tuần

### 3.1. Canonical mapping đã khóa

| Business label | conversion_goal | reward_strategy | Phase 1 status |
|---|---|---|---|
| Approved content flat reward | `CONTENT_APPROVED` | `CONTENT_FLAT` | P0 executable |
| CPS | `PAID_ORDER` | `SALE_PERCENT` | P0b, chỉ khi G17 Green |
| CPL | `QUALIFIED_LEAD` | `LEAD_FLAT` hoặc future strategy | Modeled-only |
| CPI | `APP_INSTALL`/`APP_ACTIVATED` | `INSTALL_FLAT` | Modeled-only |
| Recurring | `SUBSCRIPTION_*` | `RECURRING_*` | Modeled-only |
| Booking/promo-code | future goal | future strategy | Modeled-only |

`CPS` không phải tên enum. Điều này tránh việc code dùng lẫn CPS, Percentage, SALE_PERCENT và Paid Order như bốn concept khác nhau.

### 3.2. Trạng thái theo tuần

| Tuần | CPS/P0b được phép làm gì | Không được làm |
|---|---|---|
| 1 | Thiết kế capability/source/business key; mockup/design-only prototype | Đưa CPS vào primary flow hoặc viết execution path |
| 2 | Không làm CPS; chỉ country/provider/config foundation | Để credential/provider chặn core |
| 3 | Seed Offer Draft `PAID_ORDER + SALE_PERCENT`; activation guard explicit | Activate/fallback sang flat hoặc gọi là đã cover CPS runtime |
| 4 | Chỉ G17 all-Green mới enable campaign P0b riêng, mock ingest/dedupe/calculate/commit | Dùng time D18–D20, phá Money/Ledger hoặc biến G20 phụ thuộc CPS |
| 5 | Nếu DONE thì regression; nếu CUT thì test capability disabled và dùng core exactly-once alternatives | Mở lại, viết nốt hoặc bắt demo phụ thuộc conversion |

### 3.3. Hai business key không được trộn

~~~text
CONTENT_FLAT:
participation_id + content_root/deliverable_key + reward_snapshot_id

CONVERSION P0b:
provider + external_event_id + reward_snapshot_id
~~~

Cả hai phải liên kết Participation, Offer/Reward snapshot, country và partner. Constraint “one rewarded deliverable per participation” chỉ áp dụng content P0; không được dùng để chặn nhiều conversion hợp lệ trong mô hình tương lai.

### 3.4. Hai budget semantics khác nhau

~~~text
CONTENT_FLAT P0:
Join → reserve max flat liability
Approve → reserved → committed + Pending Earning

SALE_PERCENT P0b:
Join → snapshot rate/cap; không biết amount nên không reserve variable commission
Conversion ingest → exact calculation → atomic cap check/commit → Pending Earning
~~~

Nếu P0b thiếu budget, event phải `HELD/BUDGET_ANOMALY` hoặc deny rõ; không tạo Earning vượt cap.

### 3.5. Kết luận CPS matching

`MATCH` sau chỉnh sửa. P0b có điểm vào, capability flag, source key, budget semantics, Money/Ledger adapter, test branch và cut branch riêng. P0b không phải Must và không chặn release.

## 4. Audit chuỗi nghiệp vụ end-to-end

| Handoff | Source truth | Downstream contract | Kết quả |
|---|---|---|---|
| Product → Offer | Catalog/product identity | Country/currency/commercial terms/version | Khớp |
| Offer → Campaign | Reward/terms capability | Country, dates, localization, capacity, budget | Khớp |
| Campaign → Join | Active/eligible/cap available | Participation + immutable snapshot + flat liability reserve | Khớp |
| Join → Tracking | Participation | One opaque asset/type/participation, no PII | Khớp |
| Tracking/Join → Content | Requirements/snapshot | Content root + immutable versions + review state | Khớp |
| Content → Commercial Pending Earning | Final Approve | Approved + reserved→committed + Earning + audit atomic | Khớp |
| Commercial Pending → Official PENDING | G16 financialization | Tax/reference-FX snapshot + Gross/Tax/Net + initial Journal | Đã làm rõ |
| Earning/Ledger → Reconciliation | Financialized pending source | Batch/anomaly/approve/lock/frozen export | Khớp |
| Reconciliation → Available | Locked eligible line | Ledger reclass + available projection | Khớp |
| Available → Payout | Ledger-derived balance | OTP intent + allocation + atomic reserve/outbox | Khớp |
| Provider → terminal/recovery | Attempt/event inbox | Paid, failure release, UNKNOWN hold, linked reversal | Khớp |

### Financialization invariant mới được bổ sung

Tuần 3 tạo `Commercial Pending Earning`. G16 Tuần 4 phải:

1. Attach tax snapshot.
2. Attach reference FX snapshot hoặc explicit unavailable/held state.
3. Compute exact Gross/Tax/Net.
4. Post initial balanced Journal exactly once.
5. Set `financialized_at` hoặc invariant tương đương.
6. Idempotently backfill/replay existing G15 fixtures.
7. Nâng source handler để Earning mới không đi đường cũ tạo orphan.

Sau G16, PENDING Earning không có Journal/snapshot phải là blocker/anomaly, không được xuất hiện như số tiền hợp lệ trên UI.

## 5. Audit 22 Must

### 5.1. Số lượng và nhóm

| Nhóm | IDs | Số lượng |
|---|---|---:|
| Core Platform | CP-01, CP-02, CP-03, CP-04, CP-05, CP-06, CP-08 | 7 |
| Admin | AD-01, AD-02, AD-03, AD-04, AD-06, AD-07, AD-09 | 7 |
| Creator | CR-01 đến CR-08 | 8 |
| **Tổng** |  | **22** |

Bảy Should/P1 được tách đúng: CP-07, CP-09, AD-05, AD-08, AD-10, CR-09, CR-10.

### 5.2. Coverage theo tuần

| ID | Design | Build chính | Final closure | Kết luận |
|---|---|---|---|---|
| CP-01 | W1 | W2 | W5 config/evidence | Đã bổ sung feature boolean + payment/social/provider flags |
| CP-02 | W1 | W2 và áp dụng W3–W4 | W5 J4 | Không được ghi Done chỉ ở Day 7 |
| CP-03 | W1 | W1–W2 | W5 route smoke | Đủ |
| CP-04 | W1 | W2 | W5 J1 | Đủ |
| CP-05 | W1 | W2 và UI W3–W4 | W5 locale/system-message audit | Đã bổ sung status/reason/provider messages |
| CP-06 | W1 | W2 formatter + W4 money UI | W5 J3 | Đủ |
| CP-08 | W1 | W2 config + W4 engine | W5 J3/golden | Đủ |
| AD-01 | W1 | W2 | W5 role/country/partner/MFA | Đủ sau partner regression |
| AD-02 | W1 | W2 foundation + W3/W4 actions | W5 inventory/redaction | Đủ nếu critical action inventory complete |
| AD-03 | W1 | W3 | W5 J2 | Đủ |
| AD-04 | W1 | W2 | W5 J1 | Đủ |
| AD-06 | W1 | W4 | W5 J3/restore | Đủ |
| AD-07 | W1 | W4 | W5 J3/provider | Đủ |
| AD-09 | W1 | W3 | W5 evidence | Đã sửa: thiếu counters/CSV thì phải IN_PROGRESS |
| CR-01 | W1 | W2 | W5 provider/waiver evidence | Open decision nếu không có OAuth thật |
| CR-02 | W1 | W2 | W5 J1 | Đủ |
| CR-03 | W1 | W2 | W5 locale/profile | Đủ |
| CR-04 | W1 | W2 | W5 J1 | Đủ |
| CR-05 | W1 | W3 | W5 J2 | Đã bổ sung personal hashtag seed acceptance |
| CR-06 | W1 | W3 | W5 J2 | Đủ |
| CR-07 | W1 | W3 source + W4 D16–20 | W5 J3 | Đã sửa mapping, không chỉ Day 16–17 |
| CR-08 | W1 | W4 | W5 J3 | Đủ |

### 5.3. Các acceptance gap đã được đóng trong kế hoạch

#### CP-01 — Country configuration

Đã bổ sung:

- Simple boolean feature enable/disable theo country.
- Allowed social platforms.
- KYC/payment/provider mode/flags.
- Version, validation và audit.

Percentage rollout vẫn là CP-09/P1.

#### CP-05 — i18n

Đã bổ sung translation/error mapping cho:

- KYC/content/payout status.
- Validation và review reason.
- OTP error.
- Provider timeout/UNKNOWN/recovery message.

#### AD-09 — Campaign/budget/analytics/export

Basic counters và CSV là acceptance Must. Nếu core Green nhưng CSV chưa có:

- G15 chỉ `CONDITIONAL GO`.
- AD-09 giữ `IN_PROGRESS`.
- Có owner/deadline đóng trước G22.
- Không ghi `DONE lean` để che thiếu export.

Charts/BI vẫn P1.

#### CR-01 — Global SSO

Phải chọn một:

1. Google/TikTok OAuth thật theo adapter; hoặc
2. Local/mock provider có disclosure và waiver được acceptance owner ký.

Nếu không có provider thật lẫn waiver, CR-01 là `PARTIAL/BLOCKED`, không phải DONE.

#### CR-05 — Personal tracking asset

Generic Link/Code/Hashtag đã có. Release seed phải có ít nhất một personal hashtag campaign để không chỉ chứng minh link/code.

## 6. Audit cross-cutting concern

| Concern | Tuần bắt đầu | Tuần mở rộng | Final evidence | Bỏ sót? |
|---|---|---|---|---|
| Country isolation/RLS | W1 design, W2 runtime | W3 Campaign/Content, W4 Finance | W5 API/DB/storage/cache/export | Không, sau khi mapping CP-02 sửa W2–W5 |
| Partner/owner scope | W1 permission, W3 catalog | W4 money | W5 J4 | Không, nhưng là test P0 bắt buộc |
| Audit/redaction | W1 design, W2 service | W3/W4 critical actions | W5 inventory/evidence scan | Không |
| i18n/locale | W1 mockup, W2 foundation | W3/W4 UI | W5 core scan | Không |
| Idempotency | W1 decision | W2–W4 per command | W5 stress/fault | Không |
| Concurrency | W2 KYC | W3 Join/Approve, W4 Batch/Payout | W5 invariant suite | Không |
| Object storage | W2 KYC | W3 content metadata | W5 privacy + restore | Không |
| Money/FX/tax | W1 design, W2 config | W4 engine | W5 J3 | Không |
| Setup/migration/seed | W1 | Every weekly gate | W5 clean install/restore | Không |
| Accessibility/performance | W1 mockup state | Patterns xuyên build | W5 measured baseline | Có lịch rõ; không claim certification/SLA production |

## 7. Thuật ngữ canonical sau rà soát

### Scope và defect

- Scope priority: `P0`, `P0b`, `P1`.
- Defect severity mới trong Tuần 5: `Sev-0`, `Sev-1`, `Sev-2`.
- Các tuần cũ còn dùng “P0/P1 defect” phải được hiểu theo severity và nên chuẩn hóa khi bắt đầu execution.

### Country/market/partner

- `Country`: data/legal/isolation dimension.
- `Market`: URL/UI context; Phase 1 ánh xạ 1:1 với Country.
- `Partner`: Product owner/secondary authorization scope.
- Không dùng từ `tenant` mà không nói rõ country hay partner.

### Campaign

~~~text
DRAFT → ACTIVE ↔ PAUSED → CLOSED

UPCOMING / FULL / ENDED = derived availability, không phải lifecycle state ghi tùy ý
~~~

### Content

~~~text
DRAFT → SUBMITTED → IN_REVIEW
                      ├→ NEEDS_CHANGES → RESUBMITTED
                      ├→ REJECTED_TERMINAL
                      └→ APPROVED
~~~

`Needs Changes` là recoverable; `Rejected Terminal` không tự resubmit.

### Payout

~~~text
Payout Intent:
OTP_PENDING → VERIFIED / EXPIRED / CANCELLED

Payout Request:
RESERVED → QUEUED → PROCESSING
                     ├→ SUCCEEDED/PAID
                     ├→ UNKNOWN/RECONCILING
                     └→ FAILED_FINAL + BALANCE_RELEASED effect

Post-success refund:
linked reversal transaction, không overwrite Paid history
~~~

Hai OTP purpose phải tách: `ADMIN_MFA` và `PAYOUT_CONFIRMATION`.

## 8. Các chỉnh sửa đã áp dụng

| File | Chỉnh sửa chính | Trạng thái |
|---|---|---|
| `KE_HOACH_TRIEN_KHAI_5_TUAN.md` | CPS wording conditional; two deep CONTENT_FLAT flows; conversion tests conditional; failure release/UNKNOWN; W5 pointer; mapping CP-02/AD-09/CR-07 | Đã áp dụng |
| `KE_HOACH_CHI_TIET_TUAN_1.md` | Canonical reward glossary; failure release vs UNKNOWN vs post-success reversal; design-only P0b | Đã áp dụng |
| `KE_HOACH_CHI_TIET_TUAN_2.md` | CP-01 feature/social/payment flags; localized system messages; CR-01 OAuth/waiver decision | Đã áp dụng |
| `KE_HOACH_CHI_TIET_TUAN_3.md` | CPS mapping; source-aware keys; Commercial Pending handoff; AD-09 CSV status; PH flat smoke; expiry reservation limitation | Đã áp dụng |
| `KE_HOACH_CHI_TIET_TUAN_4.md` | G16 financialization/backfill; P0b capability/source/budget semantics | Đã áp dụng |
| `KE_HOACH_CHI_TIET_TUAN_5.md` | 35h + 5h buffer, G21–G25, 4 journeys, 22 Must evidence, clean release | Đã tạo |

## 9. Open decision và intentional limitation

### Open decision phải khóa khi execution bắt đầu

| Decision | Deadline | Default an toàn |
|---|---|---|
| Real OAuth hay waiver mock cho CR-01 | Cuối W2-D6 | Mock chỉ conditional khi acceptance owner ký |
| ORM/money exact representation | W1/G16 | Một strategy duy nhất, no float |
| P0b CPS | G17 | Default CUT |
| Browser/WebKit breadth | W5-D22 | Chromium gate + Firefox smoke; WebKit limitation nếu chưa test |
| Reviewer/sign-off identities | Trước G25 | Ghi người thật; không tự điền thay |

### Intentional limitation, không phải bỏ sót

- Chỉ VN/PH, không có framework onboard mọi quốc gia production.
- Chỉ `CONTENT_FLAT` là executable P0; CPS optional; CPL/CPI/recurring modeled-only.
- Không click attribution/window/fraud/network connector thật.
- OAuth/eKYC/payment/FX/social có thể mock theo disclosure/waiver.
- Synthetic tax/FX không khẳng định legal compliance.
- No native mobile, public webhook, Brand Portal, Kubernetes hoặc BI nâng cao.
- Participation expiry/cancel reservation release chỉ có contract/disabled transition nếu chưa implement; backlog cleanup phải được disclose.
- Local performance target không phải production SLA.
- Accessibility baseline không phải WCAG certification.

## 10. Capacity audit

### Số giờ trên kế hoạch

| Tuần | Task planned | Buffer | Kết luận |
|---|---:|---:|---|
| 1 | Khoảng 36,5 giờ task + 3,5 giờ buffer/integration phân bố theo ngày | Tổng 40 giờ | Khớp tổng; phân bổ ngày khác 7+1 nhưng được ghi rõ |
| 2 | 35 giờ | 5 giờ | Khớp |
| 3 | 35 giờ | 5 giờ | Khớp |
| 4 | 35 giờ | 5 giờ | Khớp |
| 5 | 35 giờ | 5 giờ | Khớp; task ID/timebox cần được kiểm tự động |

### Đánh giá khả thi

Kế hoạch vẫn rất căng cho một developer, đặc biệt W3-D14/D15 và toàn Tuần 4. Nó chỉ khả thi khi:

- G5/G10/G15/G20 thực sự Green trước tuần sau.
- P0b mặc định CUT.
- Parameterize invariant tests thay vì viết hàng chục flow trùng.
- Provider/worker dùng adapter + DB-polling/outbox tối thiểu; không thêm Redis nếu không cần.
- Không dùng Tuần 5 để bắt đầu Ledger/Reconciliation/Payout còn thiếu.
- Mentor review đúng timebox.

Nếu G20 còn NO-GO vào cuối Ngày 22, sản phẩm không thể gọi release-ready. Bàn giao phải ghi partial MVP/blocker thật, không dùng demo mock để che.

## 11. Gap register cuối

| Gap/Risk | Kết quả rà soát | Owner week |
|---|---|---|
| CPS bị hiểu là P0 | Đã sửa conditional/cut branch | W1/W3/W4/W5 |
| CPS/SALE_PERCENT naming | Đã khóa canonical mapping | W1/W3 |
| CPS dùng sai content business key | Đã tách source-aware key | W3/W4 |
| CPS dùng flat reserve-at-Join | Đã tách variable budget semantics | W4 |
| Pending Earning hai nghĩa | Đã thêm G16 financialization/backfill | W3/W4 |
| Failure/Unknown/Refund lẫn nghĩa | Đã chuẩn hóa release/hold/reversal | W1/W4/W5 |
| CP-01 thiếu feature/social/payment config | Đã bổ sung acceptance | W2/W5 |
| CP-02 final evidence chỉ ghi Day 7 | Đã sửa mapping W2–W5 | W5 |
| CP-05 thiếu localized system messages | Đã bổ sung | W2/W5 |
| AD-09 thiếu CSV nhưng ghi DONE lean | Đã sửa status/gate | W3/W5 |
| CR-01 mock được ghi như real SSO | Đã thêm OAuth/waiver decision | W2/W5 |
| CR-05 chưa chắc có personal hashtag | Đã thêm release-seed acceptance | W5 |
| CR-07 mapping chỉ Day 16–17 | Đã sửa Day 16–20 | Roadmap/W5 |
| Reservation không submit/expire | Intentional limitation/disabled transition nếu chưa implement | W3/W5 docs |
| Feature freeze lệch Day 22/24 | Đã sửa: freeze G22, Day 24 xác nhận | W5 |
| Conversion test bắt buộc khi CUT | Đã sửa conditional + alternative exactly-once | Roadmap/W5 |
| Fresh workbook cell audit | Chưa làm được vì không có Excel session | W1-D1 RTM re-diff |
| Implementation evidence | Chưa có; toàn bộ vẫn TODO | Bắt đầu W1-D1-T01 |

## 12. Kết luận GO để bắt đầu thực thi

Kế hoạch tài liệu được đánh giá `PLAN-READY` sau chỉnh sửa, không phải `PRODUCT-DONE`.

Hành động thực thi đầu tiên vẫn là:

~~~text
W1-D1-T01
→ khởi tạo/kiểm tra Git hợp lệ
→ secrets/evidence policy
→ local-exclude execution log
→ sau đó mới khóa RTM/decision/mockup
~~~

Không nhảy thẳng tới Tuần 5. Mỗi tuần chỉ bắt đầu khi Gate tuần trước có evidence thật.
