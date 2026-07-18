# KẾ HOẠCH TRIỂN KHAI HỆ THỐNG AFFILIATE GLOBAL TRONG 5 TUẦN

> Kết luận khả thi: 5 tuần phù hợp để bàn giao một MVP demo end-to-end có kiểm thử và tài liệu; không đủ để cam kết production-ready hoặc tích hợp đầy đủ các affiliate network. Nếu người thực hiện còn phải học stack từ đầu, cần mentor review hằng ngày hoặc hỗ trợ bán thời gian ở frontend/QA.

## 1. Mục tiêu và giả định

### 1.1. Mục tiêu cuối kỳ

Sau 5 tuần, sản phẩm phải chạy được end-to-end trên máy local:

1. Creator đăng nhập bằng một global identity.
2. Creator chọn VN hoặc PH và tạo country profile độc lập.
3. Creator hoàn thành KYC theo country.
4. Local Ops duyệt hoặc yêu cầu sửa từng phần KYC.
5. Creator khám phá, tham gia campaign và nhận tracking asset cá nhân.
6. Creator nộp content; Local Ops duyệt, từ chối và cho phép resubmit.
7. Content được duyệt tạo earning; nếu P0b đạt Gate G17 thì mock conversion cũng có thể tạo earning.
8. Creator xem Gross – Tax – Net và các trạng thái thu nhập.
9. Local Finance tạo, kiểm tra và khóa reconciliation batch.
10. Creator yêu cầu payout bằng OTP; payout mock chạy được success, confirmed failure/release, timeout/unknown và linked reversal sau success.
11. Mọi hành động quan trọng có audit log.
12. Local role không thể truy cập dữ liệu của country khác.

### 1.2. Giả định nguồn lực

- Thời gian: 5 tuần, 25 ngày làm việc.
- Nhân lực cơ sở: 1 full-stack developer, có mentor review cuối mỗi tuần.
- Creator App là responsive web, chưa làm native mobile app.
- Brand Portal, public API/webhook và tích hợp affiliate network thật nằm ngoài Phase 1.
- eKYC, payment, FX, social verification và conversion provider được mock.
- Auth đi qua provider adapter; một OAuth provider thật chỉ tích hợp nếu credential sẵn đúng hạn. Nếu không, local/mock adapter phải được acceptance owner chấp thuận và công bố rõ, không được ghi như Google/TikTok SSO thật.
- Thuế và quy định pháp lý trong seed data chỉ là dữ liệu mô phỏng, không khẳng định tuân thủ pháp luật thực tế.
- Khoảng 20% thời gian được dùng cho integration, kiểm thử, sửa lỗi và demo; không lập kín 100% thời gian cho feature mới.

### 1.3. Quyết định kỹ thuật

- Frontend: Next.js + TypeScript + thư viện i18n.
- Backend: NestJS + TypeScript, kiến trúc modular monolith.
- Database: PostgreSQL.
- Object storage local: MinIO cho KYC/content assets.
- Background jobs: worker riêng; chỉ dùng Redis khi queue thực sự cần.
- Contract: REST API + OpenAPI.
- Hạ tầng local: Docker Compose.
- Monorepo gợi ý:
  - apps/web
  - apps/api
  - apps/worker
  - packages/contracts
  - packages/ui
  - infra
  - docs

## 2. Khóa phạm vi

### 2.1. P0 — bắt buộc hoàn thành

P0 gồm toàn bộ 22 yêu cầu Must trong Book1:

- Core Platform: CP-01, CP-02, CP-03, CP-04, CP-05, CP-06, CP-08.
- Admin: AD-01, AD-02, AD-03, AD-04, AD-06, AD-07, AD-09.
- Creator: CR-01 đến CR-08.

Để chứng minh khả năng “cover all product affiliate”, P0 bổ sung các primitive tối thiểu:

- Tách Product → Offer → Campaign.
- Fixed reward khi approved content chạy hoàn chỉnh.
- Tracking asset cá nhân: link, code hoặc hashtag.
- Earning ledger có adjustment/reversal.
- Sáu product archetype trong seed data nhưng chỉ hai campaign chạy sâu toàn bộ flow.

### 2.2. P0b — bằng chứng mở rộng, làm khi core flow đang đúng tiến độ

- Mock conversion endpoint/import.
- Percentage commission từ mock order/conversion.
- Deduplication theo provider + external event ID.

P0b được lập lịch ở tuần 4 nhưng là phần đầu tiên được cắt nếu tiến độ P0 trễ. Khi đó khả năng mở rộng vẫn được chứng minh bằng Product–Offer–Campaign, reward strategy interface, ERD và seed archetype; không hy sinh country isolation, ledger hoặc payout để giữ mock CPS.

### 2.3. P1 — chỉ làm sau khi P0 đạt quality gate

- CP-07: FX realtime/fallback đầy đủ.
- CP-09: rollout percentage nâng cao.
- AD-05: creator management nâng cao.
- AD-08: finance dashboard nâng cao.
- AD-10: global dashboard nâng cao.
- CR-09: social account management đầy đủ.
- CR-10: push notification.

P1 không được lấy thời gian của country isolation, ledger, reconciliation, payout hoặc E2E testing.

### 2.4. Ngoài phạm vi 5 tuần

- Brand self-service portal.
- Network/merchant connector thật.
- Public API và webhook.
- Clickstream quy mô production.
- Rule engine no-code tùy ý.
- Fraud scoring bằng ML.
- Payment và eKYC production.
- Native mobile app.
- Microservices hoặc Kubernetes.
- Báo cáo BI nâng cao.

## 3. Chiến lược triển khai

Không triển khai tuần tự “xong toàn bộ Core → xong toàn bộ Creator → xong toàn bộ Admin”. Dự án sẽ dùng walking skeleton:

    Auth/Country
      → KYC
      → Product/Offer/Campaign
      → Join
      → Content Review
      → Earning
      → Reconciliation
      → Payout

Ngay cuối tuần 2 phải có một flow thô xuyên Creator–Admin. Cuối mỗi tuần đều có bản demo chạy được, không chỉ có code rời.

## 4. Tổng quan 5 tuần

| Tuần | Trọng tâm | Kết quả bắt buộc cuối tuần |
|---|---|---|
| 1 | Product mockup, database, architecture, project skeleton | Chốt flow/state/permission/ERD/API; ứng dụng chạy local và phân biệt được VN/PH |
| 2 | Core Platform, auth, country profile, KYC | Global identity + country isolation + KYC review chạy end-to-end |
| 3 | Product–Offer–Campaign, join và content | Creator join, submit; Ops reject/resubmit/approve; flat earning được tạo |
| 4 | Ledger, tax, FX, reconciliation và payout | Money flow chạy đúng; batch lock; payout success và failure/refund |
| 5 | Hardening, security, E2E, docs và demo | Toàn bộ Must chạy ổn định, seed VN/PH, tài liệu và demo package hoàn chỉnh |

---

## 5. Kế hoạch chi tiết 25 ngày

## Tuần 1 — Chốt sản phẩm và dựng walking skeleton

> Kế hoạch thực thi chi tiết và thứ tự ưu tiên chuẩn: `Plan/KE_HOACH_CHI_TIET_TUAN_1.md`. Bản chi tiết đưa Git/tooling lên đầu Ngày 1 và bootstrap kỹ thuật nhẹ xuyên Ngày 2–4 để không dồn toàn bộ scaffold vào Ngày 5; business logic chỉ bắt đầu sau Architecture Gate.

### Mục tiêu

- Không còn mơ hồ về reward trigger, state, role và country scope.
- Mockup đủ để frontend/backend dùng chung một contract.
- Database và kiến trúc không khóa cứng category/network.
- Môi trường local chạy được bằng một lệnh.

| Ngày | Công việc chính | Đầu ra/tiêu chí hoàn thành |
|---|---|---|
| Ngày 1 | Khởi tạo Git/tooling baseline; xác nhận scope đã phân tích; tạo glossary, RTM; khóa reward/KYC/earning/payout/country decisions; viết bốn primary demo scenario | Git hợp lệ; scope statement, decision log, RTM của 22 Must và Gate G1 đạt |
| Ngày 2 | Vẽ Creator journey và low-fi mockup; thiết kế happy/loading/empty/error/denied/recovery states; nối scenario VN và PH; bootstrap workspace tối thiểu | Creator flow, screen inventory và clickable scenario 1–2; CR-01–CR-08 trace được tới screen/state |
| Ngày 3 | Vẽ Ops/Finance/Admin journey; state machine, permission và provider failure matrix; nối scenario content/payout; bootstrap PostgreSQL Compose | Admin flow, state/permission matrix, bốn clickable scenario và Gate G3 đạt |
| Ngày 4 | Thiết kế ERD Product–Offer–Campaign, global user/country profile, ledger; API Week 2; RLS/isolation strategy; ADR; bắt đầu migration/seed sau Architecture Gate | ERD v1, API contract, migration order, architecture decisions và Gate G4 đạt |
| Ngày 5 | Hoàn thiện Web/API/PostgreSQL skeleton; migration/seed VN/PH; DB→API→UI market-context round-trip; health, route, verify, README, demo/gate | Một lệnh dựng được skeleton; `/health`, `/vn`, `/ph`, migration, seed, lint/type-check/test/build Green |

### Quality gate tuần 1

- Mentor duyệt scope và bốn demo flow.
- Product, Offer và Campaign là ba entity riêng.
- Global identity và country profile được tách trong ERD.
- Các state transition chính đã được định nghĩa.
- Country context được khóa ở mức contract URL → session/token → API → DB; runtime auth/isolation được kiểm chứng trong Tuần 2.
- `/vn` và `/ph` lấy market context khác nhau qua DB → API → UI round-trip.
- Migration/seed chạy lặp lại không tạo duplicate; verify command và hướng dẫn local đã được kiểm chứng.

### Demo cuối tuần 1

1. Khởi động toàn bộ hệ thống.
2. Mở /vn và /ph để thấy locale/market khác nhau.
3. Trình bày prototype bốn flow.
4. Trình bày ERD, state machine và cách thêm product/country mới.

---

## Tuần 2 — Core Platform, auth và KYC

> Kế hoạch thực thi chi tiết và thứ tự dependency chuẩn: `Plan/KE_HOACH_CHI_TIET_TUAN_2.md`. Tuần 2 chỉ bắt đầu khi Gate G5 Tuần 1 đạt; OAuth/eKYC/OTP thật là stretch, còn country isolation, RBAC/RLS, audit và KYC partial resubmit là P0 không được cắt.

### Mục tiêu

- Hoàn thành foundation có rủi ro cao nhất: identity, tenant isolation, RBAC, audit, i18n và KYC.
- Có vertical slice Creator → Local Ops đầu tiên.

| Ngày | Công việc chính | Đầu ra/tiêu chí hoàn thành |
|---|---|---|
| Ngày 6 | Kiểm Gate G5; Auth/session adapter + local fallback; global User/Identity; tạo/list/switch country profile; protected route | Một identity không tạo user trùng; một user có profile VN và PH độc lập |
| Ngày 7 | Permission-specific RBAC; country resolver/scoped query; PostgreSQL RLS bằng runtime role; atomic/safe audit; MFA mock; negative tests | Direct-ID/API/RLS/pool-context đều chặn cross-country; Finance/Global không bypass MFA |
| Ngày 8 | Country config/version; Global Admin form tối thiểu; VI/EN/Filipino + fallback; profile preference; locale formatter; KYC checklist config | VN/PH dùng chung code nhưng khác DB config/locale/currency/checklist; change có authorization/audit |
| Ngày 9 | KYC schema/version/RLS; MinIO private; mock eKYC failure states; Creator API/UI; bootstrap Ops queue/detail read API | Creator submit KYC theo country; duplicate/timeout/document-access tests Green; Ops read API sẵn cho Ngày 10 |
| Ngày 10 | Ops queue/workbench; field review; partial resubmit; optimistic concurrency; audit; VN/PH E2E và security regression | Draft → Submitted → Reviewing → Needs Changes → Resubmitted → Approved chạy được, không leak/mất lịch sử |

### Quality gate tuần 2

- CP-01, CP-03, CP-04, AD-01, AD-04 và CR-01–CR-04 có implementation/evidence mức MVP; CP-02, CP-05 và AD-02 có foundation verified và tiếp tục được áp dụng cho module mới.
- Một global user có VN/PH profile độc lập; switch market không làm lẫn preference/KYC/bank/tax.
- API direct-ID, PostgreSQL RLS bằng runtime role, connection pool và object access đều có negative test chống country leak.
- Finance/Global MFA không bypass; local/dev login fail-closed ở production config.
- Audit atomic, có actor/action/entity/country/outcome/time/before-after summary và không chứa PII/secrets.
- KYC reject bắt buộc reason; creator chỉ sửa field bị reject; provider timeout/duplicate/concurrent review không phá state/history.

### Demo cuối tuần 2

1. Creator đăng nhập.
2. Tạo profile VN, submit KYC.
3. Ops VN yêu cầu sửa bank account.
4. Creator resubmit chỉ bank account.
5. Ops approve.
6. Chuyển sang PH và chứng minh dữ liệu VN không bị lộ.
7. Dùng Ops VN gọi direct-ID KYC PH để chứng minh API/RLS denial và mở audit evidence.

---

## Tuần 3 — Product, Offer, Campaign và Content

> Kế hoạch thực thi chi tiết và thứ tự dependency chuẩn: `Plan/KE_HOACH_CHI_TIET_TUAN_3.md`. Tuần 3 chỉ bắt đầu khi Gate G10 Tuần 2 đạt. P0 chạy sâu `CONTENT_FLAT`; CPS/recurring chỉ được modeled ở trạng thái chưa kích hoạt và không nằm trong gate Tuần 3.

### Mục tiêu

- Hoàn thành phần sản phẩm cốt lõi.
- Creator và Ops đi được từ discovery tới approved content.
- Approved content tạo được flat earning.

| Ngày | Công việc chính | Đầu ra/tiêu chí hoàn thành |
|---|---|---|
| Ngày 11 | Product/Offer/Reward/Terms/Campaign schema; capability registry; seed sáu archetype; Product/Offer read API; Campaign draft API + simple Builder | Local Admin tạo Draft Campaign từ catalog seed; unsupported CPS/recurring strategy không được enable âm thầm |
| Ngày 12 | Activation validator; discovery/detail; eligibility; atomic/idempotent Join; slot + flat-liability reservation; immutable snapshot; My Campaigns | Creator KYC Approved join đúng một lần; parallel join không vượt slot/budget; old snapshot không đổi hồi tố |
| Ngày 13 | Tracking asset; workspace; Content root/version; URL/platform/hashtag/dedupe; submit UI/API; FlatReward/Pending Earning contract; Ops read API skeleton | Creator nhận asset, submit hợp lệ; duplicate/unsafe content bị chặn; reward business key sẵn cho approve |
| Ngày 14 | Ops queue/workbench; Needs Changes/terminal reject; resubmit/history; stale guard; bulk per-item; atomic approve → Pending Earning + reserved→committed | One deliverable tạo đúng one Pending Earning; transaction failure không để Approved/earning/budget lệch |
| Ngày 15 | Join/approve fault, retry và PostgreSQL concurrency tests; counters/CSV nếu Green; full E2E, regression, fix và demo | `reserved + committed <= total`; full Campaign→Join→Content→Review→Earning chạy từ seed hai lần |

### Quality gate tuần 3

- AD-03 và AD-09 hoàn thành mức MVP.
- CR-05 và CR-06 chạy end-to-end.
- Product, Offer, Campaign không bị gộp thành một entity.
- Sáu product archetype dùng chung canonical model; strategy chưa hỗ trợ không thể activate.
- Reward, currency, Offer/Campaign version và terms được snapshot lúc join.
- Campaign không active nếu thiếu country, reward, budget, dates, terms hoặc localization bắt buộc.
- Eligibility chỉ phục vụ UX; Join revalidate và reserve slot/max flat liability trong transaction.
- Content approval chuyển liability reserved→committed và tạo Pending Earning đúng một lần trong cùng transaction.
- Budget invariant `reserved + committed <= total` được kiểm tra bằng PostgreSQL concurrency tests.
- Bulk action trả kết quả theo từng item.

### Demo cuối tuần 3

1. Trình bày sáu archetype và một CPS/recurring Offer Draft bị capability guard chặn activation.
2. Local Admin tạo/activate VN Content Flat Campaign.
3. Creator đủ điều kiện join; hệ thống reserve budget và snapshot commercial terms.
4. Hệ thống tạo tracking asset.
5. Creator submit content sai hashtag rồi submit bản hợp lệ.
6. Ops request changes có reason; Creator resubmit và giữ version history.
7. Ops approve; hệ thống tạo đúng một Pending Earning và chuyển budget reserved→committed.
8. Retry Join/Approve hoặc direct-ID PH chứng minh idempotency/country isolation.

---

## Tuần 4 — Money, reconciliation và payout

> Kế hoạch thực thi chi tiết và thứ tự dependency chuẩn: `Plan/KE_HOACH_CHI_TIET_TUAN_4.md`. Tuần 4 chỉ bắt đầu khi Gate G15 Green. Payout luôn dùng local currency; USD chỉ là tham chiếu. P0b mock conversion/CPS chỉ được mở tại Gate G17 khi toàn bộ money/ledger P0 đang Green. Provider timeout là `UNKNOWN`, phải giữ reserve và reconcile trước khi retry/release.

### Mục tiêu

- Hoàn thành giao điểm rủi ro nhất giữa Creator và Finance.
- Money flow chính xác, có idempotency, audit, lock và reversal.

| Ngày | Công việc chính | Đầu ra/tiêu chí hoàn thành |
|---|---|---|
| Ngày 16 | Money model; amount/currency; Gross–Tax–Net; FX reference snapshot và settlement snapshot; immutable ledger; rounding tests | Không dùng float; earning có rule/tax/FX version; ledger cân bằng theo các scenario |
| Ngày 17 | Creator Earnings dashboard/detail; pending/confirmed/available/paid/reversed; nếu P0 đang Green thì thêm mock conversion ingestion + dedupe + CPS calculation | Creator hiểu tiền đến từ đâu; P0b nếu triển khai không tạo duplicate earning |
| Ngày 18 | Reconciliation batch builder; line items; anomaly checks; approve/lock; adjustment/reversal; export tối thiểu | Finance khóa batch; dữ liệu đã khóa không update đè; anomaly được hiển thị |
| Ngày 19 | Payout request; minimum/balance validation; OTP; reserve balance; idempotency key; mock provider; payout queue | Double-click không tạo hai payout; available balance được reserve đúng |
| Ngày 20 | Payout success/confirmed failure/timeout/retry/reversal; PH configuration; integration tests toàn money flow; buffer sửa lỗi | Confirmed failure release reserve đúng một lần; timeout giữ reserve; retry không trả trùng; VN/PH money flow đều chạy |

### Quality gate tuần 4

- CP-06 và CP-08 hoàn thành.
- AD-06, AD-07, CR-07 và CR-08 hoàn thành.
- Reference FX và locked settlement FX được phân biệt.
- Ledger và reconciliation batch đã khóa là immutable.
- Payout luôn có idempotency; conversion chỉ phải idempotent khi P0b `DONE`, còn khi P0b `CUT` thì unsupported capability phải bị chặn rõ.
- Reversal tạo adjustment entry, không xóa lịch sử.
- OTP có expiry, attempt limit và audit.

### Demo cuối tuần 4

1. Nếu P0b đạt Gate G17: mock conversion được ingest hai lần nhưng chỉ tạo một earning. Nếu P0b bị cắt: dùng duplicate Approve/provider callback để chứng minh exactly-once.
2. Creator thấy Gross–Tax–Net và trạng thái tiền.
3. Finance tạo batch, xử lý anomaly và khóa FX.
4. Creator tạo payout bằng OTP.
5. Mock provider trả confirmed failure.
6. Reserved balance được release về Available đúng một lần.
7. Retry thành công mà không tạo payout trùng.

---

## Tuần 5 — Hardening, tài liệu và bàn giao

> Kế hoạch thực thi chi tiết và Gate G21–G25: `Plan/KE_HOACH_CHI_TIET_TUAN_5.md`. Báo cáo đối chiếu xuyên Tuần 1–5 và CPS: `Plan/RA_SOAT_KE_HOACH_TUAN_1_DEN_5.md`.

### Mục tiêu

- Không thêm feature lớn sau ngày 22.
- Chứng minh toàn bộ Must bằng test và demo.
- Bàn giao sản phẩm có thể chạy lại trên máy mới.

| Ngày | Công việc chính | Đầu ra/tiêu chí hoàn thành |
|---|---|---|
| Ngày 21 | Chạy/harden E2E đã được scaffold và phát triển từ Tuần 1–4 cho bốn primary flows; negative country leakage; RBAC/RLS; idempotency/concurrency regression | E2E core pass; không có blocker, country data leak, wrong money hoặc duplicate business effect |
| Ngày 22 | Responsive Creator UI; Admin desktop usability; i18n audit; accessibility cơ bản; pagination/performance với seed volume lớn | Không có text hard-code quan trọng; các queue/list hoạt động với dữ liệu volume test |
| Ngày 23 | Kiểm chứng/freeze seed VN/PH và six product archetypes đã xây từ Tuần 3; README; OpenAPI; ERD; user flow; decision log; known limitations | Máy mới có thể setup bằng README; demo không cần chỉnh DB thủ công |
| Ngày 24 | Xác nhận Feature Freeze từ cuối Ngày 22; full regression; chỉ fix release defect; backup/restore smoke; chuẩn bị slide và demo script; rehearsal lần 1 | Release candidate; checklist bàn giao đạt; thời lượng demo nằm trong 12–15 phút |
| Ngày 25 | Fix cuối; clean setup rehearsal; tag release; xuất test evidence; rehearsal lần 2; final demo và bàn giao | Release package hoàn chỉnh, source/tag, docs, seed, test report, slide và demo script |

### Quality gate tuần 5

- 22 Must có bằng chứng UI/API/test.
- Bốn primary E2E flow pass.
- Sev-0 = 0, Sev-1 = 0; không Sev-2 ảnh hưởng Must; không data leak hoặc wrong money.
- Docker Compose, migration và seed chạy lại được.
- README được kiểm tra trên môi trường sạch.
- Demo không cần thao tác DB thủ công.
- Known limitations được ghi rõ, không che giấu.

---

## 6. Ánh xạ 22 yêu cầu Must

| ID | Nội dung rút gọn | Tuần/ngày chính | Bằng chứng hoàn thành |
|---|---|---|---|
| CP-01 | Country configuration | Tuần 1–2, ngày 5/8 | Typed config seed/UI; locale/currency/KYC/tax/payment/social/provider flags + simple feature toggle/version/audit |
| CP-02 | Country data isolation | Tuần 2–5, ngày 7/21–22 | API/list/count/export negative test + PostgreSQL RLS/storage/pool-context test trên toàn bộ module |
| CP-03 | Điều hướng /vn và /ph | Tuần 1, ngày 5 | Route/context test |
| CP-04 | Global identity + country profile | Tuần 2, ngày 6 | Một user có hai profile độc lập |
| CP-05 | i18n và locale | Tuần 2/5, ngày 8/22 | VI/EN/Filipino + fallback EN cho UI, status, validation/reason, OTP/provider messages |
| CP-06 | Local money + USD reference | Tuần 4, ngày 16–17 | Earnings UI hiển thị local chính, USD tham chiếu |
| CP-08 | Gross–Tax–Net | Tuần 4, ngày 16 | Rule/version/rounding unit tests |
| AD-01 | Admin auth/RBAC/MFA | Tuần 2, ngày 6–7 | Permission matrix tests; OTP/MFA Finance/Global |
| AD-02 | Audit trail | Tuần 2–5 | Audit inventory/redaction cho auth/config/KYC/campaign/content/batch/payout/provider |
| AD-03 | Content review E2E | Tuần 3, ngày 14 | Reject/resubmit/approve/bulk tests |
| AD-04 | KYC review E2E | Tuần 2, ngày 10 | Field-level rejection/resubmit E2E |
| AD-06 | Reconciliation E2E | Tuần 4, ngày 18 | Batch/anomaly/lock/export test |
| AD-07 | FX lock và payout | Tuần 4, ngày 18–20 | Locked rate + success/confirmed-failure release/UNKNOWN/post-success reversal |
| AD-09 | Campaign/budget/analytics/export cơ bản | Tuần 3, ngày 11–15 | Campaign builder, activation validation, cap, basic counters và CSV |
| CR-01 | Global SSO | Tuần 2, ngày 6 | OAuth thật hoặc disclosed mock + acceptance-owner waiver; global session/idempotency |
| CR-02 | Country onboarding | Tuần 2, ngày 6 | Create/switch VN/PH profile |
| CR-03 | Language/currency selection | Tuần 2, ngày 8 | Locale/currency preference |
| CR-04 | Country KYC | Tuần 2, ngày 9–10 | Creator/Admin KYC E2E |
| CR-05 | Discover/join campaign | Tuần 3, ngày 12–13 | Eligibility + idempotent join + personal link/code/hashtag + My Campaigns |
| CR-06 | Submit/follow content | Tuần 3, ngày 13–14 | Validation + reject/resubmit |
| CR-07 | Earnings transparency | Tuần 4, ngày 16–20 | Ledger/source/Gross–Tax–Net và Pending/Confirmed/Available/Paid/Reversed UI |
| CR-08 | Payout E2E | Tuần 4, ngày 19–20 | OTP, reserve, status, confirmed-failure release, UNKNOWN hold, retry success |

## 7. Mock data và provider simulation

### 7.1. Seed data

- Countries: VN và PH.
- Locales: vi-VN, en, en-PH, fil-PH.
- Currencies: VND, PHP và USD tham chiếu.
- Roles: Creator, Local Ops, Local Finance, Local Admin, Global Admin.
- Creator cases:
  - VN approved.
  - PH KYC needs changes.
  - Một global user có cả VN và PH profile.
  - Một creator suspended dùng để test permission.
- Campaign lifecycle: draft, active, paused, closed; upcoming/full/ended là trạng thái dẫn xuất cho discovery/eligibility.
- Content states: submitted, needs changes, resubmitted, rejected terminal, approved, duplicate/private.
- Earnings: pending, confirmed, available, reversed, paid.
- Payout: success, confirmed failure/balance released, timeout/unknown và post-success refund/reversal.
- Một reconciliation batch có duplicate/outlier/missing-bank anomaly.

### 7.2. Product archetypes

1. VN beauty physical product: `CONTENT_FLAT` chạy sâu; paid-order CPS là future goal, hoặc P0b `PAID_ORDER + SALE_PERCENT` nếu G17 Green.
2. PH SaaS subscription: `CONTENT_FLAT` chạy sâu; recurring commission chỉ modeled/disabled.
3. VN education: qualified-lead/CPL modeled-only.
4. PH travel: completed-booking/percentage modeled-only.
5. Mobile app: install/activation/CPI modeled-only.
6. Marketplace: promo-code/order attribution modeled-only.

Hai campaign chạy sâu đều dùng cùng executable `CONTENT_FLAT` core flow. CPS/recurring/CPL/CPI/booking/promo-code không được activate trừ phần P0b CPS đã thật sự đạt G17; các archetype còn lại chứng minh canonical model/capability guard, không chứng minh mọi mechanism đã chạy.

### 7.3. Mock provider phải có hành vi thực tế

- Success.
- Validation failure.
- Timeout/unknown result.
- Duplicate callback/request.
- Temporary failure rồi retry.
- Confirmed-failure balance release và post-success reversal/refund.
- FX source unavailable và fallback.

## 8. Kế hoạch kiểm thử

### 8.1. Unit test

Ưu tiên domain có rủi ro cao:

- Eligibility.
- State transition.
- Commission calculation nếu P0b `DONE`; nếu P0b `CUT` thì test capability guard cho CPS/recurring.
- Gross–Tax–Net.
- Currency rounding.
- FX snapshot.
- Budget cap.
- Ledger posting/reversal.
- Payout reserve/failure release/UNKNOWN/post-success reversal.
- Idempotency.

Mục tiêu coverage tập trung tối thiểu 70% cho money, authorization và state-machine modules; không chạy theo coverage tổng toàn repo.

### 8.2. Integration test

- API + PostgreSQL.
- RLS/country isolation.
- Unique external event nếu P0b `DONE`; idempotency key cho core commands luôn bắt buộc.
- Concurrent join/budget cap.
- Audit creation.
- Batch lock/immutability.
- Object storage access.
- Mock provider retry.

### 8.3. E2E bắt buộc

1. VN happy path: login → KYC → join → submit → approve → earning → reconciliation → payout success.
2. PH KYC needs changes: field reject → resubmit → approve.
3. Content reject/resubmit và budget/eligibility guard.
4. Payout confirmed failure → balance release → explicit retry success; timeout/unknown vẫn giữ reserve.
5. VN role gọi trực tiếp PH API phải nhận 403/404 phù hợp.
6. Duplicate join, approve và payout/provider event không tạo duplicate record/money; duplicate conversion chỉ chạy nếu P0b `DONE`.

### 8.4. Smoke test mỗi ngày

- API health.
- Migration status.
- Login.
- Route VN/PH.
- Một critical path đang phát triển.
- Git status và test liên quan trước khi kết thúc ngày.

## 9. Definition of Done

Một story chỉ được coi là Done khi:

1. Acceptance criteria rõ và đã pass.
2. Backend kiểm soát state transition; frontend không tự quyết business status.
3. Authorization và country scope được kiểm tra.
4. UI có loading, empty, error và permission-denied state phù hợp.
5. Action quan trọng có audit.
6. Text người dùng có translation key.
7. Unit/integration test cho business rule hoặc permission quan trọng.
8. Seed/demo data hỗ trợ kiểm tra.
9. OpenAPI/ERD/decision log được cập nhật nếu contract thay đổi.
10. Không có lỗi blocker/high liên quan.
11. Code đã lint/type-check.
12. Có thể demo mà không sửa DB thủ công.

## 10. Nhịp quản lý dự án

### Mỗi ngày

- 15 phút: xác định một outcome chính trong ngày.
- 4–5 giờ: implementation tập trung.
- 1–1,5 giờ: integration/test.
- 30 phút: cập nhật docs, board, decision log.
- Cuối ngày: commit nhỏ, smoke test, ghi blocker và kế hoạch ngày sau.

### Mỗi cuối tuần

1. Chạy full smoke/integration test liên quan.
2. Demo vertical slice cho mentor.
3. Đối chiếu feature IDs trong Book1.
4. Chốt decision mới và cập nhật risk register.
5. Chỉ nhận P1 nếu weekly quality gate đã đạt.

Board gợi ý:

    Backlog → Ready → In Progress → Review/Test → Done → Demo Verified

Giới hạn WIP: tối đa một feature lớn và một bug đang xử lý cùng lúc.

## 11. Risk register và contingency

| Rủi ro | Dấu hiệu kích hoạt | Cách phòng ngừa | Contingency |
|---|---|---|---|
| Scope creep | Thêm dashboard/network/brand portal trước khi E2E ổn | Scope P0/P0b/P1 được ký duyệt tuần 1 | Dừng toàn bộ P0b/P1; chỉ nhận bug/blocker |
| Mockup chưa chốt | ERD/API đổi lớn sau tuần 2 | Review prototype, state và ERD cuối tuần 1 | Giữ core flow; giảm hi-fi polish, không đổi ledger/country model tùy tiện |
| OAuth credential chậm | Chưa có credential tới ngày 6 | Auth adapter + local demo identity | Demo bằng local/OAuth mock; giữ contract để gắn provider sau |
| Country data leak | Query không có tenant context | Route/token context + RLS + negative tests | Feature freeze và sửa ngay; đây là release blocker |
| Sai tiền/duplicate payout | Ledger lệch hoặc retry tạo bản ghi trùng | Minor unit/decimal, transaction, idempotency, invariants | Không demo payout cho tới khi reconciliation test pass |
| Finance flow trễ | Cuối ngày 18 chưa khóa được batch | Flat reward trước, mock provider đơn giản | Cắt report/chart; giữ reconciliation + payout core |
| UI quá rộng | Nhiều màn nhưng không có flow hoàn chỉnh | Campaign-first, reuse design system | Giảm variation; giữ 10–12 core views và bốn click-through |
| i18n trễ | Text hard-code tăng trong tuần 3–4 | Translation key từ khi tạo component | Chỉ dịch core journey; fallback EN cho phần phụ |
| Provider mock quá đơn giản | Chỉ có trạng thái success | Contract và failure matrix từ tuần 1 | Thêm timeout/duplicate/failure trước khi làm connector mới |
| Môi trường demo lỗi | Setup phụ thuộc máy cá nhân | Docker Compose, seed idempotent, clean setup test | Ngày 24 bắt buộc rehearsal trên môi trường sạch |

### Quy tắc xử lý khi trễ tiến độ

- Trễ 1 ngày: dùng buffer cuối tuần hiện tại, không nhận P1.
- Trễ 2–3 ngày: cắt toàn bộ UI polish không phục vụ four primary flows; giữ business rule thật.
- Trễ hơn 3 ngày: cắt P0b mock CPS, thu hẹp breadth của product archetype, campaign variation và report; không cắt country isolation, RBAC, audit, ledger, reconciliation hay payout integrity.
- Sau ngày 22: không thêm feature lớn.
- Blocker về data leak hoặc money correctness luôn ưu tiên hơn UX và dashboard.

## 12. Bộ bàn giao cuối cùng

1. Tài liệu product:
   - Product scope.
   - Personas/JTBD.
   - User flow.
   - Screen inventory/mockup.
   - Permission matrix.
   - State machine.
2. Tài liệu kỹ thuật:
   - Architecture diagram.
   - ERD.
   - OpenAPI.
   - Decision log.
   - Security/country isolation approach.
3. Source code:
   - Frontend.
   - Backend.
   - Worker/mock provider.
   - Migration và seed.
4. Hạ tầng:
   - Docker Compose.
   - Environment example.
   - Health checks.
5. Quality evidence:
   - Unit/integration/E2E results.
   - Feature-to-test mapping.
   - Known limitations.
6. Demo:
   - VN/PH seed data.
   - Demo script 12–15 phút.
   - Slide.
   - Release tag.

## 13. Kịch bản demo cuối kỳ đề xuất

1. Global Admin giới thiệu country configuration VN/PH.
2. Creator đăng nhập và tạo profile VN.
3. Creator submit KYC; Ops yêu cầu sửa bank; creator resubmit; Ops approve.
4. Local Admin kích hoạt campaign có Product–Offer–Campaign và budget.
5. Creator join, nhận tracking asset và submit content.
6. Ops reject vì thiếu hashtag; creator sửa; Ops approve.
7. Approved content tạo flat reward; nếu P0b đã Green thì demo thêm mock conversion tạo CPS earning.
8. Creator xem Gross–Tax–Net và trạng thái tiền.
9. Finance tạo batch, xử lý anomaly và khóa FX.
10. Creator yêu cầu payout bằng OTP.
11. Lần đầu payout confirmed failure và reserve được release về Available; retry thành công. `UNKNOWN` được minh họa là vẫn giữ reserve.
12. Chuyển sang PH để chứng minh country isolation, i18n và currency khác.
13. Mở audit trail cho các hành động vừa thực hiện.

Demo này trực tiếp chứng minh các phần có trọng số cao nhất trong Book1: chức năng end-to-end, kiến trúc/country isolation, UX/i18n và khả năng trình bày.
