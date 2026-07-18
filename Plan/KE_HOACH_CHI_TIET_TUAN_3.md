# KẾ HOẠCH TRIỂN KHAI CHI TIẾT TUẦN 3

> Dự án: Affiliate GLOBAL  
> Thời lượng: Ngày 11–15, khoảng 40 giờ  
> Nguồn phạm vi: `Plan/docs/Book1.xlsx`, kế hoạch 5 tuần và kế hoạch chi tiết Tuần 1–2  
> Trạng thái khi lập kế hoạch: Pre-implementation; Tuần 1–2 chưa được thực thi  
> Điều kiện bắt đầu: Gate G10 Tuần 2 phải đạt `GO` hoặc `CONDITIONAL GO` không liên quan Auth/Country/KYC/Security  
> Mục tiêu tuần: hoàn thành vertical slice Campaign → Join → Tracking → Content → Review → Pending Earning

## 1. Kết quả bắt buộc cuối Tuần 3

Tuần 3 phải tạo ra phần sản phẩm affiliate cốt lõi, nhưng vẫn giữ đúng phạm vi Phase 1: một flat reward được tạo khi content hợp lệ được duyệt.

Cuối tuần phải chứng minh được bảy kết quả:

1. **Product, Offer và Campaign là ba entity riêng:** không gộp catalog, commercial rule và execution campaign vào một bảng/form khổng lồ.
2. **Cover nhiều product bằng canonical model:** seed được ít nhất sáu product archetype mà không thêm bảng/service theo Beauty, SaaS, Travel, App hoặc Finance.
3. **Campaign activation an toàn:** Local Admin chỉ kích hoạt campaign đúng country khi Product/Offer/reward/budget/date/terms/localization/capability hợp lệ.
4. **Discovery, eligibility và join chạy thật:** Creator đúng country, KYC Approved, campaign Active và còn slot/budget mới join được; join idempotent và transactional.
5. **Commercial snapshot bất biến:** terms, reward, currency, Offer/Campaign version và accepted time được snapshot lúc join.
6. **Tracking và Content E2E:** Creator nhận asset cá nhân, submit URL; Ops request changes/reject có reason; Creator resubmit giữ lịch sử; stale review bị chặn.
7. **Reward business effect đúng một lần:** approve content chuyển budget `reserved → committed` và tạo đúng một `Pending Earning` trong cùng transaction.

Kết quả cuối tuần là **Commercial Pending Earning có source, gross reward amount, currency, immutable reward snapshot và stable business key**. G16 Tuần 4 phải financialize record này bằng tax/reference-FX snapshot, Gross–Tax–Net và initial balanced Journal đúng một lần; sau G16 không được tồn tại PENDING Earning orphan chưa financialized.

## 2. Entry Gate và phạm vi tuần

### 2.1. Điều kiện bắt đầu Ngày 11

Trước `W3-D11-T01`, phải có bằng chứng:

- Gate G10 Tuần 2 đạt `GO`, hoặc chỉ còn debt về OAuth thật/visual polish/non-critical translation.
- Không còn country leak, RLS pool-context leak, role/MFA bypass, PII leak hoặc KYC history overwrite.
- Auth, năm role, country context, scoped repository, RLS, audit và i18n pattern đang Green.
- Có Local Admin, Local Ops và Creator fixtures cho VN/PH.
- Có ít nhất một Creator VN và một Creator PH KYC `Approved`; có thêm một profile `Needs Changes` để test eligibility denial.
- Country config/currency/locale có trong DB; migration/seed/verify/clean restart Green.
- ERD/API/state/permission đã khóa Product → Offer → Campaign, join snapshot và content lifecycle.
- Error envelope, pagination, idempotency, expected-version và audit convention đã tồn tại.

Nếu carry-over Tuần 2 vượt nửa ngày, cắt toàn bộ stretch Tuần 3. Nếu mất hơn một ngày để đóng G10, phải replan thay vì lấy thời gian integration Ngày 15.

### 2.2. P0 bắt buộc Tuần 3

- Product, Offer, Reward Rule/Version, Campaign, Localization và Terms là entity/record riêng.
- Sáu product archetype bằng seed/config; không có category-specific service/table.
- Product/Offer read API; Campaign create/update/activate API và Campaign Builder tối thiểu.
- Reward capability registry: `CONTENT_FLAT` được chạy; strategy chưa hỗ trợ không được activate.
- Campaign state Draft/Active/Paused/Closed; derived Full/Ended.
- Activation validation đầy đủ.
- Creator campaign list/detail, locale fallback, eligibility reason codes.
- Join idempotency, concurrency, participant cap và budget reservation.
- Terms/reward/currency/version snapshot tại Join.
- My Campaigns và Campaign Workspace.
- Tracking asset cá nhân: một loại Link, Code hoặc Hashtag theo Campaign.
- Content submission/version, URL/platform/hashtag validation và duplicate protection.
- Ops queue/detail, review reason, partial/recoverable resubmit, stale-state handling.
- Bulk review tối thiểu trả kết quả từng item.
- FlatReward service, Pending Earning và exactly-once business key.
- Approve + earning + budget commitment + audit trong một transaction.
- Country/RBAC/RLS/audit/i18n áp dụng cho mọi entity/API/UI mới.
- Basic campaign counters và CSV là vế Must của AD-09 nhưng chỉ bắt đầu sau core Green; nếu không đủ timebox, G15 chỉ Conditional và AD-09 giữ IN_PROGRESS tới trước G22.

### 2.3. Không phải P0 Tuần 3

- Mock conversion ingestion, click attribution hoặc CPS calculation.
- Affiliate-network/deep-link/short-link provider thật.
- Percentage, tiered, recurring, CPL hoặc CPI reward execution.
- Product/Offer CRUD UI đầy đủ; P0 dùng seed/read API và Campaign Builder tham chiếu catalog.
- Generic eligibility/rule builder.
- Social API scraping/verifying/embed/preview thật.
- Click analytics, fraud detection hoặc recommendation.
- Nhiều tracking asset type đồng thời cho một participation.
- Rich moderation annotation, content diff hoặc async bulk jobs.
- Advanced analytics/dashboard/chart.
- Ledger, Gross–Tax–Net, FX, reconciliation và payout.

## 3. “Cover all product affiliate” ở mức trung thực

Phase 1 không thể tích hợp mọi affiliate network và conversion mechanism. Bằng chứng cần đạt là **canonical model + capability-based design**, không phải tuyên bố mọi strategy đã chạy.

### 3.1. Canonical model

```text
Partner
  → Product              (thứ được quảng bá, reusable)
    → Offer              (conversion goal + commercial/reward terms theo market)
      → Campaign         (execution theo country, time, brief, channel, budget)
        → Participation  (creator join + immutable snapshot + liability reservation)
          → Tracking Asset
          → Deliverable / Content Submission + Versions
            → Review Decision
              → Pending Earning
```

### 3.2. Ownership/scope đề xuất

- `Product`: partner-scoped, có thể dùng lại ở nhiều country; không chứa KYC/creator/local finance data.
- `Offer`: thuộc Product, country/currency-specific trong Phase 1.
- `Campaign`: thuộc một Offer và bắt buộc cùng country/currency policy.
- Local Admin chỉ quản lý Offer/Campaign trong country và partner assignment của mình.
- Global Admin có thể quản lý Product/catalog theo permission; mọi cross-scope action có audit.
- Brand Portal không tồn tại; Partner/Product seed được vận hành qua internal admin/data fixture.

### 3.3. Product extension pattern

- Core typed fields: product ID, partner, type, status, display/reference data.
- `attributes` mở rộng bằng JSONB/config nhưng phải có schema validation theo `product_type`; không dùng JSON tùy ý không kiểm soát.
- Core eligibility/join/content/reward không branch theo `Beauty/SaaS/Travel/App`.
- Offer khai báo `conversion_goal`, `reward_strategy`, `currency`, `terms`, cap/hold metadata và capability status.
- Strategy chưa được implement phải trả `CAPABILITY_NOT_ENABLED_IN_PHASE1`; không fallback âm thầm sang flat reward.

Canonical capability vocabulary:

~~~text
CONTENT_APPROVED + CONTENT_FLAT = executable core P0
PAID_ORDER + SALE_PERCENT       = business label CPS, optional P0b
QUALIFIED_LEAD + LEAD_FLAT      = modeled-only
APP_INSTALL + INSTALL_FLAT      = modeled-only
SUBSCRIPTION + RECURRING_*      = modeled-only
~~~

`CPS` là business label; enum strategy là `SALE_PERCENT`. Khi G17 mở P0b, chỉ capability `PAID_ORDER + SALE_PERCENT` của campaign P0b riêng được enable; việc này không đồng nghĩa hoàn thành percentage rollout `CP-09`.

### 3.4. Sáu archetype seed

| Archetype | Product type | Offer/conversion tương lai | Trạng thái Tuần 3 |
|---|---|---|---|
| VN Beauty | Physical commerce | Paid order/CPS | Product/Offer draft + một Content Flat Campaign chạy thật |
| PH SaaS | SaaS subscription | Subscription/recurring | Product/Offer draft + một Content Flat Campaign dùng cùng core flow |
| VN Education | Digital course/lead | Qualified lead/CPL | Modeled/seed only |
| PH Travel | Booking | Completed booking/percentage | Modeled/seed only |
| Mobile App | App | Install/activation/CPI | Modeled/seed only |
| Marketplace | Marketplace | Promo code/order attribution | Modeled/seed only |

Bằng chứng bắt buộc:

- Seed cả sáu mà không migration hoặc service theo category.
- Hai product type khác nhau chạy cùng Content Flat flow.
- Có ít nhất một CPS/recurring Offer ở trạng thái Draft/capability preview nhưng không activate.
- Thêm archetype thứ bảy bằng seed/config test không sửa Campaign/Join/Reward core.

## 4. Thứ tự ưu tiên và dependency

| Thứ tự | Chức năng | Mức | Dependency/lý do |
|---:|---|---|---|
| 1 | Regression Gate G10 | P0 | Không xây Campaign trên Auth/Country/KYC foundation lỗi |
| 2 | Product/Offer/Reward/Campaign schema + capability model | P0 | Là source of truth cho mọi flow tuần |
| 3 | Seed catalog + Campaign Draft Builder | P0 | Thu hẹp scope, không xây catalog UI đầy đủ |
| 4 | Activation validator | P0 | Chỉ campaign hợp lệ mới xuất hiện cho Creator |
| 5 | Discovery/detail + eligibility | P0 | Đầu vào cho Join; reason codes phục vụ UX/test |
| 6 | Transactional Join + snapshot + slot/budget reservation | P0 | Bảo vệ quyền lợi Creator và chống oversubscribe |
| 7 | Tracking asset + workspace | P0 | Participation phải có asset trước Content |
| 8 | Content submission/version/validation | P0 | Đầu vào của Ops review và source earning |
| 9 | Review/reject/resubmit/bulk/concurrency | P0 | Khóa state/history trước reward side effect |
| 10 | Approve → Pending Earning + budget commit exactly once | P0 | Nguồn tiền đầu vào cho Tuần 4 |
| 11 | Basic counters/CSV closure | P0 Must debt | Chỉ sau core Green; thiếu thì AD-09 IN_PROGRESS và G15 Conditional |
| 12 | CPS preview, advanced export/chart và visual polish | P1/Stretch | Chỉ sau toàn bộ G15 P0 Green |

Dependency bắt buộc:

```text
G10 Week 2 GO
  → G11 Catalog + Campaign Draft
  → G12 Activate + Discover + Join + Reserve/Snapshot
  → G13 Tracking + Submit + FlatReward contract
  → G14 Review + Resubmit + Approve/Earning
  → G15 Concurrency/E2E + Week 3 Gate
```

## 5. Phân bổ công suất 40 giờ

| Ngày | Task đã lên lịch | Buffer | Trọng tâm |
|---|---:|---:|---|
| 11 | 7 giờ | 1 giờ | Product/Offer/Campaign schema, seed và Builder |
| 12 | 7 giờ | 1 giờ | Activation, discovery, eligibility, join, snapshot/reservation |
| 13 | 7 giờ | 1 giờ | Tracking, workspace, content submit và FlatReward contract |
| 14 | 7 giờ | 1 giờ | Review, resubmit, bulk và approval/earning transaction |
| 15 | 7 giờ + 1 giờ integration/fix buffer | Đã nằm trong task W3-D15-T07 | Concurrency, regression, E2E, demo và gate |

Buffer chỉ xử lý P0 blocker, integration và data/security defect. Không dùng buffer cho CPS, social preview hoặc catalog UI.

## 6. Quyết định phải khóa trước/tại thời điểm triển khai

| ID | Quyết định | Default recommendation | Deadline |
|---|---|---|---|
| W3-DEC-01 | Product/Offer scope | Product partner-scoped reusable; Offer country/currency-specific; Campaign cùng country với Offer | Đầu Ngày 11 |
| W3-DEC-02 | Product management P0 | Seed + read API; không làm full CRUD UI. Campaign Builder chọn Product/Offer có sẵn | Đầu Ngày 11 |
| W3-DEC-03 | Reward capability | Chỉ `CONTENT_FLAT` executable; `PAID_ORDER + SALE_PERCENT` (CPS), CPL/CPI/Recurring modeled nhưng activation disabled | Ngày 11 |
| W3-DEC-04 | Commercial versioning | Offer terms/reward version immutable khi referenced; change tạo version mới | Ngày 11 |
| W3-DEC-05 | Campaign critical fields | Reward/terms/country/offer immutable sau Active; pause + clone/version để đổi | Trước activate |
| W3-DEC-06 | Localization | EN + default market locale bắt buộc trước activation; runtime fallback EN | Ngày 11 |
| W3-DEC-07 | P0 deliverable | Với `CONTENT_FLAT`, một participation có một rewarded content deliverable; future multiple content dùng stable `deliverable_key`; conversion source không dùng constraint này | Ngày 11 |
| W3-DEC-08 | Budget liability | Reserve max flat liability tại Join; approve chuyển reserved → committed | Trước Join |
| W3-DEC-09 | Eligibility source | Eligibility API cho UX; Join luôn revalidate trong transaction | Ngày 12 |
| W3-DEC-10 | Join idempotency | Unique campaign+profile và idempotency key/payload hash; retry trả cùng result | Ngày 12 |
| W3-DEC-11 | Join snapshot | Terms/version/hash, reward/version/amount/currency, Offer/Campaign version, country, accepted-at | Ngày 12 |
| W3-DEC-12 | Asset scope | Campaign chọn một type Link/Code/Hashtag; one asset/type/participation; opaque identifier không PII | Ngày 13 |
| W3-DEC-13 | Duplicate content | Canonical URL unique trong Campaign; resubmit tạo version trên cùng submission root | Ngày 13 |
| W3-DEC-14 | Social verification | Creator-declared/mock validation + Ops review; không tuyên bố đã verify bằng social API | Ngày 13 |
| W3-DEC-15 | Recoverable review | `Needs Changes` dùng cho resubmit; terminal `Rejected` không resubmit nếu policy violation | Ngày 14 |
| W3-DEC-16 | Bulk semantics | Synchronous list, giới hạn size, per-item transaction/result; không all-or-nothing | Ngày 14 |
| W3-DEC-17 | Earning business key | CONTENT: unique `participation + content_root/deliverable_key + reward_snapshot`; CONVERSION P0b: `provider + external_event_id + reward_snapshot`; không unique theo submission version | Trước approve |
| W3-DEC-18 | Approval atomicity | Content Approved + Pending Earning + reserved→committed + audit cùng transaction | Ngày 14 |

## 7. Artifact và module phải có

### 7.1. Tài liệu/evidence

| Artifact | Đường dẫn dự kiến | Ngày | Mức |
|---|---|---:|---|
| Affiliate domain/capability model | `docs/product/AFFILIATE_DOMAIN_MODEL.md` | 11 | P0 |
| Campaign lifecycle/activation rules | `docs/product/CAMPAIGN_RULES.md` | 11–12 | P0 |
| Eligibility/join/snapshot rules | `docs/product/ELIGIBILITY_JOIN_RULES.md` | 12 | P0 |
| Tracking/content rules | `docs/product/CONTENT_RULES.md` | 13 | P0 |
| Review/reward/budget rules | `docs/product/CONTENT_REVIEW_REWARD_RULES.md` | 14–15 | P0 |
| Week 3 test matrix | `docs/qa/WEEK3_TEST_MATRIX.md` | 11–15 | P0 |
| Week 3 evidence | `docs/qa/WEEK3_EVIDENCE.md` | 11–15 | P0 |
| ERD/OpenAPI/State/Permission updates | tài liệu Tuần 1–2 tương ứng | xuyên tuần | P0 |
| Demo scenario update | `docs/product/DEMO_SCENARIOS.md` | 15 | P0 |

### 7.2. Backend module dự kiến

- Catalog: Partner reference, Product, Product Type/Attribute validation.
- Offer/Reward Capability/Terms Version.
- Campaign/Localization/Budget.
- Eligibility.
- Participation/Join Snapshot/Budget Reservation.
- Tracking Asset.
- Content Submission/Version/Validation.
- Content Review/Bulk orchestration.
- FlatReward + minimal Pending Earning.

### 7.3. Frontend surface dự kiến

- Local Admin Campaign Builder/Preview.
- Creator Campaign Discovery/Detail/Eligibility.
- Join confirmation và accepted terms snapshot.
- My Campaigns/Campaign Workspace/Tracking Asset.
- Content submit/status/resubmit.
- Local Ops content queue/workbench.
- Basic campaign counters; CSV chỉ sau core Green.

## 8. Kế hoạch chi tiết theo ngày

### Ngày 11 — Product, Offer, Reward Capability và Campaign Draft

#### Outcome duy nhất

Local Admin tạo được một Draft Campaign tham chiếu Product/Offer riêng biệt; chưa campaign nào được activate nếu thiếu rule.

| Task ID | Timebox | Mũ vai trò | Công việc | Đầu ra | Acceptance/evidence |
|---|---:|---|---|---|---|
| W3-D11-T01 | 30 phút | Tech Lead/QA | Kiểm Gate G10 và chạy Auth/RLS/KYC baseline | Entry checklist | Chỉ bắt đầu khi foundation Green và có KYC Approved fixtures |
| W3-D11-T02 | 1 giờ 30 | Data/Domain | Migration/model Product, Offer, Reward/Terms Version, Campaign, Localization, Budget/Reservation | Domain schema | Entity/FK/version/country/currency/index/RLS rõ; no float; soft archive/restrict delete |
| W3-D11-T03 | 45 phút | Domain/Backend | Capability registry, Product attribute schemas và lifecycle/validation | Domain rules | CONTENT_FLAT enabled; unsupported strategy fail explicit; không `if category` trong core |
| W3-D11-T04 | 1 giờ 15 | Backend | Product/Offer read API; Campaign draft create/update/preview/activation-dry-run API | Campaign API | Local Admin đúng partner/country; expected version + audit; Product/Offer full CRUD UI không cần |
| W3-D11-T05 | 1 giờ 30 | Frontend/Product | Simple Campaign Builder chọn seed Product/Offer; nhập localization, brief, dates, channel, capacity, budget | Builder v1 | Draft save/validation states; không nhúng catalog manager; country context luôn rõ |
| W3-D11-T06 | 45 phút | Data/QA | Seed sáu archetype, flat Offer fixtures và unsupported CPS/recurring drafts | Seed/capability proof | Sáu seed không migration/category branch; two product types dùng được same flat flow |
| W3-D11-T07 | 45 phút | QA/Product | Schema/API/RLS/capability tests; cập nhật ERD/OpenAPI/RTM/evidence; Gate G11 | G11 checklist | Draft campaign được tạo qua UI/API; cross-scope access bị chặn |

Giữ 1 giờ buffer cho migration/Builder integration.

#### Domain relationship bắt buộc

- Product có nhiều Offer; không copy Offer commercial fields vào Product.
- Offer thuộc đúng một Product, country/currency scope rõ và có Reward/Terms version.
- Campaign thuộc một Offer; country/currency phải tương thích.
- Localization là collection riêng theo locale, không nhét toàn bộ text vào Campaign columns.
- Budget dùng exact decimal/minor-unit strategy + ISO currency; không dùng float.
- Product/Offer/Campaign đang được tham chiếu không hard-delete làm orphan lịch sử.
- Mọi Offer/Campaign country-scoped áp dụng guard, RLS, audit và versioning pattern Tuần 2.

#### Gate G11 — Catalog/Campaign Draft Gate

Pass khi:

- Product, Offer, Reward/Terms Version và Campaign là record/lifecycle riêng.
- Local Admin tạo Draft Campaign từ seed Product/Offer đúng partner/country.
- Sáu archetype seed thành công mà không có schema/service theo category.
- CONTENT_FLAT được enable; CPS/Recurring Offer vẫn Draft và không thể activate.
- Draft có thể lưu thiếu field nhưng activation-dry-run trả field/reason codes.
- Cross-country Offer/Campaign direct ID bị chặn; Product global chỉ visible theo partner policy rõ.
- ERD/OpenAPI/migration/seed/test/evidence Green.

### Ngày 12 — Activation, Discovery, Eligibility và Transactional Join

#### Outcome duy nhất

Campaign hợp lệ được activate; Creator KYC Approved join đúng một lần và hệ thống reserve được liability/slot cùng immutable commercial snapshot.

| Task ID | Timebox | Mũ vai trò | Công việc | Đầu ra | Acceptance/evidence |
|---|---:|---|---|---|---|
| W3-D12-T01 | 1 giờ | Backend/Domain | Activation validator + Draft→Active/Active↔Paused/→Closed commands | Campaign lifecycle | Revalidate entity/version/capability; invalid field có reason; double activation idempotent/conflict rõ |
| W3-D12-T02 | 1 giờ | Full-stack | Creator discovery/detail/filter/pagination + locale fallback | Discovery slice | Chỉ Active/đúng country/window; không lộ Draft/PH; EN fallback có chủ đích |
| W3-D12-T03 | 45 phút | Backend/Domain | Eligibility service + stable reason codes | Eligibility API | KYC/country/status/date/slot/budget/suspended/already-joined cases |
| W3-D12-T04 | 45 phút | Frontend/Product | Eligibility CTA, reward/terms disclosure và join confirmation | Campaign detail UX | Disabled CTA giải thích reason; Creator xem campaign trước KYC nhưng không join |
| W3-D12-T05 | 1 giờ 15 | Backend/Data | Atomic/idempotent Join: revalidate, reserve slot+max flat liability, snapshot, participation | Join transaction | Unique campaign+profile; retry same result; last slot/budget không oversubscribe; rollback không orphan |
| W3-D12-T06 | 45 phút | Full-stack | My Campaigns và accepted snapshot view | Participation UI | Creator đọc exact terms/reward/currency/version đã chấp nhận |
| W3-D12-T07 | 1 giờ | QA/Data | Activation matrix, eligibility table, concurrent join, idempotency và snapshot immutability tests | Test evidence | Offer change không đổi old snapshot; N creator tranh last capacity không vượt cap |
| W3-D12-T08 | 30 phút | Product/QA | Gate G12; cập nhật rules/OpenAPI/RTM/evidence/log | G12 checklist | CR-05 vertical slice chính Green |

Giữ 1 giờ buffer cho join transaction/concurrency.

#### Activation validation bắt buộc

- Campaign đang Draft và actor có permission/country scope.
- Country enabled; Product/Offer active/usable và compatible.
- Reward capability được enabled ở Phase 1.
- Fixed reward > 0, precision/currency hợp lệ.
- Budget đủ cho ít nhất một max liability; capacity không âm.
- `start_at < end_at`; UTC/timezone boundary rõ.
- Terms version/hash tồn tại.
- EN + default market localization tồn tại.
- Brief, allowed platform/channel, content requirement và tracking asset type hợp lệ.
- Stale Offer/Campaign version bị từ chối.
- Critical fields không sửa trực tiếp sau Active.

#### Eligibility reason codes tối thiểu

- `KYC_NOT_APPROVED`.
- `WRONG_COUNTRY`.
- `CAMPAIGN_NOT_ACTIVE`.
- `CAMPAIGN_NOT_STARTED` / `CAMPAIGN_ENDED`.
- `CAMPAIGN_PAUSED`.
- `CAPACITY_FULL`.
- `BUDGET_UNAVAILABLE`.
- `PROFILE_SUSPENDED`.
- `ALREADY_JOINED`.

Eligibility response chỉ phục vụ UX; Join luôn revalidate server-side trong transaction.

#### Join transaction/budget invariant

P0 có một rewarded deliverable mỗi participation:

```text
available = budget_total - budget_reserved - budget_committed

Join:
  lock/revalidate Campaign + Offer + Creator Profile/KYC
  → verify available >= flat reward liability
  → reserve slot
  → reserve flat reward liability
  → create Participation
  → write immutable terms/reward/currency/version snapshot
  → audit
  → commit một transaction
```

- Retry/double-click không reserve lần hai.
- Hai creator tranh slot/budget cuối chỉ số hợp lệ được join.
- Failure sau reserve nhưng trước Participation phải rollback cả hai.
- Không giảm budget xuống dưới `reserved + committed`.

#### Gate G12 — Activate/Join Gate

Pass khi:

- Invalid/unsupported campaign không Active.
- Discovery/detail đúng country/state/locale.
- Eligibility có reason code; Join revalidate độc lập.
- One creator/campaign chỉ có one Participation/reservation.
- Terms/reward/currency/version snapshot không đổi hồi tố.
- Parallel join không vượt slot hoặc budget.
- Create/activate/join có audit và RLS/security regression Green.

### Ngày 13 — Tracking Asset, Campaign Workspace và Content Submit

#### Outcome duy nhất

Creator đã join nhận tracking asset cá nhân, thấy exact requirements/snapshot và submit được một content version hợp lệ.

| Task ID | Timebox | Mũ vai trò | Công việc | Đầu ra | Acceptance/evidence |
|---|---:|---|---|---|---|
| W3-D13-T01 | 45 phút | Backend/Data | Tracking Asset schema/generator, normalization và collision retry | Tracking service | One asset/type/participation; retry idempotent; opaque token không PII/sequential ID |
| W3-D13-T02 | 1 giờ | Full-stack | Campaign Workspace API/UI: brief, deadline, accepted terms/reward và asset | Workspace slice | Creator/country/participation scoped; copy/code/link states rõ |
| W3-D13-T03 | 45 phút | Backend/Data | Content Submission root, immutable Versions, deliverable key, review status và RLS | Content schema | Unique rewarded deliverable; version/history; source ownership/country rõ |
| W3-D13-T04 | 1 giờ | Backend/Security | URL canonicalization, platform allowlist, hashtag/code validation và duplicate race guard | Validation service | Unsafe schemes/lookalike host/duplicate invalid; server-side validation; no SSRF fetch |
| W3-D13-T05 | 1 giờ 30 | Full-stack | Submit API/form/status; deadline/participation/state guards | Submit slice | Valid content creates one Submitted version; duplicate request/URL không tạo root trùng |
| W3-D13-T06 | 1 giờ | Backend/Data/QA | Minimal Commercial Pending Earning schema/source-aware business key + pure FlatReward service/unit tests | Reward contract | Gross/currency/snapshot source; CONTENT key unique; schema cho source type; chưa tạo earning trước approval |
| W3-D13-T07 | 30 phút | Backend | Minimal Ops queue/detail read API skeleton | Review read API | Country-scoped pagination/status query; Day 14 không bắt đầu từ số 0 |
| W3-D13-T08 | 30 phút | QA/Product | Tracking/content/duplicate/reward contract tests; Gate G13/evidence | G13 checklist | Join→asset→workspace→submit Green |

Giữ 1 giờ buffer cho URL/duplicate/content integration.

#### Tracking Asset rules

- Campaign chọn một asset type trong P0: Link, Code hoặc Creator-specific Hashtag.
- Link token unique toàn hệ thống; code unique theo partner/campaign policy; hashtag normalization/case policy rõ.
- Asset retry/generate lại không tạo asset thứ hai.
- Collision bị unique constraint bắt và generator retry có giới hạn.
- Creator/country khác không đọc asset.
- Tracking URL không chứa email, raw creator ID hoặc PII.
- Click tracking/redirect analytics không thuộc P0; asset chỉ chứng minh attribution identifier/config.

#### URL/content validation rules

- Chỉ `https` và host/platform trong campaign allowlist.
- Reject malformed, `javascript:`, `data:`, `file:` và lookalike host.
- Normalize host case/default port/fragment/allowed query params trước duplicate hash.
- Không server-fetch URL trong P0; nếu sau này fetch phải có SSRF guard.
- Canonical URL unique trong Campaign; concurrent duplicate insert chỉ một success.
- Platform phải khớp host; hashtag/code match theo normalized token boundary.
- Nếu không có social API, UI ghi rõ metadata do Creator khai báo và chờ Ops review.
- Resubmit tạo Version mới trên cùng Submission root; không overwrite evidence cũ.

#### Gate G13 — Tracking/Submit Gate

Pass khi:

- Join tạo/recover đúng một tracking asset.
- Workspace hiển thị accepted snapshot, requirements và deadline.
- Creator đúng Participation/country submit được; actor khác bị chặn.
- Invalid URL/platform/hashtag/deadline trả reason code rõ.
- Duplicate request/canonical URL/concurrency không tạo content trùng.
- Submission root/version/history và FlatReward business key đã sẵn cho approval.
- Minimal Ops read API, RLS, audit/i18n và test evidence Green.

### Ngày 14 — Content Review, Resubmit, Bulk và Approval/Earning

#### Outcome duy nhất

Ops xử lý content đúng country; Creator resubmit không mất lịch sử; final approve tạo đúng một Pending Earning và chuyển budget liability atomically.

| Task ID | Timebox | Mũ vai trò | Công việc | Đầu ra | Acceptance/evidence |
|---|---:|---|---|---|---|
| W3-D14-T01 | 45 phút | Full-stack/Ops | Hoàn thiện queue/detail/workbench UI trên read API Ngày 13 | Review UI | Server pagination/status filter; loading/empty/error/denied/conflict states; country scope rõ |
| W3-D14-T02 | 1 giờ 30 | Backend/Domain | Start review, Needs Changes/recoverable rejection, terminal reject và state/version guards | Review commands | Reason bắt buộc; only latest submitted version; Finance/creator/sai country denied |
| W3-D14-T03 | 1 giờ | Full-stack | Creator Needs Changes/resubmit và version/timeline UI/API | Resubmit slice | New immutable version; old evidence/reason/history còn nguyên |
| W3-D14-T04 | 1 giờ 15 | Backend/Data | Atomic final approve → reserved→committed → unique Pending Earning → audit | Approval transaction | Lấy join snapshot; failure rollback toàn bộ; approved không bao giờ thiếu earning |
| W3-D14-T05 | 45 phút | Backend/Frontend | Synchronous bulk command reuse single-item handler, per-item result | Bulk MVP | Giới hạn size; success/failure/resulting state/error/correlation ID từng item |
| W3-D14-T06 | 45 phút | QA/Backend | Stale review, double action, bulk mixed-result/retry và cross-country tests | Review evidence | Second reviewer conflict; retry không nhân transition/earning |
| W3-D14-T07 | 45 phút | QA/Full-stack | E2E request changes → resubmit → approve → Pending Earning | E2E evidence | One deliverable one earning; budget reserved→committed; audit/source đúng |
| W3-D14-T08 | 15 phút | Product/QA | Gate G14; cập nhật state/OpenAPI/RTM/evidence/log | G14 checklist | AD-03/CR-06 và approval effect Green |

Giữ 1 giờ buffer cho approval/reward/budget transaction.

#### Content state policy P0

```text
Draft → Submitted → In Review
                       ├→ Needs Changes → Resubmitted → In Review
                       ├→ Rejected (terminal policy violation)
                       └→ Approved
```

- `Needs Changes` mới cho phép resubmit.
- `Rejected` terminal không tự mở resubmit; nếu cần reopen phải có explicit command/audit ngoài core demo.
- Reviewer chỉ quyết định latest active version.
- Approve/reject double-click hoặc stale expected-version không ghi đè.

#### Bulk contract P0

Bulk là orchestration, không chứa business logic review riêng:

```text
input: item_id + expected_version + action + reason/idempotency
output per item: item_id, status, resulting_state, error_code, correlation_id
```

- Mỗi item transaction riêng để một stale/unauthorized item không rollback item hợp lệ.
- Cross-country item trả failure an toàn, không lộ metadata.
- Retry batch gọi lại same idempotent single-item handler.
- Bulk approve phải dùng cùng approval/earning/budget invariant.

#### Approval transaction invariant

```text
lock/revalidate latest Submission + Participation + Budget Reservation
→ verify actor/country/state/version
→ calculate fixed reward from immutable Join snapshot
→ transition Content to Approved
→ convert budget reserved → committed
→ create unique Pending Earning
→ write audit
→ commit một transaction
```

Unique business key:

```text
CONTENT_FLAT:
participation_id + content_root/deliverable_key + reward_rule_snapshot_id

CONVERSION P0b:
provider + external_event_id + reward_rule_snapshot_id
```

Không dùng `submission_version_id` làm business key duy nhất vì resubmission có thể tạo version mới và trả tiền hai lần.

Conversion P0b nếu được mở vẫn phải liên kết Participation, Offer/Reward snapshot, country và partner; không dùng content-deliverable uniqueness để chặn nhiều conversion hợp lệ trong tương lai.

Nếu transaction fail/budget reservation thiếu:

- Content không Approved.
- Không tạo earning.
- Không thay đổi reserved/committed.
- Ops nhận reason code/recoverable error; không sửa DB thủ công.

#### Gate G14 — Review/Reward Gate

Pass khi:

- Queue/workbench đúng country và state.
- Needs Changes/resubmit giữ toàn bộ version/history.
- Stale reviewer và invalid transition bị chặn.
- Bulk mixed request trả kết quả từng item.
- Approve tạo đúng one Pending Earning từ join snapshot.
- Reserved→committed không vượt budget; failure rollback toàn bộ.
- Double-click/retry/bulk không nhân reward hoặc audit business effect.

### Ngày 15 — Concurrency, regression, E2E và Week 3 Gate

#### Outcome duy nhất

Chứng minh full vertical slice ổn định dưới retry/concurrency và đủ tin cậy để Tuần 4 xây ledger/tax/FX.

| Task ID | Timebox | Mũ vai trò | Công việc | Đầu ra | Acceptance/evidence |
|---|---:|---|---|---|---|
| W3-D15-T01 | 30 phút | Domain/QA | Chạy invariant audit: source/snapshot/budget/status consistency | Invariant checklist | Không có approved-without-earning, duplicate earning hoặc liability lệch |
| W3-D15-T02 | 1 giờ 30 | QA/Data | Fault/retry/concurrent approve, bulk retry và exactly-once tests trên PostgreSQL thật | Reward tests | One deliverable one earning; transaction failure rollback; process retry same result |
| W3-D15-T03 | 1 giờ | QA/Data | Concurrent Join last slot/budget + reserved/committed invariant tests | Budget tests | `reserved + committed <= total` qua mọi interleaving |
| W3-D15-T04 | 45 phút | Full-stack | Basic counters và CSV export sau core Green | AD-09 evidence | Joined/submitted/approved/pending/committed totals khớp DB và CSV; thiếu CSV/counters thì AD-09 giữ IN_PROGRESS |
| W3-D15-T05 | 1 giờ | QA/Full-stack | Full VN happy/reject-resubmit flow + PH CONTENT_FLAT smoke/isolation fixture | E2E evidence | Hai product type dùng same core; chạy từ seed, không sửa DB thủ công; hai lần liên tiếp Green |
| W3-D15-T06 | 45 phút | Security/QA | Tuần 2 security/i18n/audit regression trên entity/API mới | Regression evidence | RLS/RBAC/audit/fallback không regression |
| W3-D15-T07 | 1 giờ | Full-stack | Integration/fix buffer chỉ cho P0/P1/data-integrity/flaky root cause | Green baseline | Không dùng retry để che flaky; không nhận CPS/polish |
| W3-D15-T08 | 1 giờ 30 | Product/Architect/QA | Demo, GO/CONDITIONAL GO/NO-GO, tracker/evidence/log/handoff | Gate G15 | Pending Earning contract sẵn cho Money/Ledger Ngày 16 |

#### Budget invariant P0

```text
budget_total >= budget_reserved + budget_committed >= 0

Join:             available → reserved
Content Approved: reserved  → committed
```

- Retry Join không reserve lần hai.
- Retry Approve không commit lần hai.
- Budget currency phải khớp reward snapshot/campaign currency.
- Giảm budget dưới reserved+committed bị từ chối.
- Pause/close không xóa existing liability.
- Participation cancel/expire nếu được enable phải release reservation đúng một lần. Nếu command này chưa nằm trong P0 implementation, transition phải disabled và ghi known limitation “reservation giữ tới campaign/manual cleanup”; không để UI/API tạo lifecycle nửa vời hoặc tuyên bố budget lifecycle production-ready.

#### Gate G15 — Week 3 E2E Gate

Pass khi:

- Product–Offer–Campaign separation/capability model và six-archetype proof Green.
- Unsupported strategy không activate; P0b CPS không nằm trong critical gate.
- Activation invalid matrix Green.
- Discovery/eligibility/join đúng country, KYC, date, state, slot và budget.
- Concurrent/idempotent Join không oversubscribe/reserve trùng.
- Commercial snapshot immutable.
- Tracking asset unique/idempotent/owner scoped.
- URL/platform/hashtag/dedupe validation Green.
- Needs Changes/resubmit/history/stale-review Green.
- Bulk per-item result/retry Green.
- Approval tạo exactly one Pending Earning và committed liability.
- `reserved + committed <= total` dưới concurrency/fault tests.
- Full vertical slice chạy từ seed hai lần liên tiếp.
- 0 P0, 0 P1 và không có P2 ảnh hưởng Must flow.

## 9. Test matrix bắt buộc

### 9.1. Product/Offer/Campaign và activation

| Test ID | Scenario | Expected result | Stop-release |
|---|---|---|---|
| W3-POC-01 | Sáu archetype + archetype thứ bảy bằng config | Không migration/category branch/core change | Có nếu hard-code |
| W3-POC-02 | Một Product có Offer VN/PH khác currency/rule | Product không duplicate; Offer scope/version riêng | Có nếu lẫn commercial data |
| W3-POC-03 | Campaign VN gắn Offer PH/PHP | Activation denied | Có |
| W3-POC-04 | Unsupported CPS/Recurring capability | Draft allowed; activation `CAPABILITY_NOT_ENABLED_IN_PHASE1` | Có nếu fallback sai |
| W3-POC-05 | Archive Product/Offer referenced | Không tạo campaign mới; history vẫn đọc; no orphan | Có nếu mất history |
| W3-ACT-01 | Thiếu từng reward/budget/date/terms/locale/platform field | Activation denied với field/reason code | Có |
| W3-ACT-02 | Reward <=0, precision/currency sai, budget < one liability | Activation denied | Có |
| W3-ACT-03 | Offer đổi/deactivate giữa edit và activate | Stale/revalidate denied | Có |
| W3-ACT-04 | Double/concurrent activate | Một transition/audit; stale request conflict/idempotent | Có nếu state/audit nhân |
| W3-ACT-05 | Sửa commercial critical field sau Active | Denied; version/clone policy | Có nếu hồi tố snapshot |

### 9.2. Eligibility, Join, snapshot và budget reservation

| Test ID | Scenario | Expected result | Stop-release |
|---|---|---|---|
| W3-ELG-01 | KYC Approved, correct country, active/date/budget/slot valid | Eligible | Có nếu sai core flow |
| W3-ELG-02 | KYC pending/rejected, wrong country, suspended, paused/full/ended | Ineligible + stable reason | Có nếu vẫn join |
| W3-ELG-03 | Eligibility báo eligible nhưng slot hết trước Join | Join revalidate và deny an toàn | Có |
| W3-JOIN-01 | Retry same idempotency key/payload | Cùng result, one participation/reservation | Có |
| W3-JOIN-02 | Same key khác payload | Conflict | Có nếu trả result sai |
| W3-JOIN-03 | N request cùng creator/campaign | One participation/reservation | Có |
| W3-JOIN-04 | N creator tranh last slot/budget | Không vượt slot/budget | Có |
| W3-JOIN-05 | Failure giữa reserve và create participation | Rollback toàn bộ, no orphan | Có |
| W3-JOIN-06 | Offer/terms/reward đổi sau Join | Old snapshot không đổi; new Join dùng new version | Có |
| W3-JOIN-07 | Creator đọc accepted snapshot | Exact terms/reward/currency/country/time | Có nếu không trace được |

### 9.3. Tracking và Content Submit

| Test ID | Scenario | Expected result | Stop-release |
|---|---|---|---|
| W3-TRK-01 | Retry/collision/concurrent asset generation | One unique asset/type/participation; collision retry | Có |
| W3-TRK-02 | Creator/country khác đọc asset | Denied | Có |
| W3-TRK-03 | Token/link contains PII/sequential raw ID | Must not | Có |
| W3-CNT-01 | Unsafe/malformed/lookalike URL | Denied | Có |
| W3-CNT-02 | Platform mismatch hoặc missing required hashtag/code | Denied/reason code | Có |
| W3-CNT-03 | Canonically same URL submitted concurrently | One submission root | Có |
| W3-CNT-04 | Resubmit after Needs Changes | New version, same root/history retained | Có |
| W3-CNT-05 | Actor outside participation/country or past policy deadline | Denied | Có |

### 9.4. Review, bulk, reward và budget commit

| Test ID | Scenario | Expected result | Stop-release |
|---|---|---|---|
| W3-REV-01 | Request changes/reject without reason | Denied | Có |
| W3-REV-02 | Two Ops decide same version | One success, one stale conflict | Có |
| W3-REV-03 | Old version approved after resubmit | Denied | Có |
| W3-REV-04 | Bulk 3 valid + 1 stale + 1 cross-country | Three success; per-item safe failures | Có nếu sai report/side effect |
| W3-REV-05 | Retry same bulk request | No repeated transition/earning | Có |
| W3-RWD-01 | First approve | One Pending Earning from Join snapshot; reserved→committed | Có |
| W3-RWD-02 | Double-click/two Ops/retry approve | One earning/commit/audit business effect | Có |
| W3-RWD-03 | Needs Changes → resubmit version → approve | One earning for deliverable, not per version | Có |
| W3-RWD-04 | Insert earning/audit/budget update failure | Whole approval transaction rollback | Có |
| W3-RWD-05 | Current Offer differs Join snapshot | Earning uses Join snapshot | Có |
| W3-BUD-01 | Concurrent approvals near cap | No overspend; one may fail safely | Có |
| W3-BUD-02 | Reward/budget currency mismatch or float precision | Denied/no float | Có |

## 10. Definition of Done cho vertical slice Tuần 3

Một story chỉ được đánh dấu `DONE` khi có:

- Migration/schema/constraint/index/RLS phù hợp.
- Backend validation/state transition/idempotency/expected-version.
- Role, partner/country và ownership authorization.
- Audit cho create/activate/join/review/approve/budget effect.
- UI loading, empty, validation, denied, stale/conflict và recovery state.
- i18n key + fallback; currency/time format đúng country.
- Unit/integration test và critical negative case.
- PostgreSQL concurrency test cho Join/Budget/Approval.
- OpenAPI/ERD/RTM/state/decision docs cập nhật.
- Deterministic seed/fixture và no PII/secrets.
- Lint, type-check, test, build Green.
- Command/file evidence trong `WEEK3_EVIDENCE.md`.

UI “đã bấm được” không đủ để đánh dấu Campaign/Join/Approval `DONE`.

## 11. Mục tiêu trạng thái requirement cuối Tuần 3

| ID | Mục tiêu cuối tuần | Evidence | Lưu ý |
|---|---|---|---|
| AD-03 | DONE mức MVP | Queue/workbench, reason, resubmit, stale, bulk per-item, approve exactly once | Advanced moderation ngoài scope |
| AD-09 | DONE chỉ khi counters + CSV Green; nếu thiếu là IN_PROGRESS | Campaign Builder/activation/budget/basic counters/CSV | Product/Offer full CRUD UI và charts không bắt buộc |
| CR-05 | DONE | Discovery/detail/eligibility/join/My Campaigns/tracking snapshot | Join idempotent + reservation tests bắt buộc |
| CR-06 | DONE | Submit/validation/status/Needs Changes/resubmit/history | Social verification thật ngoài scope |
| CR-07 | IN_PROGRESS | Pending Earning source/amount/currency được tạo | Earnings UI/lifecycle/Gross–Tax–Net hoàn thành Tuần 4 |
| CP-02 | IN_PROGRESS | RLS/guard/pool tests mở rộng cho Offer/Campaign/Participation/Content/Earning | Final regression Tuần 5 |
| CP-05 | IN_PROGRESS | Campaign/content critical UI có VI/EN/Filipino/fallback | Final audit Tuần 5 |
| AD-02 | IN_PROGRESS | Audit mở rộng create/activate/join/review/approve | Final completeness Tuần 5 |
| P0b CPS | TODO | Chỉ modeled Draft/capability disabled | Chỉ xem xét Ngày 17 khi P0 Green |

Không đánh dấu CR-07, CP-02, CP-05 hoặc AD-02 `DONE` sớm khi các module Tuần 4–5 chưa được kiểm chứng.

## 12. Gate cuối Tuần 3

### GO

Chuyển sang Money/Ledger Ngày 16 khi:

- [ ] Gate G10 Tuần 2 vẫn Green sau regression.
- [ ] Product–Offer–Campaign/Reward/Terms separation và capability model rõ.
- [ ] Six archetypes + add-one-archetype test không hard-code category/network.
- [ ] Unsupported CPS/Recurring campaign không activate.
- [ ] Activation invalid matrix Green.
- [ ] Creator chỉ discover/join Active campaign đúng country.
- [ ] Eligibility reason codes và Join revalidation Green.
- [ ] Parallel/idempotent Join không vượt slot/budget hoặc reserve trùng.
- [ ] Join snapshot immutable và creator đọc lại được.
- [ ] Tracking asset uniqueness/idempotency/ownership Green.
- [ ] URL/platform/hashtag/canonical duplicate tests Green.
- [ ] Needs Changes/resubmit/history/stale-review Green.
- [ ] Bulk mixed result/retry Green.
- [ ] Approve tạo exactly one Pending Earning từ Join snapshot.
- [ ] Budget reserved→committed atomic; `reserved + committed <= total`.
- [ ] AD-09 basic counters và CSV export khớp source totals. Nếu chưa có CSV, Gate chỉ `CONDITIONAL GO` và AD-09 vẫn `IN_PROGRESS` với deadline trước G22.
- [ ] Full vertical slice chạy từ seed hai lần liên tiếp.
- [ ] 0 P0, 0 P1; không có P2 ảnh hưởng Must flow.
- [ ] Migration/seed/verify/build Green; docs/evidence/tracker/log cập nhật.

### CONDITIONAL GO

Có thể sang Tuần 4 nếu chỉ còn:

- Product archetype phụ thiếu visual asset/polish.
- Advanced discovery/filter/analytics/chart chưa có.
- CSV chưa hoàn thiện nhưng counters/audit/core flow Green; trường hợp này AD-09 giữ `IN_PROGRESS`, có owner/deadline đóng trước Feature Freeze G22, không được ghi DONE lean.
- OAuth/social/network provider thật chưa có.
- P0b CPS/conversion chưa làm.

Mỗi item phải được đưa vào backlog/known limitations; không được ảnh hưởng source/snapshot/earning/budget integrity.

### NO-GO

Không xây Ledger/Reconciliation nếu còn:

- Cross-country/cross-partner Campaign/Content/Tracking/Earning leak.
- Product/Offer/Campaign bị gộp hoặc hard-code theo category/network.
- Unsupported strategy vẫn activate/fallback sai.
- Invalid campaign active được.
- Eligibility chỉ kiểm tra frontend hoặc Join không revalidate.
- Duplicate/parallel Join vượt slot/budget hoặc reserve hai lần.
- Offer/terms update làm đổi snapshot cũ.
- Tracking asset collision/cross-user leak.
- Duplicate canonical URL lọt qua race.
- Stale reviewer ghi đè; resubmit mất history.
- Bulk báo success sai hoặc retry lặp side effect.
- Một deliverable sinh nhiều earning.
- Content Approved nhưng thiếu earning, hoặc earning/budget/audit lệch transaction.
- Budget dùng float, sai currency hoặc vượt cap.

Nếu NO-GO, dùng đầu Ngày 16 sửa invariant trước khi bắt đầu money model; không xây ledger trên nguồn earning chưa đáng tin.

## 13. P1/Stretch và thứ tự cắt scope

### P1/Stretch Tuần 3

1. Mock conversion/CPS/CPL/CPI/recurring execution.
2. Product/Offer full CRUD UI.
3. Generic eligibility/rule builder.
4. Social API verification/preview/scraping.
5. Click tracking, deep-link provider và analytics.
6. Multiple simultaneous tracking asset types.
7. Advanced discovery/recommendation.
8. Rich moderation annotation/content diff.
9. Async bulk jobs/retry dashboard.
10. Advanced charts/report/export.
11. Archetype-specific UI và hi-fi polish.

### Thứ tự cắt khi trễ

1. Cắt toàn bộ mock CPS/conversion; giữ disabled capability model.
2. Cắt Product/Offer CRUD UI; giữ seed/read API.
3. Cắt advanced eligibility/filter/search; giữ fixed reason matrix.
4. Cắt social preview/verification; giữ declared metadata + Ops review.
5. Chỉ một asset type/campaign; không click analytics.
6. Cắt rich bulk UI; giữ endpoint/per-item result/test.
7. Cắt charts/advanced export styling; giữ basic counters + CSV và core audit cho AD-09.
8. Cắt archetype-specific visuals và polish.

Không được cắt:

- Entity/capability separation và unsupported-strategy guard.
- Activation validation.
- Country/RBAC/RLS/audit/i18n patterns.
- Eligibility + Join revalidation/idempotency/concurrency.
- Terms/reward/currency snapshot.
- Budget reserve tại Join và commit tại Approve.
- Tracking ownership/idempotency.
- Content version/history/reason/resubmit/stale handling.
- Exactly-once Pending Earning và transaction rollback.
- PostgreSQL concurrency tests và full E2E.

## 14. Risk register Tuần 3

| Risk | Trigger | Hành động giảm thiểu/contingency |
|---|---|---|
| Day 11 quá tải | Trưa chưa tạo Draft Campaign | Product/Offer seed/read only; bỏ catalog UI; giữ simple Builder |
| CPS scope creep | CPS xuất hiện trong critical demo/gate | Chỉ capability Draft/disabled; implementation để Ngày 17 nếu P0 Green |
| Generic rule engine phình | Eligibility UI/rules tùy ý | Fixed P0 reason matrix và domain service cụ thể |
| Budget hết sau Creator làm việc | Chỉ check budget lúc approve | Reserve max flat liability atomically tại Join |
| Join race | N creator vượt last slot/budget | Row lock/conditional update + unique constraint + PostgreSQL concurrency test |
| Snapshot hồi tố | Offer update đổi participation cũ | Immutable/versioned terms/reward snapshot at Join |
| Tracking collision/PII | Token duplicate hoặc chứa raw ID | Opaque random token + unique constraint/collision test |
| URL validation security | Lookalike/unsafe URL hoặc SSRF | Strict parser/allowlist; không server-fetch P0 |
| Day 14 quá tải | Trưa chưa chạy Needs Changes API | Bỏ bulk UI/polish; giữ single review/resubmit/approval core |
| Approved không có earning | Approval và reward tách transaction | Single atomic command; no-op/rollback on failure |
| Duplicate earning | Unique theo submission version | Stable deliverable business key + idempotency/concurrency test |
| Budget overrun | Check-then-write ngoài transaction | Lock/atomic reserved→committed invariant trên PostgreSQL thật |
| Day 15 thành feature day | Core approval chưa xong | Reward schema/service từ Ngày 13, approval integration Ngày 14; Day 15 chỉ hardening |

## 15. Demo cuối Tuần 3

Thời lượng mục tiêu: 12–15 phút.

1. Giải thích Product → Offer → Campaign và sáu archetype; nêu rõ strategy nào chạy/strategy nào modeled-only.
2. Cho thấy CPS/Recurring Offer ở Draft bị activation guard chặn, không giả lập thành công.
3. Local Admin tạo/activate VN Content Flat Campaign hợp lệ.
4. Creator chưa KYC hoặc sai country thấy eligibility reason và không join được.
5. Creator VN KYC Approved join; hệ thống reserve slot/budget và lưu snapshot.
6. Creator nhận tracking asset, mở workspace và thử submit URL/hashtag sai.
7. Creator submit hợp lệ; Ops request changes có reason.
8. Creator resubmit, history cũ còn nguyên; Ops approve.
9. Hiển thị đúng một Pending Earning và budget `reserved → committed`.
10. Retry Join/Approve hoặc direct-ID PH để chứng minh idempotency/isolation.
11. Trình bày test evidence cho last-slot/budget concurrency và exactly-once reward.

Không demo “mock CPS đã chạy” trong Tuần 3; P0b chỉ được xem xét ở Ngày 17.

## 16. Handoff sang Tuần 4 — Ngày 16

Next exact action sau Gate G15 `GO`:

1. Chốt Money value object, rounding và currency invariants.
2. Financialize Commercial Pending Earning: idempotent backfill/command gắn tax/reference-FX snapshot, tính Gross–Tax–Net và post initial Journal mà không phá source business key.
3. Đặt `financialized_at`/equivalent invariant; sau G16 mọi PENDING Earning phải có Journal, tax snapshot và reference-FX state rõ.
4. Nâng approval/new-source handler để Earning mới đi qua cùng financialization contract/outbox, không tạo hai nghĩa PENDING khác nhau.
5. Tạo immutable ledger posting/adjustment/reversal và reconcile campaign committed budget với Earning Gross/Ledger totals.

Trước khi đóng Tuần 3, cập nhật `Plan/00_PROJECT_EXECUTION_LOG.md` với:

- DONE/IN_PROGRESS/NOT DONE thực tế.
- Gate G15: GO, CONDITIONAL GO hoặc NO-GO.
- Feature tracker/evidence đúng thực tế cho AD-03, AD-09, CR-05, CR-06 và CR-07 partial.
- Kết quả activation/join/tracking/content/reward/budget tests.
- P0/P1 defects, risk, known limitations và phần modeled-only.
- Next exact action cho `W4-D16-T01`.
