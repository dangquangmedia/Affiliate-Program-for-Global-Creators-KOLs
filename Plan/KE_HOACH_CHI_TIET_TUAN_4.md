# KẾ HOẠCH TRIỂN KHAI CHI TIẾT TUẦN 4

> Dự án: Affiliate GLOBAL  
> Thời lượng: Ngày 16–20, khoảng 40 giờ  
> Nguồn phạm vi: `Plan/docs/Book1.xlsx`, kế hoạch 5 tuần, kế hoạch chi tiết Tuần 3 và compact handoff  
> Trạng thái khi lập kế hoạch: Pre-implementation; Tuần 1–3 mới hoàn thành tài liệu kế hoạch, chưa được thực thi  
> Điều kiện bắt đầu: Gate G15 Tuần 3 phải đạt GO hoặc CONDITIONAL GO không liên quan Earning/Reward/Budget/Country/Security  
> Mục tiêu tuần: hoàn thành vertical slice Pending Earning → Money/Ledger → Reconciliation → Available Balance → Payout

## 1. Kết quả bắt buộc cuối Tuần 4

Tuần 4 là tuần có rủi ro tài chính cao nhất. Kết quả không được đánh giá bằng số màn hình đã làm, mà bằng khả năng chứng minh tiền không bị tính sai, ghi trùng, chi trùng, hoàn thừa hoặc sửa lịch sử.

Cuối tuần phải chứng minh được tám kết quả:

1. **Money chính xác:** mọi amount/rate đi qua exact decimal; Gross = Tax + Net sau khi áp dụng currency scale và rounding rule đã snapshot.
2. **Nguồn tiền truy xuất được:** mỗi Earning truy ngược được Participation, Deliverable, reward snapshot, tax snapshot, FX snapshot và approval source.
3. **Ledger bất biến và cân bằng:** mỗi business effect sinh một balanced journal; runtime không update/delete; adjustment/reversal tạo journal mới.
4. **Creator hiểu tiền của mình:** Earnings list/detail cho biết nguồn, Gross–Tax–Net, local currency, USD reference và trạng thái Pending/Confirmed/Available/Paid/Reversed.
5. **Finance reconcile được:** tạo batch, phát hiện anomaly, approve/lock, chốt settlement snapshot, export và điều chỉnh mà không sửa dữ liệu đã khóa.
6. **Payout reserve an toàn:** OTP, minimum/balance/bank/KYC được revalidate; double-click hoặc concurrent request không double spend.
7. **Provider lifecycle đúng:** success, confirmed failure, timeout/unknown, retry và duplicate callback không tạo double payment hoặc double release.
8. **VN/PH cùng một core:** payout là local currency; khác biệt tax/FX/minimum/provider lấy từ country config, không branch cứng theo country.

Vertical slice cuối tuần:

~~~text
Pending Earning từ Tuần 3
  → Gross/Tax/Net + immutable snapshots
  → balanced append-only Ledger
  → Creator Earnings
  → Reconciliation approve/lock
  → Available Balance
  → OTP Payout Intent
  → atomic reserve
  → mock provider attempt
     ├─ Success → Paid đúng một lần
     ├─ Confirmed Failure → release reserve đúng một lần
     └─ Timeout/Unknown → giữ reserve, reconcile trước retry
~~~

Sáu yêu cầu Must phải đạt MVP trong tuần:

- CP-06: local currency + USD reference.
- CP-08: Gross–Tax–Net theo country.
- AD-06: reconciliation end-to-end.
- AD-07: FX lock và payout.
- CR-07: earnings transparency.
- CR-08: payout end-to-end.

## 2. Entry Gate và phạm vi tuần

### 2.1. Điều kiện bắt đầu Ngày 16

Trước W4-D16-T01 phải có bằng chứng:

- Gate G15 đạt GO hoặc chỉ còn debt về visual polish, CSV, provider thật hoặc P0b CPS.
- Với CONTENT_FLAT, một rewarded content deliverable chỉ sinh đúng một Commercial Pending Earning; conversion P0b dùng source business key riêng.
- Earning có stable business key: participation + deliverable + reward snapshot.
- Earning có source, gross reward amount, ISO currency và immutable commercial snapshot.
- Content Approved, Pending Earning, budget reserved→committed và audit không bị lệch transaction.
- Budget invariant reserved + committed <= total Green trên PostgreSQL concurrency test.
- Join/Approve retry không tạo duplicate business effect.
- Không còn cross-country, cross-user hoặc cross-partner leak ở Campaign/Content/Earning.
- Runtime Auth/RBAC/RLS/Audit/Country context vẫn Green.
- Migration, seed, verify và clean restart của Tuần 3 tái lập được.

Không được xây Ledger lên một nguồn Pending Earning chưa đáng tin.

Quy tắc carry-over:

- Carry-over G15 tối đa 30 phút: có thể đóng ở W4-D16-T01.
- Carry-over trên 30 phút: cắt toàn bộ P0b ngay.
- Carry-over trên một ngày hoặc còn duplicate earning/budget mismatch/country leak: Tuần 4 phải replan; không giả vờ đạt G20.

### 2.2. P0 bắt buộc Tuần 4

#### Money, Tax và FX

- Money value object, currency registry và precision/scale rule cho VND, PHP, USD.
- API truyền amount/rate bằng decimal string + ISO currency.
- Tax rule/version và synthetic tax snapshot tại thời điểm tạo Earning.
- Reference FX snapshot tại thời điểm tạo Earning, dùng cho hiển thị USD.
- Settlement FX snapshot tại thời điểm reconciliation lock.
- Payout local currency; USD chỉ tham chiếu.
- Gross–Tax–Net, rounding boundary và overflow validation.

#### Earning và Ledger

- Earning lifecycle: Pending → Confirmed → Available → Paid; Reversed bằng linked adjustment/reversal.
- Balanced Ledger Transaction + hai hoặc nhiều Ledger Entries.
- Unique posting business key và payload hash.
- Append-only ở application và database permission.
- Derived balance/projection có thể reconcile với Ledger.
- Adjustment/reversal không overwrite original Earning, Journal hoặc snapshot.

#### Creator Earnings

- Summary/list/detail, filter và stable pagination.
- Source breakdown theo Campaign/Content hoặc Conversion nếu P0b được mở.
- Gross, Tax, Net, local currency, USD reference, snapshot/rate time.
- State/timeline và next-step explanation.
- Loading, empty, error, denied và unavailable-reference-FX states.

#### Reconciliation

- Batch theo country + currency + cutoff/period; campaign filter là tùy chọn.
- Batch lines snapshot từ internal Earnings/Ledger.
- Anomaly severity và resolution/audit.
- Approve/lock idempotent; locked batch immutable.
- Settlement FX lock và batch checksum.
- Adjustment/reversal sau lock.
- CSV frozen export tối thiểu.

#### Payout

- Payout intent/request, allocation, attempt và provider-event records.
- KYC/bank/country/currency/minimum/available validation.
- OTP hash, expiry, attempt limit, resend/rate limit, single use và audit.
- OTP bind vào profile + country + amount + currency + bank version + intent.
- Atomic reserve từ Available → Payout Reserved.
- Outbox/worker gọi mock provider ngoài database transaction.
- Success, confirmed failure, timeout/unknown, duplicate/out-of-order callback.
- Safe transport retry và explicit business retry sau terminal failure.
- Creator payout status/history và Finance queue tối thiểu.

#### Cross-cutting

- Country/RBAC/RLS/ownership/audit trên mọi bảng/API/UI mới.
- Idempotency và payload mismatch conflict.
- PostgreSQL concurrency/fault-injection tests.
- Seed VN/PH và demo deterministic.
- OpenAPI, ERD, state, RTM và evidence cập nhật.

### 2.3. Không phải P0 Tuần 4

- Tax engine pháp lý hoặc tuyên bố tuân thủ luật VN/PH.
- Realtime FX production, nhiều FX provider hoặc market fallback nâng cao.
- Payout bằng USD hoặc conversion currency khác local currency.
- External affiliate-network/payment/bank/eKYC provider thật.
- External reconciliation file/import/matching phức tạp.
- General ledger kế toán doanh nghiệp đầy đủ.
- Nhiều ví, nhiều bank account, split payout hoặc bulk payout.
- Auto-retry scheduler nâng cao.
- Dispute/appeal, chargeback network hoặc debt collection.
- Finance BI dashboard, forecasting, chart nâng cao hoặc XLSX đẹp.
- Public webhook, click attribution, attribution window hoặc recurring commission.
- Native mobile/push notification.

### 2.4. P0b — Mock Conversion/CPS

P0b không phải điều kiện của G20 và mặc định là CUT cho tới khi checkpoint G17 chứng minh dự án đang đi trước kế hoạch.

Nếu được mở, phạm vi tối đa:

- Một internal mock conversion endpoint/import.
- Capability `conversion_goal = PAID_ORDER` + `reward_strategy = SALE_PERCENT`; business label là CPS.
- Dedupe unique theo provider + external_event_id.
- Commission = round(eligible order value × rate snapshot).
- Conversion liên kết Participation + Offer/Reward snapshot + country + partner.
- Không reserve variable commission tại Join. Khi ingest conversion: tính exact commission → atomic budget-cap check/commit → tạo canonical Pending Earning; thiếu budget phải hold/anomaly hoặc deny rõ, không overspend.
- Chuẩn hóa vào cùng CreatePendingEarning/Money/Ledger pipeline.
- Enable đúng boolean capability cho seed campaign P0b riêng và chạy lại activation validation; khi CUT flag vẫn off. Việc này không hoàn thành CP-09 percentage rollout.

Không gồm click attribution, public webhook, refund network, cancellation window, recurring hoặc UI nâng cao.

## 3. Money truth và state model phải dùng chung

### 3.1. Source-of-truth chain

~~~text
Commercial truth
  Join Reward/Terms Snapshot
        ↓
Earning truth
  Gross + Tax Snapshot + Net + Reference FX Snapshot
        ↓
Accounting truth
  Append-only Ledger Transactions/Entries
        ↓
Operational truth
  Reconciliation Batch/Lines + Settlement FX Lock
        ↓
Withdrawable truth
  Available Balance Projection
        ↓
Payment truth
  Payout + Allocation + Attempts + Provider Events
~~~

Quy tắc:

- UI không tự tính lại money từ config hiện tại.
- Mutable balance cache không được là source of truth duy nhất.
- Config mới chỉ ảnh hưởng transaction mới.
- Historical detail luôn đọc snapshot đã lưu.
- Mọi state change có money effect phải cùng transaction với Ledger posting, hoặc dùng transactional outbox có trạng thái recoverable.

### 3.2. Earning lifecycle P0

~~~text
PENDING
  → CONFIRMED
  → AVAILABLE
  → PAID

PENDING / CONFIRMED / AVAILABLE
  → REVERSED bằng linked journal
~~~

Ý nghĩa:

- PENDING: source đã được chấp nhận, Earning và initial journal tồn tại nhưng chưa qua reconciliation.
- CONFIRMED: line đã được Finance approve; chưa dùng để payout.
- AVAILABLE: reconciliation batch đã lock và mọi hold P0 đã đạt.
- PAID: provider success và phần allocated amount đã settled.
- REVERSED: toàn bộ remaining reversible amount đã được offset bằng linked reversal.

Nếu payout chỉ chi một phần Earning:

- PayoutAllocation lưu chính xác allocated/reserved/paid amount.
- Earning detail hiển thị Net, Available remaining và Paid amount.
- Earning chỉ thành PAID khi toàn bộ payable amount đã paid.
- Không cần thêm mutable PARTIALLY_PAID state vào source model; UI dùng paid/remaining projection.

Không skip hoặc đi lùi state bằng update trực tiếp.

### 3.3. Reconciliation lifecycle P0

~~~text
DRAFT → REVIEWING → APPROVED → LOCKED → EXPORTED
~~~

- APPROVED chuyển line hợp lệ Pending → Confirmed.
- LOCKED chốt line/totals/settlement snapshot/checksum và chuyển eligible amount Confirmed → Available.
- LOCKED không quay lại Draft/Reviewing và không có unlock trong MVP.
- Correction sau lock đi qua linked Adjustment/Reversal hoặc adjustment batch mới.
- Export đọc frozen snapshot; không recompute từ Earning/config hiện tại.

### 3.4. Payout lifecycle P0

~~~text
OTP_PENDING
  → RESERVED
  → QUEUED
  → PROCESSING
     ├─ SUCCEEDED / PAID
     ├─ UNKNOWN / RECONCILING
     └─ FAILED_FINAL → BALANCE_RELEASED

BALANCE_RELEASED
  → explicit retry
  → revalidate + re-reserve
  → new provider attempt
~~~

Phân biệt bắt buộc:

- Confirmed failure trước khi provider chi tiền: release reservation, không gọi là refund tài chính sau thanh toán.
- Provider refund/reversal sau khi đã success: journal đảo mới; không sửa Paid thành chưa từng Paid.
- Timeout/UNKNOWN: chưa biết provider có chi tiền hay không; giữ reserve và không tự retry bằng payment instruction mới.
- Transport retry của cùng attempt dùng cùng provider idempotency key.
- Explicit business retry sau FAILED_FINAL tạo attempt sequence mới, nhưng phải revalidate và re-reserve trước.

## 4. Thứ tự ưu tiên và dependency

| Thứ tự | Chức năng | Mức | Dependency/lý do |
|---:|---|---|---|
| 1 | Regression Gate G15 | P0 | Không xây money flow trên Earning/budget/source lỗi |
| 2 | Money/currency/rounding/tax/FX decisions | P0 | Tất cả Ledger và UI phụ thuộc cách biểu diễn tiền |
| 3 | Earning extension + immutable snapshots | P0 | Khóa số tiền lịch sử trước khi posting |
| 4 | Balanced append-only Ledger | P0 | Source of truth cho balance/reconciliation/payout |
| 5 | Creator Earnings projection/API/UI | P0 | Chứng minh CR-07 và totals khớp Ledger |
| 6 | G17 P0b decision | P0 control | P0b chỉ được mở khi P0 đi trước kế hoạch |
| 7 | Reconciliation batch/anomaly/approve/lock | P0 | Chỉ line đã lock mới thành Available |
| 8 | Payout intent + OTP + eligibility | P0 | Không reserve trước khi intent được xác thực |
| 9 | Atomic reserve + allocation + outbox | P0 | Chống double spend và tách provider khỏi DB transaction |
| 10 | Provider success/failure/unknown/retry | P0 | Hoàn thành CR-08/AD-07 và exactly-once money effect |
| 11 | Full VN/PH E2E, fault injection và G20 | P0 | Gate sang hardening Tuần 5 |
| 12 | P0b CPS/charts/export polish | P0b/P1 | Cắt đầu tiên khi P0 có rủi ro |

Dependency bắt buộc:

~~~text
G15 trustworthy Pending Earning
  → G16 Money/Tax/FX/Ledger
  → G17 Earnings + P0b decision
  → G18 Reconciliation/Available
  → G19 OTP/Payout Reserve
  → G20 Provider Lifecycle + Full Money Gate
~~~

Không được:

- Làm payout từ mutable balance trước khi Ledger/projection Green.
- Dùng reference FX làm settlement FX hoặc payout amount.
- Lock batch khi money snapshot/totals chưa ổn định.
- Gọi payment provider bên trong database transaction.
- Release reserve khi provider đang UNKNOWN.
- Sửa Earning/Ledger/Batch đã khóa để fix nhanh.

## 5. Phân bổ công suất 40 giờ

| Ngày | Task đã lên lịch | Buffer | Trọng tâm |
|---|---:|---:|---|
| 16 | 7 giờ | 1 giờ | Money, tax, FX snapshot và Ledger |
| 17 | 7 giờ | 1 giờ | Creator Earnings và checkpoint P0b |
| 18 | 7 giờ | 1 giờ | Reconciliation, FX lock và Available |
| 19 | 7 giờ | 1 giờ | Payout intent, OTP, allocation và reserve |
| 20 | 7 giờ | 1 giờ | Provider lifecycle, VN/PH E2E và Gate G20 |
| **Tổng** | **35 giờ** | **5 giờ** | **Không vượt 40 giờ** |

Buffer chỉ dùng cho P0 blocker, transaction/concurrency/fault test và integration.

P0b chỉ được dùng phần timebox W4-D17-T06 và tối đa một giờ buffer Ngày 17. Không được lấy thời gian Ngày 18–20.

## 6. Quyết định phải khóa trước/tại thời điểm triển khai

| ID | Quyết định | Default recommendation | Deadline |
|---|---|---|---|
| W4-DEC-01 | Amount representation | PostgreSQL exact NUMERIC hoặc integer minor unit theo quyết định Tuần 3; backend decimal library; API decimal string; tuyệt đối không trộn chiến lược | Đầu Ngày 16 |
| W4-DEC-02 | Currency scale | VND 0; PHP 2; USD 2; reject amount vượt scale ở command boundary | Đầu Ngày 16 |
| W4-DEC-03 | Rounding | Configured HALF_UP cho seed; lưu mode/scale trong snapshot; round tax từng line, rồi Net = Gross − Tax | Đầu Ngày 16 |
| W4-DEC-04 | Tax scope | Synthetic flat/config rule có version; không tuyên bố legal compliance; missing rule tạo hold/anomaly, không default 0 âm thầm | Ngày 16 |
| W4-DEC-05 | Reference FX | Snapshot lúc tạo Earning; direction local_per_usd; chỉ hiển thị USD; unavailable không làm hỏng local flow | Ngày 16 |
| W4-DEC-06 | Settlement FX | Snapshot và lock tại reconciliation; record riêng reference FX; không recalculate local payout | Ngày 18 |
| W4-DEC-07 | Budget accounting | Campaign committed budget reconcile với Earning Gross, không Net | Ngày 16 |
| W4-DEC-08 | Ledger model | Journal + 2+ entries; entry positive + debit/credit; balanced per currency; append-only và unique source key | Ngày 16 |
| W4-DEC-09 | Balance truth | Balance derive từ Ledger/projection; cache nếu có phải verify/rebuild được | Ngày 16 |
| W4-DEC-10 | Reconciliation source | Internal Pending Earnings/Ledger; không external import P0 | Đầu Ngày 18 |
| W4-DEC-11 | Anomaly severity | Money/source/ledger/budget/currency duplicate là Blocker; missing bank là Warning/Payout hold, không xóa entitlement | Ngày 18 |
| W4-DEC-12 | Batch lock | Không unlock MVP; correction bằng linked adjustment/reversal/new batch | Ngày 18 |
| W4-DEC-13 | Payout amount | Creator nhập amount đúng local minor unit, từ minimum tới Available; allocation FIFO và hỗ trợ partial last earning | Đầu Ngày 19 |
| W4-DEC-14 | OTP binding | Bind profile/country/amount/currency/bank-version/intent; change payload invalid OTP cũ | Ngày 19 |
| W4-DEC-15 | Provider invocation | Transactional outbox; worker gọi provider sau DB commit | Ngày 19 |
| W4-DEC-16 | Timeout semantics | UNKNOWN giữ reserve; query/reconcile status trước khi new instruction | Trước provider call |
| W4-DEC-17 | Retry semantics | Same attempt retry dùng same provider key; post-failure business retry re-reserve và dùng attempt sequence mới | Ngày 20 |
| W4-DEC-18 | Failure vs refund | Pre-payment failure = balance release; post-success refund = new reversal journal | Ngày 20 |
| W4-DEC-19 | P0b decision | Default CUT; chỉ GO nếu toàn bộ G17 checklist đạt và còn đủ capacity D18–D20 | Cuối P0 Ngày 17 |

## 7. Money, posting và snapshot rules

### 7.1. Representation và rounding

- Không dùng JavaScript number, database float/double hoặc epsilon comparison trong money path.
- Amount/rate ở API là canonical decimal string.
- Currency đi kèm mọi amount; không cộng hai currency khác nhau.
- Rate có precision cao hơn settled amount và lưu pair/direction.
- Amount input vượt minor-unit policy bị reject, không silently truncate.
- Tax rule snapshot phải chứa rule ID/version, rate, scale, rounding mode và effective time.

Formula P0:

~~~text
tax_unrounded = gross × tax_rate
tax           = round(tax_unrounded, currency_scale, rounding_mode)
net           = gross − tax

Invariant: gross = tax + net
~~~

Batch total:

~~~text
batch_gross = Σ stored_line_gross
batch_tax   = Σ stored_line_tax
batch_net   = Σ stored_line_net
~~~

Không tính tổng unrounded rồi round một lần ở batch.

Golden cases:

- VND tại boundary .5.
- PHP tại chữ số thập phân thứ ba.
- Tax 0%.
- Tax rate upper bound hợp lệ.
- Một minor unit.
- Số tiền gần maximum precision.
- Nhiều line tạo rounding residue.
- Negative adjustment chỉ qua adjustment/reversal, không qua normal earning.

### 7.2. Snapshot timing

| Snapshot | Thời điểm | Không bị thay đổi bởi |
|---|---|---|
| Reward/commission/terms | Join | Offer/Campaign update |
| Tax rule/profile | Tạo Earning | Tax config/profile update sau đó |
| Reference FX | Tạo Earning | FX refresh sau đó |
| Settlement FX | Reconciliation lock | Export/retry/payout sau lock |
| Payout amount/bank | OTP verify + reserve | Creator sửa bank/amount sau reserve |

Snapshot tối thiểu:

- Rule/config ID và version.
- Effective time.
- Rate/value, pair và direction.
- Currency.
- Scale và rounding mode.
- Source/provider.
- Captured timestamp.
- Fallback/stale/demo indicator.
- Commercial/source IDs liên quan.

### 7.3. Posting matrix tối thiểu

| Event | Debit | Credit | Amount |
|---|---|---|---|
| Pending Earning | Campaign Reward Expense | Creator Pending Payable + Tax Withholding Payable | Gross = Net + Tax |
| Reconciliation lock | Creator Pending Payable | Creator Available Payable | Net |
| Payout reserve | Creator Available Payable | Payout Reserved Payable | Requested amount |
| Payout success | Payout Reserved Payable | Payment Clearing | Requested amount |
| Confirmed failure release | Payout Reserved Payable | Creator Available Payable | Requested amount |
| Earning/payment adjustment | Account theo original effect | Linked offset account | Exact reversible amount |

Mỗi Journal:

- Có country, partner, creator profile, currency và source.
- Có unique source type + source ID + posting type/sequence.
- Có payload hash; cùng key khác payload trả conflict.
- Tổng Debit = tổng Credit trong cùng currency.
- Entry amount dương; chiều thể hiện bằng Debit/Credit.
- Failure giữa entries rollback toàn bộ.
- Runtime DB role không có UPDATE/DELETE.

## 8. Artifact và module phải có

### 8.1. Tài liệu/evidence

| Artifact | Đường dẫn dự kiến | Ngày | Mức |
|---|---|---:|---|
| Money/tax/FX rules | docs/product/MONEY_RULES.md | 16 | P0 |
| Ledger posting model | docs/architecture/LEDGER_POSTING_MODEL.md | 16 | P0 |
| Earning state/UX rules | docs/product/EARNING_RULES.md | 16–17 | P0 |
| Reconciliation rules | docs/product/RECONCILIATION_RULES.md | 18 | P0 |
| Payout/provider lifecycle | docs/product/PAYOUT_RULES.md | 19–20 | P0 |
| Week 4 test matrix | docs/qa/WEEK4_TEST_MATRIX.md | 16–20 | P0 |
| Week 4 evidence | docs/qa/WEEK4_EVIDENCE.md | 16–20 | P0 |
| P0b decision record | docs/decisions/W4_P0B_CHECKPOINT.md | 17 | P0 control |
| ERD/OpenAPI/State/Permission/RTM update | Tài liệu Tuần 1–3 tương ứng | xuyên tuần | P0 |
| Demo scenario update | docs/product/DEMO_SCENARIOS.md | 20 | P0 |

### 8.2. Backend module dự kiến

- Money/Currency/Decimal serialization.
- Tax Rule/Version/Snapshot.
- FX Rate Provider adapter + Reference/Settlement Snapshot.
- Earning lifecycle/projection.
- Ledger Journal/Entry/Account/Posting policy.
- Reconciliation Batch/Line/Anomaly/Adjustment.
- Payout Intent/Request/Allocation/Attempt.
- OTP purpose binding.
- Payment Provider adapter.
- Transactional Outbox/Worker/Provider Event Inbox.
- Optional Conversion/Percentage Reward behind feature flag.

### 8.3. Frontend surface dự kiến

- Creator Earnings summary/list/detail/timeline.
- Creator Payout request/OTP/status/history.
- Local Finance Reconciliation batch list/builder/detail/anomaly/lock/export.
- Local Finance Payout queue/detail/reconcile/retry action.
- Global/Local Admin config view chỉ khi foundation đã có; không xây full finance dashboard.

## 9. Kế hoạch chi tiết theo ngày

### Ngày 16 — Money, Tax, FX Snapshot và Immutable Ledger

#### Outcome duy nhất

Pending Earning từ Tuần 3 trở thành một nghĩa vụ tài chính chính thức có Gross–Tax–Net, immutable snapshot và balanced Ledger posting đúng một lần.

| Task ID | Timebox | Mũ vai trò | Dependency | Công việc | Đầu ra | Acceptance/evidence |
|---|---:|---|---|---|---|---|
| W4-D16-T01 | 30 phút | Tech Lead/QA/Finance | G15 | Chạy regression G15; audit source/snapshot/budget/business key; khóa quyết định money critical | Entry checklist + decision record | Không approved-without-earning, duplicate earning, budget mismatch hoặc country leak |
| W4-D16-T02 | 1 giờ 15 | Backend/Data | T01 | Money value object, currency registry, decimal serialization, scale/overflow validation | Money foundation | VND/PHP/USD rule rõ; API decimal string; no JS/database float |
| W4-D16-T03 | 1 giờ | Backend/Domain | T02 | Tax Rule/Version/Snapshot và Reference FX provider/snapshot | Snapshot services | Missing/invalid rate fail rõ; historical snapshot không đổi khi config đổi |
| W4-D16-T04 | 1 giờ 30 | Backend/Data | T02–T03 | Ledger Account/Journal/Entry schema, balance rule, RLS và append-only DB permission | Ledger foundation | Balanced per currency; runtime UPDATE/DELETE denied; unique posting key |
| W4-D16-T05 | 1 giờ 15 | Backend/Domain | T03–T04 | Financialize Commercial Pending Earnings hiện có và nâng source command: Gross/Tax/Net + snapshots + initial journal trong transaction/outbox-safe flow | Official Earning command/backfill | Idempotent replay/backfill; `financialized_at`/equivalent; same business key không post hai lần; không orphan |
| W4-D16-T06 | 1 giờ | QA/Data | T02–T05 | Golden rounding, overflow, snapshot immutability, balanced/duplicate/unbalanced/reversal và budget reconciliation tests | Money test evidence | Gross = Tax + Net; committed budget = Earning Gross; journal Debit = Credit |
| W4-D16-T07 | 30 phút | Product/Architect/QA | T01–T06 | Cập nhật ERD/OpenAPI/Money/Ledger/RTM/evidence; chấm Gate G16 | G16 checklist | Money foundation sẵn cho query/reconciliation |

Giữ 1 giờ buffer cho migration, rounding hoặc posting invariant. Không làm UI trong buffer.

#### Gate G16 — Money/Ledger Gate

Pass khi:

- G15 invariant vẫn Green.
- Không dùng binary float/JS number trong calculation/persistence path.
- VND/PHP/USD precision/scale/rounding test Green.
- Gross = Tax + Net exact cho mọi golden fixture.
- Reward, tax và reference FX snapshot bất biến.
- Reference FX có source/time/pair/direction và không đổi local amount.
- Mỗi Journal cân bằng theo currency; unbalanced journal không commit.
- Runtime role không update/delete Journal/Entry.
- Same Earning/retry không tạo duplicate posting.
- Existing Commercial Pending Earning được financialize/backfill idempotently; sau G16 mọi PENDING Earning có tax/reference-FX state và initial Journal hoặc explicit held anomaly.
- Approval/new source sau G16 đi qua cùng official financialization command/outbox; không tồn tại hai nghĩa PENDING khác nhau.
- Reversal tạo linked journal, original còn nguyên.
- Campaign committed budget reconcile với Earning Gross và reward expense.
- Cross-user/country/partner Ledger access bị guard/RLS chặn.

Sai một money golden case, Ledger imbalance, mutable Ledger hoặc snapshot hồi tố là NO-GO.

### Ngày 17 — Creator Earnings và checkpoint P0b

#### Outcome duy nhất

Creator hiểu rõ tiền đến từ đâu, Gross–Tax–Net, local/USD reference và khi nào số tiền trở thành Available; G17 kết luận P0b DONE hoặc CUT, không để mơ hồ.

| Task ID | Timebox | Mũ vai trò | Dependency | Công việc | Đầu ra | Acceptance/evidence |
|---|---:|---|---|---|---|---|
| W4-D17-T01 | 30 phút | QA/Finance | G16 | Chạy money regression và seed Pending/Confirmed/Available/Paid/Reversed fixtures | Earnings fixtures | Mỗi state có source/snapshot/ledger hợp lệ |
| W4-D17-T02 | 1 giờ 15 | Backend | T01 | Earnings summary/list/detail API, filters, stable pagination và source breakdown | Earnings API | Creator chỉ đọc đúng profile/country; totals lấy projection/Ledger |
| W4-D17-T03 | 1 giờ 30 | Frontend/Product | T02 | Earnings dashboard/detail/timeline/next-step UI | CR-07 slice | Campaign/content/source, Gross/Tax/Net, state, dates và reason rõ |
| W4-D17-T04 | 45 phút | Full-stack | T02–T03 | Local currency primary + USD reference formatting/fallback | CP-06 UI | USD có rate/time/source/demo label; unavailable state; không đổi payout/local total |
| W4-D17-T05 | 45 phút | QA/Security | T02–T04 | API/UI totals, locale, reversed visibility, direct-ID và cross-country tests | Earnings evidence | UI totals khớp Ledger; history không biến mất |
| W4-D17-T06 | 1 giờ 45 | Backend/QA | T01–T05 | Nếu G17 Green: enable campaign P0b riêng và làm mock `PAID_ORDER + SALE_PERCENT`; nếu không Green: dùng toàn bộ timebox harden P0 | P0b slice hoặc P0 fix evidence | Source-aware key; link Participation/snapshot; no Join reserve; exact budget commit + Money/Ledger; hết timebox chưa Green thì revert/disable |
| W4-D17-T07 | 30 phút | Solo Dev + Mentor | T01–T06 | Quyết định P0b, cập nhật evidence/RTM/log và Gate G17 | G17 checklist | P0b ghi rõ DONE hoặc CUT/DEFERRED |

Giữ 1 giờ buffer. Nếu P0b được mở, tổng timebox P0b tối đa 2 giờ 45 gồm buffer và không lấn Ngày 18.

#### Earnings UI acceptance

- Local currency là số chính; USD có nhãn Reference/Estimated.
- Hiển thị Gross, Tax, Net và tax rule label/version ở detail.
- Hiển thị Campaign/Product/Content/source và approval/conversion reference.
- Pending giải thích chưa reconcile.
- Confirmed giải thích đã xác nhận nhưng chưa Available.
- Available hiển thị withdrawable remaining.
- Paid hiển thị payout/provider reference an toàn.
- Reversed hiển thị reason và linked adjustment; không ẩn original.
- Reference FX unavailable không làm local amount biến mất.
- Không hiển thị full bank account, OTP, secret hoặc provider payload nhạy cảm.

#### Checkpoint G17 — điều kiện mở P0b

Tất cả điều kiện sau phải đạt:

1. G15 và G16 vẫn GO.
2. CONTENT_FLAT full flow Green.
3. Money/rounding/tax/reference FX golden tests Green.
4. Ledger balanced, immutable, duplicate/reversal tests Green.
5. Earnings API/UI lấy totals từ projection/Ledger.
6. Country/user/partner isolation tests Green.
7. Không còn defect P0/P1.
8. Không có carry-over Ngày 16–17.
9. D18–D20 P0 được estimate còn tối đa 18 giờ và vẫn giữ buffer.
10. P0b không phá schema/contract critical đang Green.
11. P0b nằm sau feature flag và timebox không quá 2 giờ 45.
12. Hết timebox mà unit/integration/idempotency chưa Green thì CUT, không merge/enable code dang dở.
13. Campaign P0b dùng capability `PAID_ORDER + SALE_PERCENT`, source business key và variable-budget semantics riêng; không tái sử dụng flat deliverable/reservation constraint sai nghĩa.

Chỉ thiếu một điều kiện: P0b = CUT/DEFERRED. Đây không phải thất bại của G20.

#### Gate G17 — Earnings Gate

- Pending/Confirmed/Available/Paid/Reversed có definition và UX rõ.
- Earnings list/detail/summary khớp Ledger/projection.
- Creator không đọc Earning của profile/country khác.
- Gross–Tax–Net và source snapshot truy xuất được.
- Local currency primary; USD reference có timestamp/source/direction.
- Reference FX không bị dùng như settlement/payout rate.
- P0b decision có evidence rõ.
- Nếu P0b DONE: duplicate conversion không tạo Earning/Ledger trùng và budget cap không vượt.

### Ngày 18 — Reconciliation, Settlement FX Lock và Adjustment

#### Outcome duy nhất

Local Finance tạo, review, approve và lock được một reconciliation batch; line/totals/snapshot đã khóa không thể sửa đè, và eligible amount trở thành Available chính xác.

| Task ID | Timebox | Mũ vai trò | Dependency | Công việc | Đầu ra | Acceptance/evidence |
|---|---:|---|---|---|---|---|
| W4-D18-T01 | 30 phút | Finance/Product/QA | G17 | Khóa batch key, cutoff/timezone, eligibility, anomaly severity và state rules | Reconciliation contract | Blocker/Warning/waiver policy rõ trước schema |
| W4-D18-T02 | 1 giờ 15 | Backend/Data | T01 | Batch/Line/Snapshot/Anomaly schema + idempotent builder/claim | Batch builder | One Earning chỉ thuộc one active/final batch phù hợp |
| W4-D18-T03 | 45 phút | Backend/Domain | T02 | Anomaly engine và resolution/waiver audit | Anomaly service | Duplicate/source/money/currency/ledger/budget/already-batched/reversed cases |
| W4-D18-T04 | 1 giờ 30 | Backend/Data | T02–T03 | Review/approve/lock transaction, settlement FX snapshot, checksum và Pending→Confirmed→Available postings | Lock command | Unresolved blocker không lock; retry/concurrent lock one effect |
| W4-D18-T05 | 45 phút | Backend/Finance | T04 | Adjustment/reversal command + frozen CSV export | Correction/export | Original/locked lines không sửa; export totals/checksum khớp |
| W4-D18-T06 | 1 giờ | Frontend | T02–T05 | Finance batch list/builder/detail/anomaly/approve/lock/export UI | AD-06 slice | Totals/reasons/snapshot rõ; confirmation, denied/error/conflict states |
| W4-D18-T07 | 1 giờ | QA/Data/Security | T02–T06 | Idempotency, concurrent claim/lock, anomaly, immutability, RLS, adjustment, export và fault tests | Reconciliation evidence | API + runtime DB role không sửa locked data; totals khớp Ledger |
| W4-D18-T08 | 15 phút | Product/QA | T01–T07 | Cập nhật OpenAPI/state/RTM/evidence; Gate G18 | G18 checklist | AD-06 và phần FX lock của AD-07 Green |

Giữ 1 giờ buffer cho lock transaction, totals hoặc anomaly integration.

#### Anomaly severity P0

Blocker, không được lock:

- Duplicate Earning/business key hoặc duplicate batch line.
- Missing/invalid source.
- Gross–Tax–Net, currency, tax/FX snapshot mismatch.
- Ledger missing/imbalanced/duplicate posting.
- Campaign committed budget không reconcile.
- Earning đã thuộc batch khác hoặc đã reversed không hợp lệ.
- Wrong country/partner/cutoff.

Warning/Payout hold:

- Missing bank account.
- KYC/bank thay đổi sau khi Earning hợp lệ được tạo.
- Reference USD unavailable/stale nhưng local money đúng.
- Optional metadata thiếu.

Không xóa quyền lợi đã earn chỉ vì Creator chưa cấu hình bank. Bank/KYC hiện tại được revalidate ở payout.

#### Gate G18 — Reconciliation Gate

- Batch builder idempotent theo country/currency/cutoff/key.
- Hai Finance/builders không claim cùng Earning.
- Batch totals = tổng stored line snapshots = relevant Ledger totals.
- Anomaly hiển thị rõ; waiver nếu cho phép có permission + reason + audit.
- Blocker unresolved không lock.
- Approve/lock state transition và Ledger posting atomic/idempotent.
- Settlement FX khác Reference FX và bất biến sau lock.
- Locked batch/line/totals/snapshot không update/delete ở API và DB runtime role.
- Export dùng frozen data và có checksum/totals.
- Adjustment/reversal tạo linked record/journal.
- Finance PH không đọc/lock/export batch VN.

### Ngày 19 — Payout Intent, OTP, Allocation và Atomic Reserve

#### Outcome duy nhất

Creator tạo được payout intent bằng local currency, xác thực OTP và reserve đúng requested amount một lần; Finance thấy queue nhưng provider chưa được gọi trùng.

| Task ID | Timebox | Mũ vai trò | Dependency | Công việc | Đầu ra | Acceptance/evidence |
|---|---:|---|---|---|---|---|
| W4-D19-T01 | 30 phút | Finance/Product/QA | G18 | Khóa payout eligibility, amount/allocation, OTP binding, active-payout và idempotency rules | Payout contract | Request/reserve/provider boundary không còn mơ hồ |
| W4-D19-T02 | 1 giờ | Backend/Data | T01 | Payout Intent/Request/Allocation/Attempt schema, unique keys, RLS và immutable snapshot | Payout data model | Country/currency/profile/bank version/attempt history rõ |
| W4-D19-T03 | 1 giờ | Backend/Security | T02 | Payout-purpose OTP issue/verify/resend | OTP service | Hash, expiry, attempt/rate limit, single-use, binding và redacted audit |
| W4-D19-T04 | 1 giờ 15 | Backend/Data | T02–T03 | Verify OTP → revalidate → FIFO allocate → Available→Reserved Journal → Outbox trong one transaction | Atomic reserve command | Two concurrent requests không âm balance; failure rollback payout/reserve/outbox |
| W4-D19-T05 | 1 giờ | Full-stack | T02–T04 | Creator payout form/OTP/status/history + Finance queue tối thiểu | CR-08 request slice | Local currency, minimum, bank/KYC, amount, validation và recovery states rõ |
| W4-D19-T06 | 1 giờ 30 | QA/Security/Data | T02–T05 | OTP, same-key/different-payload, double-click, two-key concurrency, allocation, RLS và fault tests | Payout reserve evidence | One logical payout/reserve; balance không double spend |
| W4-D19-T07 | 45 phút | Product/QA | T01–T06 | Cập nhật OpenAPI/state/RTM/evidence; Gate G19 | G19 checklist | Request/reserve phần CR-08 và queue AD-07 Green |

Giữ 1 giờ buffer cho OTP/reserve concurrency. Provider call thuộc Ngày 20.

#### Eligibility và reserve order

Eligibility bắt buộc:

- Creator country profile active.
- KYC phù hợp payout policy.
- Bank account approved và đúng country; dùng immutable bank version snapshot.
- Payout currency đúng local country currency.
- Requested amount > 0, đúng minor unit, đạt minimum và <= Available.
- Chỉ Available amount được allocate; Pending/Confirmed/Reserved không được rút.
- Không có conflicting active payout theo MVP policy.
- OTP đúng purpose, intent, profile, country, amount, currency và bank version.
- Idempotency same key/same payload trả same result; same key/different payload conflict.

Order:

~~~text
Create Payout Intent
→ issue/verify OTP
→ lock/revalidate profile + bank + available Ledger projection
→ create allocations
→ post Available → Payout Reserved
→ create/update Payout Request
→ write Outbox
→ audit
→ commit
→ worker gọi provider sau commit
~~~

#### Gate G19 — Payout Reserve Gate

- USD không thể là payout currency.
- Available lấy từ Ledger/projection, không tin amount/balance từ UI.
- OTP sai/hết hạn/dùng lại/vượt attempt/rate limit bị chặn.
- OTP cũ invalid khi amount/currency/bank version thay đổi.
- Reserve Journal cân bằng và exactly once.
- Allocation tổng bằng requested amount và không vượt remaining Available.
- Double-click/same key tạo one payout/reserve.
- Hai key concurrent không double spend hoặc làm Available âm.
- Payout/outbox/audit failure rollback toàn transaction.
- Creator không đọc payout/bank của người khác; Finance queue country-scoped.
- Worker chưa thể gửi hai payment instruction cho cùng active attempt.

### Ngày 20 — Provider Lifecycle, Safe Retry và Gate G20

#### Outcome duy nhất

Mock provider xử lý success, confirmed failure, timeout/unknown, duplicate callback và retry mà không trả hoặc hoàn tiền sai; VN/PH full money flow chạy từ seed.

| Task ID | Timebox | Mũ vai trò | Dependency | Công việc | Đầu ra | Acceptance/evidence |
|---|---:|---|---|---|---|---|
| W4-D20-T01 | 30 phút | Finance/QA | G19 | Khóa provider attempt/event/outbox, terminal/unknown và retry rules; tạo deterministic fixtures | Provider contract | Timeout không bị coi là confirmed failure |
| W4-D20-T02 | 1 giờ 15 | Backend/Integration | T01 | Mock Payment Provider adapter, worker, attempt, stable idempotency, event inbox/signature check | Provider integration | Success/failure/timeout/duplicate/out-of-order deterministic |
| W4-D20-T03 | 1 giờ 30 | Backend/Data | T02 | Atomic lifecycle handlers và Ledger effects cho success/failure/release/late result | Money handlers | Paid hoặc release exactly once; state/allocation/Ledger/audit đồng bộ |
| W4-D20-T04 | 45 phút | Backend/Finance | T02–T03 | UNKNOWN reconcile/status query + transport retry + post-failure explicit business retry | Safe retry flow | Unknown giữ reserve; same attempt same key; new attempt chỉ sau re-reserve |
| W4-D20-T05 | 30 phút | Data/Product | T03–T04 | Hoàn thiện PH money/tax/FX/minimum/provider fixtures và disclosure synthetic | VN/PH config | Cùng code path, khác config; local payout đúng PHP/VND |
| W4-D20-T06 | 1 giờ 30 | QA/Security/Data | T02–T05 | Full VN/PH E2E, duplicate callback, timeout/late result, concurrent release/success, retry và clean-seed tests | Full money evidence | Không duplicate payment/release/posting; totals cuối flow cân bằng |
| W4-D20-T07 | 1 giờ | Solo Dev + Mentor | T01–T06 | P0 fix buffer, demo, RTM/evidence/tracker/log và GO/CONDITIONAL GO/NO-GO | Gate G20 | Handoff sang W5-D21-T01 rõ |

Giữ 1 giờ buffer ngoài bảng cho P0/P1 money/security/idempotency blocker. Ngày 20 không bắt đầu feature còn thiếu từ Ngày 16–19.

#### Provider effect bắt buộc

Success:

- Attempt → SUCCEEDED.
- Payout → PAID.
- Payout Reserved → Payment Clearing đúng một lần.
- Allocation paid amount cập nhật từ posting/projection.
- Earning full paid mới thành PAID.
- Lưu provider reference và redacted audit.

Confirmed failure:

- Attempt → FAILED_FINAL.
- Payout Reserved → Creator Available đúng một lần.
- Allocations được release đúng amount.
- Payout → BALANCE_RELEASED/FAILED.
- Không xóa attempt hoặc original reserve/release journals.

Timeout/UNKNOWN:

- Không auto release/refund.
- Không tạo payment instruction mới.
- Giữ reserve.
- Finance thấy UNKNOWN/Needs Reconciliation.
- Query provider/callback resolution quyết định success hoặc confirmed failure.

Retry:

- Network/transport retry của same attempt dùng same provider idempotency key.
- Sau FAILED_FINAL và balance release, explicit retry phải revalidate eligibility và re-reserve.
- Explicit retry tạo attempt_seq mới; không overwrite attempt cũ.
- Chỉ một active attempt cho cùng payout.

Duplicate/out-of-order callback:

- Unique provider + external_event_id.
- Same event trả no-op/same result.
- Không thêm Journal hoặc terminal transition lần hai.
- UNKNOWN nhận late success phải settle Paid, không release.
- Failure/success race phải serialize; không vừa Paid vừa Available.

Provider refund sau success:

- Không update xóa Paid history.
- Tạo provider-refund event + linked adjustment/reversal Journal đúng một lần.
- Full refund UI/workflow nâng cao có thể là P1, nhưng primitive và idempotency phải được model/test.

#### Gate G20 — Week 4 E2E Gate

Pass khi:

- CP-06, CP-08, AD-06, AD-07, CR-07 và CR-08 có implementation/evidence MVP.
- G15 vẫn Green sau money integration.
- Money dùng exact decimal; API amount/rate là decimal string.
- VND/PHP golden rounding tests Green; Gross = Tax + Net.
- Reward, tax, reference FX và settlement FX snapshots bất biến.
- Reference FX không được dùng làm settlement/payout amount.
- Ledger Journal cân bằng, append-only và không duplicate posting.
- Earning lifecycle, reversal và Creator Earnings totals Green.
- Reconciliation anomaly/approve/lock/export/adjustment Green.
- Locked batch/line/snapshot bất biến ở application và DB runtime role.
- Available chỉ hình thành từ eligible line sau lock.
- OTP expiry/attempt/reuse/binding/audit Green.
- Payout request/allocation/reserve idempotent và chống double spend.
- Provider success/failure/unknown/retry/duplicate event Green.
- Confirmed failure release đúng một lần.
- Timeout/UNKNOWN không release sớm hoặc gửi payment mới.
- Full VN và PH money flow chạy từ seed hai lần liên tiếp.
- Cross-user/country/partner direct-ID, RBAC và RLS regression Green.
- Migration/seed/verify/build/clean restart Green.
- P0b có status DONE hoặc CUT/DEFERRED, không dang dở.
- 0 P0, 0 P1 và không có P2 ảnh hưởng Must money flow.

## 10. Test matrix bắt buộc

### 10.1. Money, Tax và FX

| Test ID | Scenario | Expected result | Stop-release |
|---|---|---|---|
| W4-MON-01 | VND/PHP Gross hợp lệ | Persist/serialize exact; correct currency scale | Có |
| W4-MON-02 | Amount vượt currency scale | Reject rõ, không truncate âm thầm | Có |
| W4-MON-03 | Tax boundary .5 VND/PHP | Đúng rounding mode snapshot | Có |
| W4-MON-04 | Gross − Tax | Exact Net; Gross = Tax + Net | Có |
| W4-MON-05 | Tax 0%, âm hoặc vượt bound | 0% hợp lệ khi rule explicit; invalid rate denied | Có |
| W4-MON-06 | Tax config đổi sau Earning | Earning cũ giữ snapshot; Earning mới dùng version mới | Có |
| W4-MON-07 | Tax rule/profile thiếu | Hold/anomaly; không default 0 | Có nếu âm thầm trả sai |
| W4-MON-08 | FX 0/âm/wrong pair/direction | Reject | Có |
| W4-MON-09 | Reference FX unavailable | Local amount đúng; USD marked unavailable; không fabricate | Không nếu local đúng |
| W4-MON-10 | FX đổi sau Earning/Batch lock | Historical snapshots không đổi | Có |
| W4-MON-11 | Batch nhiều rounded lines | Total = sum stored lines | Có |
| W4-MON-12 | Maximum precision/overflow | Fail rõ và rollback | Có |
| W4-MON-13 | Cross-currency arithmetic không explicit conversion | Denied | Có |

### 10.2. Earning và Ledger

| Test ID | Scenario | Expected result | Stop-release |
|---|---|---|---|
| W4-ERN-01 | Existing Commercial Pending Earning từ G15 | Idempotent financialization/backfill → one official Pending Earning + initial Journal | Có |
| W4-ERN-02 | Double/concurrent approve/replay | One Earning, one posting | Có |
| W4-ERN-03 | Pending→Confirmed→Available | Chỉ valid command/order; posting/state atomic | Có |
| W4-ERN-04 | Skip/backward transition | Denied | Có |
| W4-ERN-05 | State command retry | Same result, no duplicate posting | Có |
| W4-ERN-06 | Reversal retry/over-reversal | One linked effect; over-reversal denied | Có |
| W4-ERN-07 | Historical detail | Source + reward/tax/FX snapshots truy được | Có |
| W4-LED-01 | Normal Journal | Debit = Credit exact per currency | Có |
| W4-LED-02 | Unbalanced/cross-currency Journal | Transaction không commit | Có |
| W4-LED-03 | Same key/same payload | Existing Journal returned | Có |
| W4-LED-04 | Same key/different payload | Conflict | Có |
| W4-LED-05 | API/runtime SQL update/delete | Denied | Có |
| W4-LED-06 | Failure giữa entries | Rollback toàn Journal | Có |
| W4-LED-07 | Balance cache/projection lệch | Verification phát hiện/rebuild được | Có |
| W4-LED-08 | Cross-country/source mismatch | Denied | Có |

### 10.3. Earnings API/UI và P0b

| Test ID | Scenario | Expected result | Stop-release |
|---|---|---|---|
| W4-UIE-01 | Summary/list/detail totals | Khớp Ledger/projection | Có |
| W4-UIE-02 | Pending/Confirmed/Available/Paid/Reversed | State/amount/next step đúng | Có |
| W4-UIE-03 | Local + USD reference | Local primary; reference labeled with rate/time/source | Có nếu làm sai payout |
| W4-UIE-04 | Creator/profile/country khác | Denied/404 an toàn | Có |
| W4-UIE-05 | Reversed historical Earning | Original và reason vẫn hiển thị | Có nếu history mất |
| W4-CNV-01 | Same provider event hai lần | One Conversion/Earning/Journal | Có nếu P0b DONE |
| W4-CNV-02 | Percentage rounding/budget cap | Exact commission; no overspend | Có nếu P0b DONE |
| W4-CNV-03 | Unsupported/non-flagged CPS | Denied; no silent activation | Có |

### 10.4. Reconciliation

| Test ID | Scenario | Expected result | Stop-release |
|---|---|---|---|
| W4-REC-01 | Same build key/retry | One batch/same result | Có |
| W4-REC-02 | Two Finance claim same Earning | One line assignment | Có |
| W4-REC-03 | Batch totals | Exact sum stored lines và Ledger | Có |
| W4-REC-04 | Unresolved blocker anomaly | Lock denied | Có |
| W4-REC-05 | Lock twice/concurrently | One lock/business effect | Có |
| W4-REC-06 | Lock và adjustment concurrent | Serialized; không mất adjustment | Có |
| W4-REC-07 | Update/add/delete after lock | Denied ở API và DB | Có |
| W4-REC-08 | Config/FX đổi after lock | Batch/snapshot unchanged | Có |
| W4-REC-09 | Correction after lock | Linked adjustment/new batch | Có |
| W4-REC-10 | Export retry | Same frozen data/totals/checksum | Có |
| W4-REC-11 | Audit/outbox failure during lock | Lock rollback hoặc recoverable, no half-state | Có |
| W4-REC-12 | Finance wrong country | Denied | Có |

### 10.5. OTP, Payout và Provider

| Test ID | Scenario | Expected result | Stop-release |
|---|---|---|---|
| W4-PAY-01 | Valid local payout + OTP | One reserve and payout | Có |
| W4-PAY-02 | Insufficient/minimum/KYC/bank/currency invalid | Denied; no reserve | Có |
| W4-PAY-03 | Same key double-click | One payout/reserve | Có |
| W4-PAY-04 | Same key different amount/bank | Conflict | Có |
| W4-PAY-05 | Two concurrent payout keys | No double spend; Available non-negative | Có |
| W4-PAY-06 | OTP wrong/expired/reused/over-attempt | Denied; no reserve; audit redacted | Có |
| W4-PAY-07 | Amount/bank change after OTP | Old OTP invalid | Có |
| W4-PAY-08 | Failure between payout/reserve/outbox | Whole transaction rollback | Có |
| W4-PAY-09 | Worker retry before provider result | Same active attempt/provider key | Có |
| W4-PAY-10 | Provider accepted but response lost | UNKNOWN; reserve held; no new payment | Có |
| W4-PAY-11 | Duplicate success callback | One Paid Journal | Có |
| W4-PAY-12 | Duplicate confirmed failure | One release Journal | Có |
| W4-PAY-13 | Late success after timeout | Paid, no release | Có |
| W4-PAY-14 | Failure/success race | Serialized; never both Paid and Available | Có |
| W4-PAY-15 | Explicit retry after failure | Revalidate/re-reserve; new attempt; no double pay | Có |
| W4-PAY-16 | Provider refund after success duplicate | One linked reversal/refund effect | Có nếu primitive enabled |
| W4-PAY-17 | Callback invalid signature/out-of-order | Denied or no-op safely | Có |
| W4-PAY-18 | Process crash after provider success before DB update | Reconcile without second payment | Có |
| W4-PAY-19 | Wrong creator/country/Finance role | Denied | Có |
| W4-PAY-20 | Logs/audit | Không OTP/full bank/secret/provider sensitive payload | Có |

### 10.6. Concurrency/fault-injection invariant

PostgreSQL thật phải kiểm tra:

- Hai worker tạo/post cùng Earning.
- Tax/FX config update trong lúc Earning được tạo.
- Hai batch claim cùng Earning.
- Hai Finance lock cùng batch.
- Adjustment và lock cùng lúc.
- Hai payout request tranh cùng Available.
- Hai OTP verify cùng intent.
- Payout reserve và Earning reversal cùng lúc.
- Provider timeout reconcile và late callback cùng lúc.
- Failure release và success callback race.
- Hai refund/release workers xử lý cùng event.
- Deadlock/serialization retry.

Sau mọi interleaving:

~~~text
gross = tax + net
ledger_debit = ledger_credit theo currency
available >= 0
payout_reserved >= 0
one source has one posting effect
locked batch is immutable
never both Paid and Released for the same attempt outcome
~~~

## 11. Definition of Done cho vertical slice Tuần 4

Một story chỉ được đánh dấu DONE khi có:

- Domain/state/rounding/snapshot/idempotency rules được ghi rõ.
- Migration/schema/constraint/index/RLS/DB permission phù hợp.
- Backend command/query và transaction/outbox boundary.
- Exact decimal; no float.
- Country/partner/profile ownership, RBAC và RLS.
- Audit có actor/system actor, source, correlation/event ID và redaction.
- UI loading, empty, validation, denied, conflict, unknown và recovery state.
- i18n key + local currency/time formatting.
- Unit/integration/negative test.
- PostgreSQL concurrency/fault test cho money effect.
- Idempotency same-key/same-payload và payload-mismatch cases.
- OpenAPI/ERD/State/Permission/RTM cập nhật.
- Deterministic seed/fixture; không secrets/real PII.
- Lint, type-check, test và build Green.
- Command/file evidence trong WEEK4_EVIDENCE.md.

UI hiển thị đúng một con số trong happy path không đủ để đánh dấu Money/Reconciliation/Payout DONE.

## 12. Mục tiêu trạng thái requirement cuối Tuần 4

| ID | Mục tiêu cuối tuần | Evidence | Lưu ý |
|---|---|---|---|
| CP-06 | DONE mức MVP | Local primary + USD reference snapshot/display/fallback tests | Payout vẫn local; realtime FX là P1 |
| CP-08 | DONE mức MVP | Gross–Tax–Net, version, rounding golden tests | Synthetic tax; không legal claim |
| AD-06 | DONE mức MVP | Batch/anomaly/approve/lock/adjustment/export E2E | External import/advanced dashboard ngoài P0 |
| AD-07 | DONE mức MVP | Settlement FX lock + payout success/failure/unknown/retry | Provider thật ngoài P0 |
| CR-07 | DONE mức MVP | Earnings list/detail/source/status/Gross–Tax–Net | Forecast/chart ngoài P0 |
| CR-08 | DONE mức MVP | OTP/request/reserve/status/failure release E2E | Push/native app ngoài P0 |
| AD-02 | IN_PROGRESS | Audit mở rộng money/batch/payout/provider | Final completeness regression Tuần 5 |
| CP-02 | IN_PROGRESS | RLS/country tests mở rộng Ledger/Reconciliation/Payout | Final security regression Tuần 5 |
| CP-05 | IN_PROGRESS | Money/status UI i18n/fallback | Final audit Tuần 5 |
| P0b CPS | DONE hoặc CUT | G17 decision + evidence | CUT không làm G20 fail |

Không đánh dấu AD-02, CP-02 hoặc CP-05 DONE trước regression/hardening Tuần 5.

## 13. Gate cuối Tuần 4

### GO

Chuyển sang hardening Tuần 5 khi:

- [ ] Gate G15 vẫn Green.
- [ ] CP-06, CP-08, AD-06, AD-07, CR-07, CR-08 có evidence MVP.
- [ ] No float; decimal serialization/scale/overflow Green.
- [ ] VND/PHP golden rounding và Gross = Tax + Net Green.
- [ ] Reward/tax/reference FX/settlement FX snapshots bất biến.
- [ ] Reference FX không ảnh hưởng local payout.
- [ ] Ledger balanced, append-only, unique posting và reversal Green.
- [ ] Runtime role không update/delete Ledger hoặc locked batch.
- [ ] Earnings totals/state/source/ownership Green.
- [ ] Reconciliation anomaly/approve/lock/adjust/export Green.
- [ ] Một Earning không xuất hiện trong hai locked batches.
- [ ] Available chỉ gồm eligible net amount sau lock.
- [ ] OTP expiry/attempt/reuse/binding/redaction Green.
- [ ] Payout idempotency/allocation/reserve/concurrency Green.
- [ ] Provider success/failure/UNKNOWN/retry/duplicate callback Green.
- [ ] Confirmed failure release đúng một lần.
- [ ] Timeout giữ reserve và có reconcile path.
- [ ] VN/PH money flow từ seed chạy hai lần liên tiếp.
- [ ] Fault-injection không để half-state.
- [ ] Cross-user/country/partner money isolation Green.
- [ ] Migration/seed/verify/build/clean restart Green.
- [ ] P0b ghi DONE hoặc CUT; không có code dang dở.
- [ ] 0 P0, 0 P1; không P2 ảnh hưởng Must flow.

### CONDITIONAL GO

Chỉ chấp nhận:

- P0b mock CPS bị CUT/DEFERRED.
- Finance/Earnings charts hoặc advanced filter chưa có.
- CSV styling chưa đẹp nhưng frozen data/totals/checksum đúng.
- Minor responsive/copy/i18n polish còn lại nhưng fallback hoạt động.
- Reference USD tạm unavailable trong fixture lỗi, có nhãn rõ và local amount đúng.
- Provider/payment/eKYC/OAuth thật chưa tích hợp.

Mỗi item phải vào known limitations/backlog; không ảnh hưởng money correctness, isolation hoặc E2E.

### NO-GO

Không chuyển sang UX polish/release nếu còn:

- G15 Earning source không đáng tin.
- Dùng float, rounding không xác định hoặc sai một golden money case.
- Gross ≠ Tax + Net.
- Snapshot recompute hồi tố.
- Ledger imbalance, mutable hoặc duplicate posting.
- Campaign committed budget, Earning Gross và Ledger không reconcile.
- Earning state và Ledger lệch.
- Locked batch/line/snapshot sửa được.
- Unresolved blocker vẫn lock được.
- Reference FX bị dùng làm settlement/payout amount.
- Available chứa Pending/Confirmed chưa lock.
- OTP bypass/reuse hoặc amount/bank đổi sau verify vẫn dùng OTP cũ.
- Double reserve, double spend hoặc double provider send.
- Timeout/UNKNOWN tự release hoặc retry thành payment instruction mới.
- Failure release thiếu/thừa một lần.
- Success callback và release race khiến vừa Paid vừa Available.
- Cross-user/country/partner money leak.
- Audit chứa OTP/full bank/secrets hoặc thiếu critical event.
- Demo cần sửa DB thủ công.

Nếu G20 NO-GO, đầu Tuần 5 phải sửa money invariant trước; không làm responsive, documentation hoặc rehearsal trước.

## 14. P1/Stretch và thứ tự cắt scope

### P1/Stretch Tuần 4

1. Mock conversion/CPS P0b.
2. Rich Earnings/Finance charts.
3. Realtime/multiple FX providers.
4. Tax bracket/legal engine.
5. External reconciliation import.
6. Advanced anomaly/risk scoring.
7. XLSX/BI report.
8. Multiple settlement currencies.
9. Automatic provider retry scheduler.
10. Multiple bank accounts/split/bulk payout.
11. Provider refund/dispute UI nâng cao.
12. Public webhook/real payment integration.

### Thứ tự cắt khi trễ

1. Cắt toàn bộ P0b CPS/conversion.
2. Cắt charts và advanced Earnings/Finance filters.
3. Cắt external reconciliation import; giữ internal batch.
4. Giữ anomaly Blocker core; cắt scoring/rules phụ.
5. Cắt XLSX; giữ frozen CSV.
6. Giữ local payout + USD reference; cắt multi-settlement currency.
7. Giữ versioned flat tax; cắt tax complexity.
8. Giữ manual safe retry; cắt auto scheduler.
9. Giữ one payout/queue; cắt bulk/split/multiple banks.
10. Giữ API/action adjustment; cắt rich adjustment UI.

Không được cắt:

- Exact decimal, scale, rounding và Gross–Tax–Net.
- Reward/tax/FX snapshots.
- Balanced append-only Ledger.
- Earning source/idempotency.
- Reconciliation anomaly core và immutable lock.
- Available chỉ sau lock.
- OTP binding/expiry/attempt.
- Atomic allocation/reserve/outbox.
- Success/failure/UNKNOWN semantics.
- Release/refund exactly once.
- Country/RBAC/RLS/audit/redaction.
- PostgreSQL concurrency/fault tests.

## 15. Risk register Tuần 4

| Risk | Trigger | Hành động giảm thiểu/contingency |
|---|---|---|
| G15 source không ổn | Duplicate/missing Earning hoặc budget lệch | Dừng Ledger; sửa source invariant; cắt P0b; replan nếu quá một ngày |
| Decimal inconsistency | Amount bị convert sang JS number/float | Money type/serialization lint/review rule; golden tests ở command/API/DB |
| Rounding drift | Batch total khác tổng lines | Round từng line một lần; totals từ stored lines |
| Tax/FX hồi tố | UI/reconciliation query config hiện tại | Snapshot ID/value/rule/time; historical query chỉ dùng snapshot |
| Ledger quá phức tạp | Xây general accounting framework | Chỉ P0 accounts/posting matrix cần cho earning/reconciliation/payout |
| Ledger mutable | Service hoặc runtime DB role có update/delete | Append-only repository + revoke DB privileges + negative SQL test |
| Day 17 scope creep | P0b được mở khi core vừa đủ Green | G17 all-or-nothing; default CUT; hard timebox/feature flag |
| Reconciliation hostage bởi bank | Missing bank chặn cả batch | Bank là warning/payout hold; không xóa earned entitlement |
| Batch lock race | Hai Finance lock/adjust cùng lúc | Expected version/row lock/unique line claim; concurrency test |
| Balance cache sai | Payout tin mutable balance column | Derive/verify projection từ Ledger; reserve dưới wallet/ledger lock |
| OTP security | OTP log/plaintext/reuse hoặc không bind amount | Hash, expiry, attempts, intent binding và redaction tests |
| Provider gọi trong DB transaction | Long lock/duplicate external effect | Transactional outbox; worker + stable idempotency |
| Timeout coi là failure | Auto release rồi late success | UNKNOWN giữ reserve; status reconcile trước terminal decision |
| Failure vs refund lẫn nghĩa | Worker/UI đảo sai Ledger | Tách BALANCE_RELEASED và post-success REFUND/REVERSAL |
| Callback race | Success và failure/release xử lý cùng lúc | Event inbox unique + state/row lock + terminal transition guard |
| Day 20 thành feature day | D16–D19 còn core thiếu | Cắt P0b/polish; D20 chỉ provider integration, test, fix và gate |

## 16. Demo cuối Tuần 4

Thời lượng mục tiêu: 12–15 phút.

1. Nhắc lại Pending Earning từ approved content và immutable join snapshot.
2. Mở Earning detail: source, Gross–Tax–Net, tax version, local currency và USD reference.
3. Đổi tax/FX config fixture và chứng minh Earning lịch sử không đổi.
4. Finance tạo reconciliation batch có một blocker anomaly và một missing-bank warning.
5. Sửa/resolve blocker có audit; chứng minh missing bank không xóa earned amount nhưng sẽ chặn payout.
6. Finance approve/lock batch; settlement snapshot/checksum được chốt và amount thành Available.
7. Thử sửa locked line/batch bằng API và chứng minh bị chặn.
8. Creator bổ sung bank fixture nếu cần, tạo payout, nhập OTP sai/hết hạn rồi OTP đúng.
9. Double-click payout request và chứng minh chỉ có một reserve.
10. Mock provider trả confirmed failure; balance được release đúng một lần.
11. Gửi duplicate failure event và chứng minh không release lần hai.
12. Explicit retry: revalidate/re-reserve, provider success và Payout thành Paid đúng một lần.
13. Chạy timeout/UNKNOWN fixture: reserve vẫn giữ, không auto refund/retry.
14. Chuyển VN/PH để chứng minh local currency/config và country isolation.
15. Nếu P0b DONE: ingest cùng conversion hai lần nhưng chỉ một Earning. Nếu P0b CUT: thay bằng retry Approve/callback exactly-once evidence.

Không trình diễn bằng cách sửa DB thủ công.

## 17. Handoff sang Tuần 5 — Ngày 21

Next exact action sau Gate G20 GO:

1. Chạy full E2E/security/tenancy/idempotency regression tại W5-D21-T01.
2. Không mở feature mới trước khi toàn bộ money stop-release Green.
3. Dùng Week 4 evidence để tạo traceability pack cho sáu Must.
4. Sau đó mới harden responsive, i18n, accessibility, performance, docs và release.

Trước khi đóng Tuần 4, cập nhật Plan/00_PROJECT_EXECUTION_LOG.md với:

- DONE/IN_PROGRESS/NOT DONE thực tế.
- Gate G20: GO, CONDITIONAL GO hoặc NO-GO.
- Feature tracker thực tế cho CP-06, CP-08, AD-06, AD-07, CR-07, CR-08.
- P0b status DONE hoặc CUT/DEFERRED.
- Gross–Tax–Net/rounding/snapshot evidence.
- Ledger balance/immutability/reversal evidence.
- Reconciliation anomaly/lock/export evidence.
- Payout OTP/reserve/provider/failure/UNKNOWN/retry evidence.
- VN/PH country isolation và clean restart evidence.
- P0/P1 defects, flaky tests, known limitations và synthetic tax/FX disclosure.
- Next exact action W5-D21-T01.

Nếu G20 còn NO-GO money defect, Tuần 5 bắt đầu bằng sửa defect đó; không chuyển sang polish, tài liệu hoặc demo rehearsal.
