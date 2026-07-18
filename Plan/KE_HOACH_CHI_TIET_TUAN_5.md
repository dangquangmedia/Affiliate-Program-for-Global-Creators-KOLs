# KẾ HOẠCH TRIỂN KHAI CHI TIẾT TUẦN 5

> Dự án: Affiliate GLOBAL  
> Thời lượng: Ngày 21–25, khoảng 40 giờ  
> Nguồn phạm vi: `Plan/docs/Book1.xlsx`, kế hoạch 5 tuần, kế hoạch chi tiết Tuần 1–4 và Gate G20  
> Trạng thái khi lập kế hoạch: Pre-implementation; Tuần 1–4 mới hoàn thành tài liệu kế hoạch, chưa được thực thi  
> Điều kiện bắt đầu: Gate G20 phải đạt `GO` hoặc `CONDITIONAL GO` không liên quan money correctness, security, isolation, idempotency hoặc Must flow  
> Mục tiêu tuần: hardening, chứng minh 22 Must, đóng gói và bàn giao một MVP end-to-end có thể dựng lại trên môi trường sạch

## 1. Kết quả bắt buộc cuối Tuần 5

Tuần 5 không phải tuần để mở thêm phạm vi sản phẩm. Đây là tuần biến các vertical slice của Tuần 1–4 thành một release candidate có bằng chứng, có thể dựng lại và có giới hạn được công bố trung thực.

Cuối tuần phải chứng minh được chín kết quả:

1. **Bốn primary journey chạy ổn định:** Identity/KYC, Campaign/Content/Earning, Money/Reconciliation/Payout và Security/Isolation đều Green trên release commit.
2. **22 Must có traceability thật:** mỗi yêu cầu có trạng thái, UI evidence, API/DB evidence, automated-test evidence và limitation nếu có; không đánh dấu `DONE` chỉ vì đã có kế hoạch.
3. **Không còn defect chặn release:** `Sev-0 = 0`, `Sev-1 = 0`, không có Sev-2 ảnh hưởng Must flow, data integrity hoặc demo chính.
4. **Security và country isolation không regression:** role, country, owner, partner, direct ID, RLS, MFA, audit và redaction đều có negative evidence.
5. **Money effect đúng và exactly once:** Gross = Tax + Net; Ledger cân bằng/bất biến; reconciliation lock bất biến; payout success, confirmed failure, `UNKNOWN`, retry và duplicate callback không tạo sai tiền.
6. **Core UI dùng được:** Creator responsive, Admin desktop, i18n/fallback, accessibility cơ bản, pagination và seed-volume performance đạt baseline đã công bố.
7. **Setup tái lập được:** clean checkout → build → Compose → migrate → seed → smoke không dùng file/volume cũ và không sửa DB thủ công.
8. **Tài liệu khớp release:** README, OpenAPI, ERD, state machine, permission, runbook, backup/restore, rollback và known limitations không lệch code/fixture.
9. **Release package và demo hoàn chỉnh:** source/tag, manifest, evidence, test report, seed, slide, demo script 12–15 phút và sign-off thực tế.

Release chain cuối kỳ:

~~~text
G20 Money E2E
  → G21 Full E2E + Security + Idempotency
  → G22 UX + i18n + a11y + Performance + Feature Freeze
  → G23 Seed + Docs + Reproducible Setup + 22-Must Evidence
  → G24 Full Regression + Backup/Restore + Release Candidate
  → G25 Clean Release + Demo + Sign-off + Handoff
~~~

Viết xong tài liệu này **không có nghĩa sản phẩm đã hoàn thành**. Mọi checklist triển khai bên dưới mặc định là `TODO` cho tới khi có command/test/file evidence thật.

## 2. Entry Gate và phạm vi tuần

### 2.1. Điều kiện bắt đầu Ngày 21

Trước `W5-D21-T01`, phải có bằng chứng từ Gate G20:

- Sáu Must Tuần 4 `CP-06`, `CP-08`, `AD-06`, `AD-07`, `CR-07`, `CR-08` đạt MVP.
- Gross–Tax–Net và currency rounding Green bằng exact decimal.
- Reward, tax, reference FX và settlement FX snapshot bất biến.
- Ledger cân bằng, append-only; locked reconciliation batch không update/delete được.
- Available balance chỉ phát sinh sau reconciliation lock.
- Payout OTP, allocation, reserve và provider effect idempotent; không double spend/double pay/double release.
- Confirmed failure release reserve đúng một lần; timeout/`UNKNOWN` vẫn giữ reserve.
- Paid/refunded/reversed history dùng linked transaction, không overwrite lịch sử.
- Country/user/partner/RBAC/RLS/audit/PII-redaction regression Green.
- Migration, seed, verify và full VN/PH money flow tái lập được.
- P0b CPS có trạng thái rõ `DONE` hoặc `CUT/DEFERRED`; không có code nửa chừng.
- Danh sách defect, failing/flaky test và limitation có owner/status thật.

#### Chính sách vào tuần theo kết quả G20

| G20 | Hành động Ngày 21 | Không được làm |
|---|---|---|
| `GO` | Bắt đầu full regression theo kế hoạch | Mở feature lớn mới |
| `CONDITIONAL GO` | Chỉ nhận carry-over P2/documentation hoặc provider/P0b ngoài scope; ghi owner/deadline | Che debt money/security dưới nhãn conditional |
| `NO-GO` money/security/data | Dùng `W5-D21-T02` và buffer để xác minh/sửa blocker; nếu chưa Green thì dừng G21 và replan | Responsive, polish, docs, performance hoặc rehearsal trước khi invariant Green |

Carry-over Sev-0/Sev-1 không được âm thầm tiêu hết Ngày 21. Nếu không đóng trong timebox đã định, kết quả là `NO-GO/replan`, không hạ gate hoặc cắt test để giữ lịch.

### 2.2. P0 bắt buộc Tuần 5

#### End-to-end và release quality

- Bốn primary journey chạy từ deterministic seed, không phụ thuộc thứ tự test.
- Positive, negative, retry, duplicate, concurrency và recovery path có evidence.
- Full unit/integration/E2E/security/money/build regression trên release candidate.
- Flaky test phải tìm root cause; không thêm retry để làm xanh giả.
- Severity, triage SLA, defect owner và re-test evidence rõ.

#### Security, privacy và isolation

- Role × country × owner × partner × state permission matrix regression.
- API direct-ID, query thiếu country filter và PostgreSQL RLS bằng runtime role.
- Session expiration/revoke, MFA scope, OTP purpose/expiry/attempt/reuse.
- Audit completeness và redaction; không log OTP, token, document, bank hoặc tax value thô.
- Secret/PII scan trên source, seed, logs, screenshots và evidence pack.

#### UX và non-functional baseline

- Creator responsive ở mobile/tablet/desktop target.
- Admin/Ops/Finance dùng được ở desktop target; queue/list không vỡ layout.
- VI, EN fallback, en-PH và fil-PH trên core journey; date/number/money đúng locale.
- Accessibility baseline cho core view: automated critical/serious, keyboard, focus, label và error/status semantics.
- Pagination server-side, stable sort và volume-test performance có threshold/hardware rõ.

#### Reproducibility, documentation và handoff

- VN/PH seed, sáu product archetype và provider scenario deterministic/idempotent.
- README clean setup/reset/troubleshooting; `.env.example` không chứa secret.
- OpenAPI/ERD/state/permission/decision/RTM đồng bộ release.
- Runbook cho health, migration, seed, worker, provider `UNKNOWN`, backup/restore và rollback.
- Known limitations ghi rõ tax/FX/eKYC/payment/OAuth/network nào là mock.
- Release tag/manifest/test report/evidence/demo package và sign-off thật.

### 2.3. Không phải P0 Tuần 5

- Feature mới thuộc P1: realtime FX production, rollout nâng cao, creator/global/finance dashboard nâng cao, social management hoặc push notification.
- Brand portal, affiliate-network connector, public API/webhook hoặc clickstream production.
- CPS/CPL/CPI/recurring/booking/promo-code execution mới nếu chưa được mở ở G17.
- OAuth, eKYC, payment hoặc social provider production nếu chưa có credential/integration từ trước.
- Native mobile, microservices, Kubernetes, multi-region hoặc production certification.
- Tax/legal compliance engine; seed tax/FX chỉ là synthetic demo.
- Hi-fi animation, BI chart, report styling hoặc refactor kiến trúc không sửa defect.
- Safari/iOS device certification, penetration test đầy đủ hoặc WCAG certification chính thức.

### 2.4. Nhánh P0b CPS phải độc lập với release gate

Trạng thái P0b lấy nguyên từ G17/G20:

- Nếu `DONE`: test mock conversion, `SALE_PERCENT`, unique `provider + external_event_id`, exact commission/budget cap và cùng Earning/Ledger pipeline.
- Nếu `CUT/DEFERRED`: không có code dang dở, feature flag tắt, CPS/Recurring Offer chỉ ở Draft/modeled-only và activation trả `CAPABILITY_NOT_ENABLED_IN_PHASE1`.
- Release gate, bốn primary journey và demo chính không được phụ thuộc P0b.
- Khi P0b bị cắt, exactly-once được chứng minh bằng duplicate Join, duplicate Approve, duplicate payout request và duplicate provider callback.
- Không tuyên bố “cover all affiliate mechanisms đã chạy”. Claim đúng là: canonical Product → Offer → Campaign + capability registry + six archetypes + một executable `CONTENT_FLAT` strategy; CPS chỉ executable nếu P0b thực sự Green.

## 3. Bốn primary journey làm xương sống

### 3.1. J1 — Identity, Country và KYC

~~~text
Global login/session
  → tạo profile VN và PH độc lập
  → switch market
  → submit KYC VN
  → Local Ops request changes cho bank field
  → Creator chỉ sửa field đó
  → resubmit
  → Local Ops approve
~~~

Negative assertions:

- Ops PH không đọc được KYC VN; cùng-country nhưng sai owner cũng bị chặn.
- Route/session country mismatch không lấy nhầm profile.
- Approved field không sửa lại; decision/version history không mất.
- Provider timeout không tự reject hoặc tạo case trùng.
- Finance/Global privileged route không bypass MFA.
- Audit không chứa document/bank/tax value thô.

Must chính: `CP-01` đến `CP-05`, `AD-01`, `AD-02`, `AD-04`, `CR-01` đến `CR-04`.

### 3.2. J2 — Campaign, Content và Pending Earning

~~~text
Local Admin chọn Product + Offer
  → tạo/validate/activate CONTENT_FLAT Campaign
  → Creator discover + eligibility + idempotent Join
  → immutable terms/reward/currency snapshot + tracking asset
  → submit invalid rồi valid content
  → Ops Needs Changes
  → Creator resubmit giữ version history
  → Ops approve
  → budget reserved → committed + đúng một Pending Earning
~~~

Negative assertions:

- Offer/Campaign sai country/currency hoặc unsupported strategy không activate.
- Duplicate/concurrent Join không tạo Participation/reservation trùng và không vượt cap.
- Asset/canonical URL không trùng hoặc chứa PII.
- Stale/cross-country review bị chặn; bulk retry không lặp side effect.
- Double-click/retry Approve chỉ tạo one Earning/commit/audit business effect.
- Nếu cancel/expire lifecycle được enable, reservation phải release đúng một lần; nếu chưa implement thì transition đó phải disabled và ghi limitation, không để dangling liability âm thầm.

Must chính: `CP-02`, `CP-05`, `AD-02`, `AD-03`, `AD-09`, `CR-05`, `CR-06` và source foundation của `CR-07`.

### 3.3. J3 — Money, Reconciliation và Payout

~~~text
Pending Earning
  → Gross/Tax/Net + immutable tax/reference-FX snapshot
  → balanced append-only Ledger
  → Finance build/anomaly/approve/lock reconciliation
  → Available Balance
  → Creator OTP payout + atomic reserve
  → confirmed failure + BALANCE_RELEASED đúng một lần
  → explicit retry + re-reserve
  → provider success + Paid đúng một lần
~~~

Fault branch bắt buộc:

~~~text
Provider timeout/lost response
  → UNKNOWN/RECONCILING
  → giữ reserve
  → query/callback resolution
  → không auto release và không gửi payment instruction mới
~~~

Negative assertions:

- Gross = Tax + Net theo currency scale; không có float.
- Reference FX không đổi local payout amount và không bị gọi là settlement rate.
- Locked batch/line/Ledger không update/delete; correction là linked reversal.
- Duplicate batch lock, payout request, outbox/provider event không tạo posting/payment/release trùng.
- Confirmed failure là release reservation; `REFUNDED` chỉ dùng cho linked reversal sau một payment đã success.
- Full VN/VND và PH/PHP money flow dùng cùng code path, khác country config.

Must chính: `CP-02`, `CP-06`, `CP-08`, `AD-02`, `AD-06`, `AD-07`, `CR-07`, `CR-08`.

### 3.4. J4 — Security/Isolation Negative Journey

J4 là tập API/DB/UI negative assertions chạy xuyên J1–J3:

- Sai role.
- Sai country.
- Sai owner cùng country.
- Sai partner assignment.
- Direct-ID enumeration.
- Query/repository quên country filter nhưng RLS vẫn chặn.
- Route country khác session/profile country.
- Stale expected version.
- Same idempotency key khác payload.
- Concurrent Join/Approve/Batch lock/Payout.
- Duplicate/out-of-order provider event.
- Session/OTP/MFA failure.
- Audit redaction và object-storage access.

Không coi UI ẩn CTA là security evidence nếu API/RLS chưa bị test.

## 4. Thứ tự ưu tiên và dependency

| Thứ tự | Nhóm việc | Mức | Dependency/lý do |
|---:|---|---|---|
| 1 | Xác minh Gate G20 và release baseline | P0 | Không harden trên money/security invariant lỗi |
| 2 | Deterministic reset/seed + E2E harness | P0 | Mọi journey/evidence phải chạy lặp lại được |
| 3 | J1 Identity/KYC regression | P0 | Khóa identity/country/role trước data flow sau |
| 4 | J2 Campaign/Content/Earning regression | P0 | Chứng minh source money đáng tin |
| 5 | J3 Money/Reconciliation/Payout regression | P0 | Chứng minh financial integrity |
| 6 | J4 Security/idempotency/concurrency regression | P0 | Chặn release nếu có leak hoặc duplicate effect |
| 7 | Responsive/i18n/a11y/pagination/performance | P0 release quality | Chỉ sau correctness/security Green |
| 8 | Feature Freeze cuối G22 | P0 control | Ngăn Ngày 23–25 trở thành feature sprint |
| 9 | Seed/docs/RTM/clean setup | P0 | Release phải tái lập và giải thích được |
| 10 | Full regression/backup-restore/RC | P0 | Chứng minh candidate an toàn trước demo |
| 11 | Final clean setup/tag/evidence/demo/sign-off | P0 | Hoàn tất G25 và handoff |
| 12 | P0b/P1/polish/refactor | Không nhận | Không được lấy thời gian release integrity |

Dependency bắt buộc:

~~~text
G20 trustworthy money/security baseline
  → G21 four journeys + integrity/security Green
  → G22 non-functional baseline + Feature Freeze
  → G23 deterministic seed + docs + clean setup + 22-Must traceability
  → G24 full regression + restore + RC + rehearsal 1
  → G25 final clean release + critical smoke + tag + rehearsal 2 + sign-off
~~~

## 5. Phân bổ công suất 40 giờ

| Ngày | Task đã lên lịch | Buffer | Trọng tâm |
|---|---:|---:|---|
| 21 | 7 giờ | 1 giờ | Full E2E, security, tenancy, idempotency |
| 22 | 7 giờ | 1 giờ | Responsive, i18n, accessibility, pagination, performance |
| 23 | 7 giờ | 1 giờ | Seed, docs, RTM và reproducible setup |
| 24 | 7 giờ | 1 giờ | Full regression, backup/restore, RC và rehearsal 1 |
| 25 | 7 giờ | 1 giờ | Clean release, evidence, rehearsal 2 và sign-off |
| **Tổng** | **35 giờ** | **5 giờ** | **Không vượt 40 giờ** |

Buffer chỉ dùng cho:

- G20 carry-over blocker trong policy cho phép.
- Sev-0/Sev-1 defect và regression vùng ảnh hưởng.
- Flaky root-cause, environment, clean-install hoặc restore failure.
- Demo/release blocker.

Buffer không dùng cho P0b, feature mới, hi-fi, dashboard, refactor hoặc “làm đẹp cho đủ giờ”.

## 6. Quyết định phải khóa trước/tại thời điểm triển khai

| ID | Quyết định | Default recommendation | Deadline |
|---|---|---|---|
| W5-DEC-01 | Entry policy | Chỉ G20 GO/conditional không ảnh hưởng money/security/Must mới vào full W5; NO-GO phải sửa/replan | Đầu Ngày 21 |
| W5-DEC-02 | Release baseline | Một commit/candidate ID duy nhất cho test/evidence; mọi fix tạo candidate mới và re-test | Đầu Ngày 21 |
| W5-DEC-03 | P0b status | Lấy nguyên G17/G20: DONE hoặc CUT; không mở lại ở W5 | Đầu Ngày 21 |
| W5-DEC-04 | Browser/viewport | Chromium desktop/mobile là gate; Firefox desktop core smoke; WebKit best-effort và ghi limitation nếu chưa test | Đầu Ngày 22 |
| W5-DEC-05 | Locale matrix | vi-VN, en, en-PH, fil-PH; missing translation fallback EN; local currency luôn primary | Đầu Ngày 22 |
| W5-DEC-06 | Accessibility | Core-flow baseline theo WCAG 2.1 AA; không tuyên bố certification | Đầu Ngày 22 |
| W5-DEC-07 | Performance dataset | Một deterministic volume profile; ghi hardware/runtime/DB state và sample method | Đầu Ngày 22 |
| W5-DEC-08 | Performance target | List p95 <= 500 ms, detail p95 <= 300 ms sau warm-up; core page primary content <= 2 s trên reference local environment | Đầu Ngày 22 |
| W5-DEC-09 | Defect severity | Sev-0/Sev-1/Sev-2 theo mục 7.5; Sev-0/Sev-1 luôn chặn G24/G25 | Đầu Ngày 21 |
| W5-DEC-10 | Evidence format | Mỗi Must có UI, API/DB, TEST, release commit, fixture, command/result/path; `N/A` phải có rationale | Đầu Ngày 21 |
| W5-DEC-11 | Clean environment | Fresh checkout/directory + new Compose project/volumes + no old env/node_modules/DB/MinIO | Trước Ngày 23 |
| W5-DEC-12 | Backup/restore | Restore vào DB/volume riêng; so counts/checksums và chạy critical smoke; không phá dev environment | Trước Ngày 24 |
| W5-DEC-13 | Release package | Source/tag, manifest, env example, Compose, migration, seed, docs, reports, evidence, demo, limitations | Trước Ngày 24 |
| W5-DEC-14 | Rollback | Rollback app version; migration/data rollback chỉ theo runbook đã test, không hứa downgrade tùy ý | Trước G24 |
| W5-DEC-15 | Mock disclosure | OAuth/eKYC/tax/FX/payment/network nào mock phải hiện trong README/demo/limitations | Trước G23 |
| W5-DEC-16 | Sign-off | Product, Tech, QA/Security, Finance ghi reviewer/date/result thật; không tự điền thay người chưa duyệt | Trước G25 |

## 7. Baseline chất lượng phải đo được

### 7.1. Browser và viewport

Release gate tối thiểu:

| Surface | Browser | Viewport | Phạm vi |
|---|---|---:|---|
| Creator mobile | Chromium pinned bởi lockfile | 390 × 844 | J1–J3 core Creator steps |
| Creator tablet | Chromium | 768 × 1024 | Layout/CTA/form/status smoke |
| Creator/Admin desktop | Chromium | 1440 × 900 | Full primary journeys và workbench |
| Admin minimum desktop | Chromium | 1280 × 800 | Queue/table/modal không mất action |
| Cross-browser smoke | Firefox desktop | 1440 × 900 | Login, country switch, campaign, payout status |
| Best-effort | WebKit | 390 × 844 và/hoặc desktop | Nếu không chạy phải ghi limitation, không gọi là Safari-certified |

Acceptance UI:

- Không horizontal overflow không chủ ý, clipped money/status hoặc CTA bị che.
- Table/queue có pagination, empty/loading/error/denied và responsive fallback rõ.
- Modal/drawer giữ focus, đóng/mở có recovery; destructive/financial action có confirmation.
- Status không chỉ truyền bằng màu; số tiền/currency không bị wrap gây hiểu sai.

### 7.2. Locale và formatting

- `vi-VN`: Vietnamese core copy, VND scale 0, date/time theo policy đã chốt.
- `en`: fallback chung.
- `en-PH`: English Philippines, PHP scale 2.
- `fil-PH`: Filipino core copy, fallback EN cho key chưa dịch.
- Không raw translation key hoặc hard-coded text quan trọng trong 12 view lõi.
- Local currency là primary; USD có label `reference`, rate/source/captured time hoặc unavailable state.
- Locale switch không đổi country ownership, payout currency hoặc stored money.
- UTC storage/timezone display boundary có test ở ngày/tháng và campaign cutoff.

### 7.3. Accessibility baseline

Baseline áp dụng cho 12 view lõi và các state dùng trong bốn journey:

- 0 automated `critical` hoặc `serious` violation sau khi review false positive.
- Tất cả critical CTA/form/dialog/queue action thao tác được bằng keyboard.
- Visible focus; modal focus trap và trả focus đúng.
- Input có accessible name; error liên kết field; required/invalid/status được thông báo phù hợp.
- Heading, landmark, table header và button/link semantics hợp lý.
- Contrast core text/action đạt target tự động khi công cụ đo được.
- Không tuyên bố đây là accessibility certification hoặc manual audit toàn diện.

### 7.4. Volume và performance baseline

Deterministic volume profile tổng cho hai country:

- 1.000 Creator Country Profiles.
- 200 Campaigns.
- 10.000 Participations.
- 10.000 Content Submissions/active versions.
- 20.000 Earnings/Ledger source records.
- 2.000 Payout Requests/Attempts.
- Queue có mix state, country, owner, anomaly và date đủ để test filter/sort.

Phương pháp đo:

- Ghi CPU/RAM, OS/container runtime, PostgreSQL version, release commit và seed profile.
- Warm-up tối thiểu 5 request; lấy tối thiểu 30 sample cho endpoint critical.
- List page size tối đa 100; sort deterministic; không trả unbounded collection.
- Critical list API p95 <= 500 ms; detail API p95 <= 300 ms trên reference local environment.
- Core page primary content <= 2 giây trên local warm environment đã ghi.
- Query count không tăng tuyến tính theo page size; xác minh bằng query log/explain phù hợp, không chỉ nhìn cảm giác UI.
- Threshold là local release baseline, không phải production SLA.

### 7.5. Severity và stop-the-line

| Severity | Định nghĩa | Ví dụ | Gate |
|---|---|---|---|
| Sev-0 | Data/security/money integrity hoặc release hoàn toàn không dùng được | Country leak, auth/MFA bypass, sai tiền, double payout, mutable lock, data loss, clean setup không chạy | Dừng mọi việc khác; G21/G24/G25 NO-GO |
| Sev-1 | Một Must/core journey hỏng hoặc không có workaround an toàn | KYC/content/payout không hoàn tất, i18n làm sai amount, queue unusable, restore fail, audit critical thiếu | Chặn G24/G25 |
| Sev-2 | Không ảnh hưởng correctness/security/Must completion | Copy/cosmetic/non-core layout hoặc polish | Có thể defer nếu ghi limitation; không được ảnh hưởng Must |

SLA trong sprint:

- Sev-0: triage ngay, freeze toàn bộ work khác, fix + targeted + full relevant regression.
- Sev-1: owner trong ngày, không tạo RC khi còn mở.
- Sev-2: chỉ sửa nếu không đe dọa G24/G25; nếu defer phải có owner/limitation.

### 7.6. Evidence contract

Mỗi dòng RTM Must phải có:

- Requirement ID và business outcome.
- Release commit/tag/candidate ID.
- Fixture/scenario/country/actor.
- UI evidence path hoặc `N/A` có lý do.
- API/DB evidence path, request/response hoặc invariant query.
- Automated test ID, command, result và timestamp.
- Negative case quan trọng.
- Status: `PASS`, `FAIL`, `BLOCKED`, `N/A-OUT-OF-SCOPE`.
- Limitation/owner/deadline nếu chưa hoàn hảo.

Không đưa OTP, token, credential, full bank, KYC document hoặc PII thật vào screenshot/log/evidence.

## 8. Artifact và module phải có

### 8.1. Quality và release evidence

| Artifact | Đường dẫn dự kiến | Ngày | Mức |
|---|---|---:|---|
| Release test plan/matrix | `docs/qa/RELEASE_TEST_PLAN.md` | 21 | P0 |
| Full E2E/security evidence | `docs/qa/WEEK5_EVIDENCE.md` + evidence folder | 21–25 | P0 |
| Performance/a11y report | `docs/qa/NON_FUNCTIONAL_REPORT.md` | 22 | P0 |
| Final test report | `docs/qa/FINAL_TEST_REPORT.md` | 24–25 | P0 |
| 22-Must RTM/evidence manifest | `docs/product/RTM.md` + `docs/qa/REQUIREMENT_EVIDENCE.md` | 21–25 | P0 |
| Defect/triage record | `docs/qa/RELEASE_DEFECTS.md` | 21–25 | P0 |

### 8.2. Product, architecture và operations

| Artifact | Đường dẫn dự kiến | Ngày | Mức |
|---|---|---:|---|
| Deterministic seed catalog/scenarios | repo seed/fixture + `docs/demo/SEED_SCENARIOS.md` | 23 | P0 |
| README và env example | `README.md`, `.env.example` | 23 | P0 |
| OpenAPI/ERD/architecture | contract + `docs/architecture/` | 23 | P0 |
| State/permission/decision docs | `docs/product/` và `docs/decisions/` | 23 | P0 |
| Operations runbook | `docs/operations/RUNBOOK.md` | 23–24 | P0 |
| Backup/restore guide + evidence | `docs/operations/BACKUP_RESTORE.md` | 23–24 | P0 |
| Rollback guide | `docs/operations/ROLLBACK.md` | 23–24 | P0 |
| Known limitations/mock disclosure | `docs/KNOWN_LIMITATIONS.md` | 23–25 | P0 |
| Release checklist/manifest/notes | `docs/release/` + `RELEASE_NOTES.md` | 24–25 | P0 |
| Slide và demo script | `docs/demo/` | 24–25 | P0 |

### 8.3. Seed scenario tối thiểu

- VN Creator Approved đi full happy path.
- PH Creator KYC Needs Changes rồi Approved.
- Một Global User có cả VN và PH profile.
- Suspended Creator để test permission/eligibility.
- Local Ops/Admin/Finance VN và PH; Global Admin MFA fixture.
- VN Beauty và PH SaaS cùng chạy `CONTENT_FLAT` core flow.
- CPS/Recurring Offer Draft bị capability guard; CPS executable chỉ khi P0b `DONE`.
- Content invalid/needs-changes/approved/duplicate/private fixture.
- Reconciliation anomaly, reversed earning và locked batch fixture.
- Payout success, confirmed failure/balance released, timeout/`UNKNOWN` và post-success refund/reversal fixture.
- Không có dữ liệu cá nhân, bank, document, token hoặc secret thật.

## 9. Kế hoạch chi tiết theo ngày

### Ngày 21 — Full E2E, Security, Tenancy và Idempotency

#### Outcome duy nhất

Bốn primary journey chạy từ deterministic seed; không còn blocker về country/data leak, sai tiền hoặc duplicate business effect trước khi chuyển sang non-functional hardening.

| Task ID | Timebox | Mũ vai trò | Dependency | Công việc | Đầu ra | Acceptance/evidence |
|---|---:|---|---|---|---|---|
| W5-D21-T01 | 30 phút | Tech Lead/QA | G20 | Xác minh entry checklist, G20 result, P0b status và khóa release baseline/candidate ID | Entry record | G20 GO/eligible conditional; P0b DONE hoặc CUT; test commit/seed version rõ |
| W5-D21-T02 | 45 phút | QA/Data | T01 | Reset/migrate/seed; xác minh deterministic fixture và xử lý carry-over G20 trong policy | Test baseline | Chạy lại độc lập, không manual DB/test-order; blocker chưa Green thì dừng/replan |
| W5-D21-T03 | 1 giờ | QA/Full-stack | T02 | Chạy/harden J1 Identity/Country/KYC gồm positive và critical negative | J1 evidence | VN/PH profile/KYC/field resubmit/RBAC/MFA/audit Green |
| W5-D21-T04 | 1 giờ 15 | QA/Full-stack | T02–T03 | Chạy/harden J2 Campaign/Content/Pending Earning | J2 evidence | Capability/activation/join/snapshot/tracking/resubmit/approve exactly-once Green |
| W5-D21-T05 | 1 giờ 30 | QA/Finance/Data | T02–T04 | Chạy/harden J3 Money/Reconciliation/Payout với success, failure release, UNKNOWN và retry | J3 evidence | Money/Ledger/lock/reserve/provider effects đúng; VN/PH config Green |
| W5-D21-T06 | 1 giờ 15 | Security/QA | T03–T05 | Chạy J4 role/country/owner/partner/direct-ID/RLS + idempotency/concurrency/fault regression | Security/integrity evidence | Không leak; same key/different payload conflict; không duplicate/half-state |
| W5-D21-T07 | 45 phút | Product/QA | T01–T06 | Root-cause/triage, cập nhật RTM/evidence/defect register và chấm Gate G21 | G21 checkpoint | Bốn journey Green hai lần; Sev-0/Sev-1 = 0; failing/flaky có kết luận thật |

Giữ 1 giờ buffer chỉ cho G20 blocker, Sev-0/Sev-1 hoặc flaky root-cause. Không dùng buffer để mở P0b hoặc polish UI.

#### Gate G21 — E2E/Security Gate

`GO` khi:

- Release baseline, migration và seed version được ghi.
- Bốn primary journey Green hai lần liên tiếp từ reset/seed.
- Không intercept/mock core API trong E2E; Web/API/PostgreSQL/mock-provider contract chạy thật theo Compose.
- Role/country/owner/partner/direct-ID/list/count/export/RLS negative cases Green.
- Join, Approve, batch lock, payout reserve và provider events giữ exactly-once dưới retry/concurrency.
- Money/ledger/budget invariant Green sau mọi fault branch.
- Critical audit tồn tại, atomic/redacted và immutable.
- Sev-0 = 0, Sev-1 = 0; không có flaky critical test bị che bằng retry.

`CONDITIONAL GO` chỉ cho Sev-2 ngoài Must, có owner/deadline. Bất kỳ data leak, wrong money, duplicate payment/release hoặc G20 invariant fail đều là `NO-GO`.

### Ngày 22 — Responsive, i18n, Accessibility và Performance

#### Outcome duy nhất

Core Creator/Admin surface dùng được theo baseline đã công bố; ba Must xuyên tuần `CP-02`, `CP-05`, `AD-02` được đóng evidence và feature freeze có hiệu lực.

| Task ID | Timebox | Mũ vai trò | Dependency | Công việc | Đầu ra | Acceptance/evidence |
|---|---:|---|---|---|---|---|
| W5-D22-T01 | 30 phút | Product/QA | G21 | Khóa browser/viewport/locale/a11y/performance matrix; triage Must debt CP-01/AD-09/CR-01 nếu upstream gate ghi conditional | NFR baseline | Target/hardware/data/waiver/debt owner rõ; không scope creep |
| W5-D22-T02 | 1 giờ 15 | Frontend/UX | T01 | Responsive audit/fix cho Creator steps J1–J3 | Creator responsive evidence | 390×844, 768×1024, 1440×900 không overflow/clip/block CTA/money |
| W5-D22-T03 | 1 giờ | Full-stack/UX | T01 | Admin/Ops/Finance desktop usability, tables, pagination/state variants; đóng AD-09 basic counters/CSV nếu G15 đã ghi conditional | Admin UX/AD-09 evidence | 1280×800/1440×900; queue/workbench rõ; counters/CSV khớp source hoặc AD-09 không được DONE |
| W5-D22-T04 | 1 giờ 15 | Frontend/QA | T02–T03 | i18n/system-message audit vi-VN/en/en-PH/fil-PH, formatter/timezone/fallback | Locale evidence | Không raw key/hard-code critical; reason/status/amount/date đúng; payout local |
| W5-D22-T05 | 1 giờ | QA/Accessibility | T02–T04 | Automated a11y + manual keyboard/focus/label/error/status smoke | A11y evidence | 0 critical/serious automated issue; core actions keyboard được; no trap |
| W5-D22-T06 | 1 giờ 15 | Backend/Data/QA | T01 | Volume seed, stable pagination, query/index/N+1 audit và benchmark | Performance report | Dataset/30 samples/hardware ghi; list/detail/page thresholds đạt |
| W5-D22-T07 | 45 phút | Full-stack/Product | T02–T06 | Fix release-quality defect, re-run impacted suite, đóng CP-02/CP-05/AD-02 evidence và Gate G22 | Feature Freeze checkpoint | Sev-0/Sev-1 = 0; cross-cutting Must trace đủ; không nhận major feature sau G22 |

Giữ 1 giờ buffer cho non-functional blocker thực sự. Nếu thiếu một vế Must như CP-01 config, AD-09 CSV/counters hoặc CR-01 provider/waiver, item phải được upstream gate chuyển đúng trạng thái và chỉ được đóng trước Feature Freeze bằng evidence; không đánh `DONE` bằng lời giải thích.

#### Gate G22 — UX/Non-functional/Feature-Freeze Gate

- Creator mobile/tablet/desktop và Admin minimum/normal desktop không có blocker.
- Loading, empty, validation, denied, stale/conflict, provider error/UNKNOWN và recovery state hiển thị đúng.
- Locale/fallback/formatter/timezone/payout-local regression Green.
- Accessibility core baseline đạt; không tuyên bố certification.
- Critical list/queue có server pagination và đạt performance baseline trên volume fixture.
- CP-02 final isolation, CP-05 final i18n và AD-02 final audit evidence đầy đủ xuyên module.
- Sev-0 = 0, Sev-1 = 0.
- Feature Freeze được ghi với release baseline mới.

Sau G22 chỉ nhận defect fix, test, docs, seed correction, packaging và evidence. Mọi code change về auth/country/RLS/money/migration/provider phải chạy lại full critical regression, không chỉ targeted test.

### Ngày 23 — Seed, Documentation và Reproducible Setup

#### Outcome duy nhất

Người khác có thể lấy candidate, dựng hệ thống từ môi trường sạch và hiểu chính xác chức năng nào chạy, chức năng nào modeled/mock và bằng chứng nào chứng minh 22 Must.

| Task ID | Timebox | Mũ vai trò | Dependency | Công việc | Đầu ra | Acceptance/evidence |
|---|---:|---|---|---|---|---|
| W5-D23-T01 | 30 phút | Product/QA | G22 | Gap audit artifact, seed, docs, RTM và limitation | Gap checklist | Mỗi artifact có owner/timebox; không tạo feature ticket mới |
| W5-D23-T02 | 1 giờ 30 | Data/QA | T01 | Freeze deterministic VN/PH seed, six archetypes, role/persona, state/anomaly/provider scenarios | Release seed | Seed rerun không duplicate/overwrite; CONTENT_FLAT vs modeled capabilities rõ; no PII |
| W5-D23-T03 | 1 giờ 30 | Platform | T01–T02 | Hoàn thiện và thực thi README clean setup/reset/verify/troubleshooting + `.env.example` | Setup guide/evidence | Fresh directory/volumes; build/migrate/seed/health/smoke pass; không manual SQL |
| W5-D23-T04 | 1 giờ | Architect/Product | T01 | Đồng bộ OpenAPI, ERD, architecture, state, permission, glossary và decision log | Technical-doc freeze | Endpoint/entity/state/term khớp candidate; CPS/release/refund semantics thống nhất |
| W5-D23-T05 | 1 giờ | Operations/Security | T01 | Runbook, rollback, backup/restore, provider UNKNOWN, mock disclosure và known limitations | Operations docs | Commands/recovery/owner rõ; không claim mock là production/legal |
| W5-D23-T06 | 1 giờ | Product/QA | T02–T05 | Hoàn thiện RTM + evidence manifest cho đúng 22 Must | Traceability pack draft | 22/22 có UI/API/TEST path hoặc FAIL/BLOCKED thật; P0b tách riêng |
| W5-D23-T07 | 30 phút | QA/Product | T01–T06 | Secret/PII/evidence-link scan và chấm Gate G23 | G23 checkpoint | Clean setup Green; docs/evidence navigable; demo không sửa DB |

Giữ 1 giờ buffer cho setup/docs blocker, path Windows, dependency hoặc seed defect. Không dùng để tạo thêm archetype/provider behavior.

#### Định nghĩa môi trường sạch

- Fresh checkout/unpack candidate vào thư mục mới; nên kiểm cả path Windows có dấu, khoảng trắng và dấu ngoặc.
- Không dùng `node_modules`, build output, `.env`, PostgreSQL/MinIO volume hoặc browser storage cũ.
- Dùng Compose project/volume riêng để không xóa môi trường dev.
- Chỉ dùng prerequisite và command có trong README.
- Copy `.env.example`, điền demo values không nhạy cảm.
- Build/start → migrate → seed → health/readiness → smoke.
- Không manual SQL, object copy hoặc sửa state để demo.

#### Gate G23 — Reproducibility/Documentation Gate

- Seed VN/PH + six archetypes deterministic/idempotent và đúng capability status.
- Clean setup theo README pass trong target time được ghi.
- OpenAPI/ERD/state/permission/decision/glossary khớp candidate.
- 22 Must có evidence manifest draft đầy đủ; CP-01/AD-09/CR-01 không bị Green giả.
- Runbook/rollback/backup-restore/UNKNOWN recovery usable.
- Known limitations/P0b/synthetic tax-FX/provider disclosure rõ.
- Secret/PII scan Green; evidence không chứa sensitive data.
- Demo scenario dùng fixture, không sửa DB.

Thiếu clean setup hoặc một Must không trace được là `NO-GO`, không phải lỗi documentation nhỏ.

### Ngày 24 — Full Regression, Backup/Restore và Release Candidate

#### Outcome duy nhất

Tạo một Release Candidate có full regression Green, restore được, 0 Sev-0/Sev-1 và demo nằm trong 12–15 phút.

| Task ID | Timebox | Mũ vai trò | Dependency | Công việc | Đầu ra | Acceptance/evidence |
|---|---:|---|---|---|---|---|
| W5-D24-T01 | 30 phút | Release Lead | G23 | Xác nhận Feature Freeze, severity, candidate SHA, migration/seed version và RC scope | RC plan | Không feature chen vào; test/evidence cùng candidate |
| W5-D24-T02 | 1 giờ 30 | QA | T01 | Chạy formatter/lint/type-check/unit/integration/E2E/security/money/build full regression | Regression report | Không unexpected skip; four journeys và critical invariant Green |
| W5-D24-T03 | 1 giờ 30 | Full-stack | T02 | Root-cause/fix Sev-0/Sev-1 duy nhất, thêm regression test và chạy lại impacted/full critical suite | RC fixes | Không refactor/polish; không hạ severity; fix không có test thì chưa Done |
| W5-D24-T04 | 1 giờ | Platform/Data | T01–T03 | Backup PostgreSQL + MinIO manifest/object và restore vào environment riêng | Recovery evidence | Counts/hash/objects/invariants/smoke khớp; không phá RC gốc |
| W5-D24-T05 | 45 phút | Release/Platform | T02–T04 | Build/package RC, manifest/checksum/config/secrets verification | RC artifact | Candidate từ committed state; manifest đủ, không secret/PII |
| W5-D24-T06 | 1 giờ | Product | T01–T05 | Hoàn thiện slide, demo script, seed account sheet, evidence bookmarks và fallback material đã redacted | Demo package v1 | Step/expected result/time rõ; fallback không thay live evidence |
| W5-D24-T07 | 45 phút | Product/Tech/QA/Finance | T02–T06 | Rehearsal 1 có bấm giờ, triage và chấm Gate G24 | RC checkpoint | 12–15 phút; không manual DB; 0 Sev-0/Sev-1; no Must-impact Sev-2 |

Giữ 1 giờ buffer cho regression/restore/rehearsal blocker. Nếu T03 cần nhiều hơn timebox vì core defect, G24 là `NO-GO/replan`; không cắt restore hoặc evidence để tạo RC giả.

#### Backup/restore smoke acceptance

- Backup/restore chạy trên disposable DB/bucket/volume riêng.
- Database schema/migration version, critical table counts và business-key checksum khớp.
- Synthetic KYC/content objects còn tồn tại và vẫn private.
- Global identity/country profile, content history, Earning/Ledger, locked batch và payout history còn đúng.
- Ledger vẫn cân bằng; locked batch checksum/state không đổi.
- Critical smoke + money invariant suite sau restore Green.
- Missing/corrupt object phải bị phát hiện; không báo success giả.

#### Gate G24 — Release Candidate Gate

- Full regression Green trên exact RC candidate.
- Sev-0 = 0, Sev-1 = 0; không Sev-2 ảnh hưởng Must.
- Backup PostgreSQL + object storage restore smoke Green.
- 22/22 Must evidence trỏ cùng candidate hoặc được đánh FAIL/BLOCKED, không có link stale.
- RC manifest/checksum/provenance không chứa secrets.
- Rehearsal 1 chạy 12–15 phút, live flow là chính, không manual DB.
- Không thay đổi feature/schema sau RC; release defect fix phải tạo candidate/evidence mới.

### Ngày 25 — Final Clean Release, Evidence và Sign-off

#### Outcome duy nhất

Release package cuối dựng lại được từ tag/candidate, critical suite Green, demo ổn định và người chịu trách nhiệm ký đúng kết quả thực tế.

| Task ID | Timebox | Mũ vai trò | Dependency | Công việc | Đầu ra | Acceptance/evidence |
|---|---:|---|---|---|---|---|
| W5-D25-T01 | 1 giờ 30 | Platform/QA | G24 | Final clean checkout/unpack: build, Compose, migrate, seed, health và smoke | Final clean-install log | Chạy từ candidate/tag, không artifact/volume/env cũ, không manual DB |
| W5-D25-T02 | 1 giờ | QA/Security/Finance | T01 | Final four-journey critical smoke + tenancy/money/idempotency checks | Final critical report | Release candidate giữ Green trên clean environment |
| W5-D25-T03 | 1 giờ | Full-stack | T01–T02 | Fix release blocker cuối hoặc, nếu không có, audit evidence/docs links; re-run target + full critical suite | Final candidate | Không feature; mọi fix đổi candidate/tag và evidence tương ứng |
| W5-D25-T04 | 45 phút | Platform/Release | T02–T03 | Tạo/xác minh tag, release notes, manifest, checksum, rollback reference và source package | Release package | Tag trỏ đúng tested commit; artifact/provenance/versions khớp |
| W5-D25-T05 | 45 phút | Product/QA | T02–T04 | Freeze final RTM/test report/evidence/known limitations/sign-off form | Final evidence pack | 22/22 status thật; no sensitive data; P0b/waiver/limitations rõ |
| W5-D25-T06 | 1 giờ 15 | Product/Demo | T04–T05 | Rehearsal 2/final demo có bấm giờ và fallback drill | Final demo evidence | 12–15 phút; seed deterministic; không manual DB/claim quá phạm vi |
| W5-D25-T07 | 45 phút | Product/Tech/QA/Finance | T01–T06 | Chấm G25, ký/bàn giao, ghi open Sev-2/next phase và cập nhật execution log | Signed release handoff | Chỉ ghi DONE khi evidence tồn tại; reviewer/date/result/next owner rõ |

Giữ 1 giờ buffer cho clean-install, final regression, tag/package hoặc demo blocker. Sev-0/Sev-1 phát hiện Ngày 25 là `NO-GO`; không hot-fix rồi bỏ qua full critical re-run.

## 10. Test matrix bắt buộc

### 10.1. Primary journey và recovery

| Test ID | Scenario | Expected | Stop-release |
|---|---|---|---|
| W5-E2E-01 | J1 VN identity/profile/KYC happy + partial resubmit | Một global identity; đúng field editable; history/audit đúng | Có |
| W5-E2E-02 | J1 một user có VN + PH profile/switch | KYC/bank/tax/preference không lẫn | Có |
| W5-E2E-03 | KYC provider timeout + duplicate result | Không auto reject/case duplicate; recovery rõ | Có |
| W5-E2E-04 | J2 CONTENT_FLAT full flow | Exactly one Participation, asset, approved content, Pending Earning | Có |
| W5-E2E-05 | Content Needs Changes/resubmit/stale/bulk retry | Version/history giữ; no duplicate effect | Có |
| W5-E2E-06 | Unsupported CPS/Recurring activation khi P0b CUT | Explicit capability denial; no silent fallback | Có |
| W5-E2E-07 | P0b duplicate conversion nếu P0b DONE | One conversion/earning/journal; exact SALE_PERCENT/budget | Có nếu P0b DONE |
| W5-E2E-08 | J3 reconciliation/anomaly/lock/Available | Totals/lock/snapshot/ledger khớp; locked immutable | Có |
| W5-E2E-09 | Payout confirmed failure → release → explicit retry success | One reserve/release/re-reserve/payment | Có |
| W5-E2E-10 | Payout timeout/UNKNOWN + late resolution | Reserve giữ; không auto new payment/release | Có |
| W5-E2E-11 | PH/PHP money smoke | Same core, PH config/local currency/rounding đúng | Có |
| W5-E2E-12 | Full seeded demo chạy hai lần | Không manual DB; không duplicate state/money | Có |

### 10.2. Security, isolation và privacy

Với mỗi sensitive resource/action, test các context: unauthenticated; đúng scope; sai role; sai country; sai owner/partner; đúng scope nhưng stale/invalid state.

| Test ID | Phạm vi | Expected | Stop-release |
|---|---|---|---|
| W5-SEC-01 | Profile/KYC/document/bank/tax | API/RLS/storage deny đúng; no metadata leak | Có |
| W5-SEC-02 | Product/Offer/Campaign/Participation/Asset | Country + partner + owner policy Green | Có |
| W5-SEC-03 | Content/review/bulk/export | Direct-ID/list/count/export không leak | Có |
| W5-SEC-04 | Earning/Ledger/Reconciliation/Payout | Cross-scope read/write/lock/retry denied | Có |
| W5-SEC-05 | Connection pool VN → PH + missing context | Context reset; missing context fail closed | Có |
| W5-SEC-06 | Runtime DB role/RLS USING + WITH CHECK | NOBYPASSRLS; không owner/superuser; insert/update scope chặn | Có |
| W5-SEC-07 | Session revoke/expire, MFA_PENDING, OTP purpose/reuse | Privileged/payout action denied và audit | Có |
| W5-SEC-08 | Object storage signed/proxy access | Wrong owner/country/expired denied; bucket private | Có |
| W5-SEC-09 | Audit/log/evidence redaction | No secret, OTP, PII, full bank/document/provider payload | Có |
| W5-SEC-10 | Immutable Audit/Ledger/locked Batch | Runtime update/delete denied at app + DB | Có |

### 10.3. Idempotency, concurrency và money invariant

| Test ID | Stress/fault case | Expected | Stop-release |
|---|---|---|---|
| W5-INT-01 | 20 retry KYC submit/provider result | One business transition/version | Có |
| W5-INT-02 | 20 same-creator Join + last-slot competition | One Participation; capacity/budget không vượt | Có |
| W5-INT-03 | 20 concurrent Approve/bulk retry | One Earning/commit/audit effect | Có |
| W5-INT-04 | Concurrent reconciliation build/lock | Earning không vào hai batch; one frozen snapshot | Có |
| W5-INT-05 | Concurrent payout/OTP verify | One active payout/reserve; Available không âm | Có |
| W5-INT-06 | 20 duplicate/out-of-order provider events | One terminal/posting effect | Có |
| W5-INT-07 | UNKNOWN + late success vs failure release race | Không vừa Paid vừa Balance Released | Có |
| W5-INT-08 | Adjustment/reversal retry | One linked adjustment; original immutable | Có |
| W5-INT-09 | Same idempotency key khác payload | Conflict, không trả result cũ sai payload | Có |
| W5-INT-10 | Deadlock/crash giữa critical transaction/outbox boundary | Recoverable; no half-state/duplicate effect | Có |

Sau mọi test:

~~~text
gross = tax + net
ledger_debit = ledger_credit theo currency
available_balance >= 0
payout_reserved >= 0
budget_reserved + budget_committed <= budget_total
one business source = one posting effect
locked batch immutable
payout không đồng thời Paid và Balance Released
~~~

### 10.4. Non-functional, setup và recovery

| Test ID | Scenario | Expected | Stop-release |
|---|---|---|---|
| W5-NFR-01 | Viewport/browser matrix | No core overflow/clip/lost CTA/money | Có nếu Must flow hỏng |
| W5-NFR-02 | Locale/system message matrix | No raw key; correct locale/currency/time/fallback | Có nếu sai flow/money |
| W5-NFR-03 | A11y automated + keyboard | 0 critical/serious; core journey keyboard được | Có nếu core blocked |
| W5-NFR-04 | Volume/pagination/performance | Stable pages; threshold/query behavior đạt | Có nếu core unusable |
| W5-OPS-01 | Fresh checkout/Compose/migration/seed | Pass without old artifacts/manual DB | Có |
| W5-OPS-02 | Seed run twice | No duplicate/overwrite runtime state | Có |
| W5-OPS-03 | Backup/restore DB + objects | Counts/hash/privacy/invariants/smoke khớp | Có |
| W5-OPS-04 | Restart/health/readiness/worker | Recover documented; no hidden local step | Có |
| W5-REL-01 | Tag/manifest/checksum/evidence commit | Same tested source; no secret/PII | Có |
| W5-REL-02 | Demo 12–15 phút hai lần | Seeded/live/no manual DB/no false claim | Có |

## 11. Traceability 22 Must tại G25

Mỗi dòng dưới đây phải có đủ UI/API/TEST evidence theo Evidence Contract. Cột “xây chính” là nơi chức năng được triển khai; Tuần 5 chỉ harden, lấp acceptance debt đã được gate cho phép và chứng minh release.

| ID | Business outcome bắt buộc | Xây chính | Evidence cuối Tuần 5 |
|---|---|---|---|
| CP-01 | Country config VN/PH typed: locale, currency, KYC/tax/payment/social/provider flags và feature boolean; version/audit | W1–W2 | Global Admin UI/API/config-change test; percentage rollout vẫn P1 |
| CP-02 | Country data isolation defense-in-depth trên mọi module | W1–W5 | J4 + API/list/count/export/RLS/storage/pool tests, 0 leak |
| CP-03 | `/vn`, `/ph` và invalid/mismatch route an toàn | W1–W2 | Route/session/API context smoke và negative test |
| CP-04 | Một global identity, nhiều country profile độc lập | W1–W2 | J1 one-user-two-profile UI/API/DB test |
| CP-05 | i18n/locale/fallback/system messages trên core flow | W1–W5 | vi-VN/en/en-PH/fil-PH UI scan + formatter/fallback test |
| CP-06 | Local money primary + USD reference có metadata | W1/W2/W4 | Earnings UI/API snapshot test; payout luôn local |
| CP-08 | Gross–Tax–Net theo country, version/rounding bất biến | W1/W2/W4 | VN/PH golden tests; Gross = Tax + Net; config-change history test |
| AD-01 | Admin Auth/RBAC/MFA theo role/country/partner | W1–W2 | Five-role matrix, MFA/session/revoke/direct-ID tests |
| AD-02 | Critical action có immutable/redacted audit | W1–W5 | Inventory auth/config/KYC/campaign/content/batch/payout/provider + atomic/redaction test |
| AD-03 | Content review E2E, reason, resubmit, bulk | W1/W3 | Queue/workbench UI, stale/bulk/retry/exactly-once tests |
| AD-04 | KYC field-level review E2E | W1–W2 | Partial reject/resubmit/history/concurrency/storage tests |
| AD-06 | Reconciliation batch/anomaly/approve/lock/export/adjustment | W1/W4 | Finance UI/API/DB immutability, totals/checksum/frozen CSV tests |
| AD-07 | Settlement FX lock và payout operation | W1/W4 | FX snapshot + success/failure/UNKNOWN/retry provider lifecycle evidence |
| AD-09 | Campaign builder, activation, budget, basic counters và CSV | W1/W3 | UI/API; cap/concurrency; counters/totals/CSV test. Thiếu CSV/counters thì chưa DONE |
| CR-01 | Global SSO/provider abstraction và one identity | W1–W2 | Google/TikTok thật hoặc waiver/disclosed mock được acceptance owner ký; session/idempotency tests |
| CR-02 | Add/switch VN/PH country profile | W1–W2 | J1 onboarding/switch/cache isolation evidence |
| CR-03 | Per-profile language/currency display preference | W1–W2/W5 | Settings UI/API + switch/fallback test; payout local |
| CR-04 | Country KYC + private docs/bank/tax/agreement/status | W1–W2 | J1 UI/API/storage/history/partial-resubmit evidence |
| CR-05 | Discover/join campaign + personal tracking | W1/W3 | Eligibility/idempotent Join/asset/My Campaigns; ít nhất một personal hashtag seed |
| CR-06 | Submit/follow content + reason/resubmit/history | W1/W3 | J2 UI/API/validation/version/stale tests |
| CR-07 | Earnings source/Gross–Tax–Net/status tới Paid/Reversed | W1/W3/W4 | W4 D16–D20 UI/API/Ledger reconciliation evidence |
| CR-08 | OTP payout từ Available, status/failure recovery | W1/W4 | J3 reserve/release/UNKNOWN/retry success UI/API/Ledger tests |

Quy tắc final status:

- `DONE`: đủ business outcome và evidence trên final candidate.
- `PARTIAL/CONDITIONAL`: thiếu một vế Must hoặc chỉ có mock cần waiver; không được đổi tên thành DONE lean để che thiếu.
- `BLOCKED`: test/evidence fail hoặc dependency chưa đóng.
- P0b/P1 không nằm trong 22 Must và được theo dõi riêng.

## 12. Definition of Done cho release

Một requirement/flow chỉ được tính `DONE` tại G25 khi:

1. Acceptance business đầy đủ, không bỏ vế khó trong Book1/RTM.
2. Backend quyết định state/money/permission; UI không tự suy diễn business status.
3. Country, partner, owner và role scope có positive + negative evidence.
4. Database constraint/RLS/transaction bảo vệ invariant quan trọng.
5. UI có loading/empty/validation/error/denied/conflict/recovery state phù hợp.
6. User-facing copy/status/reason có i18n/fallback và formatter đúng.
7. Critical action có audit atomic/redacted.
8. Unit/integration/E2E test liên quan Green; critical retry/concurrency/fault case có direct test.
9. Seed/fixture deterministic, synthetic và không chứa secret/PII.
10. OpenAPI/ERD/state/permission/decision/RTM khớp candidate.
11. Lint/type-check/test/build Green; không unexpected skip hoặc flaky che bằng retry.
12. Evidence ghi commit, environment, command, result, timestamp và path.
13. Clean setup và demo không sửa DB thủ công.
14. Limitation/mock/waiver được công bố trung thực.
15. Sev-0 = 0, Sev-1 = 0, không Sev-2 ảnh hưởng Must.

## 13. Gate G25 — Final Release Gate

### GO

- [ ] 22/22 Must có status/evidence thật; mọi partial/waiver được acceptance owner chấp thuận rõ.
- [ ] Bốn primary journey Green trên final release candidate/tag.
- [ ] Sev-0 = 0, Sev-1 = 0; không Sev-2 ảnh hưởng Must.
- [ ] Không country/user/partner/object/PII leak.
- [ ] Money, budget, Ledger, reconciliation, payout và idempotency invariants Green.
- [ ] Docker Compose, migration, seed, restart và health chạy từ clean checkout.
- [ ] Seed lần hai không duplicate/overwrite runtime state.
- [ ] Backup/restore DB + object storage và post-restore smoke Green.
- [ ] README/OpenAPI/ERD/state/permission/runbook/limitations khớp final candidate.
- [ ] Release tag/manifest/checksum trỏ đúng tested source; không secret/PII.
- [ ] Demo/rehearsal 12–15 phút, không manual DB, không phụ thuộc P0b nếu CUT.
- [ ] Product, Tech, QA/Security và Finance reviewer ghi người/ngày/kết quả thật.

### CONDITIONAL GO

Chỉ cho phép khi:

- Vẫn 0 Sev-0/Sev-1 và không Sev-2 ảnh hưởng Must.
- Chỉ còn cosmetic/non-core/provider thật/P0b ngoài scope.
- Known limitation, owner, deadline và reviewer approval được ghi.
- Không dùng conditional để bỏ một vế của 22 Must; trường hợp đó phải ghi `PARTIAL`, không phải full release GO.

### NO-GO

- Một Must thiếu evidence hoặc bị đánh Green bằng kế hoạch/screenshot không đủ invariant.
- Primary journey fail/flaky chưa có root cause.
- Data leak, wrong money, mutable history hoặc duplicate business effect.
- G20 invariant không còn Green sau integration.
- Clean setup/migration/seed/restore thất bại hoặc cần manual DB.
- Evidence/tag/manifest không cùng source candidate.
- Secret/PII/OTP/bank/KYC data thật xuất hiện trong source/evidence.
- Sev-0/Sev-1 còn mở hoặc Sev-2 ảnh hưởng Must.
- Tax/FX/eKYC/payment/OAuth/network mock bị trình bày như production/legal.

## 14. Stop-release và thứ tự cắt scope

### Stop-release ngay

- Country/user/partner leak ở UI/API/cache/export/storage/DB.
- Auth/MFA/RBAC/OTP bypass.
- Gross/Tax/Net/currency/rounding sai hoặc dùng float.
- Ledger unbalanced/mutable; locked batch mutable; historical snapshot recompute.
- Duplicate Earning/commit/payout/payment/release/refund/reversal.
- UNKNOWN bị auto release hoặc gửi payment instruction mới.
- Available/budget âm, vượt cap hoặc source/ledger/batch không reconcile.
- Four journeys/test seed/clean setup/restore không tái lập.
- Evidence không cùng candidate hoặc chứa sensitive data.
- CP-01/AD-09/CR-01 bị đánh DONE khi acceptance bắt buộc còn thiếu.

### Thứ tự cắt khi trễ

1. Cắt/giữ CUT toàn bộ P0b CPS nếu chưa DONE hoàn toàn từ G17.
2. Không nhận cả bảy Should/P1.
3. Cắt charts, advanced filters, report styling và archetype visual assets.
4. Thu cross-browser về Chromium gate + Firefox smoke; ghi WebKit limitation.
5. Thu accessibility về 12 core view + keyboard/focus/label/error; không bỏ core baseline.
6. Giảm breadth performance report nhưng giữ deterministic volume, pagination và critical endpoints; không đổi threshold âm thầm.
7. Giảm slide polish/fallback media; giữ hai rehearsal nếu còn release risk.
8. Backup/restore nâng cao có thể defer, nhưng DB + synthetic object smoke tối thiểu không được bỏ nếu roadmap cam kết recovery evidence.

Không được cắt:

- 22 Must traceability thật.
- Bốn primary journey.
- Country/partner/owner isolation và audit critical action.
- Gross–Tax–Net, Ledger, lock, idempotency và payout correctness.
- UNKNOWN/failure release semantics.
- Clean setup, migration/seed và known limitations.
- Final evidence cùng candidate/tag.

## 15. Risk register Tuần 5

| Risk | Trigger | Hành động/contingency |
|---|---|---|
| G20 Green giả | Full E2E phát hiện wrong money/leak | Stop-line, sửa invariant, cắt toàn bộ non-core và replan nếu quá buffer |
| Tuần 5 thành feature sprint | CP-01/AD-09/CR-01 hoặc core còn thiếu lớn | Đúng status upstream; chỉ đóng Must debt trước G22; không che bằng polish |
| CPS scope creep | Demo/test vẫn đòi conversion khi G17 CUT | Dùng CONTENT_FLAT + duplicate Approve/provider event; giữ capability disabled |
| Test flaky | Pass sau rerun hoặc phụ thuộc order/seed | Xếp Sev-1, root-cause clock/async/data; không thêm blind retry |
| Evidence stale | Fix sau khi capture/report | Candidate ID mới; rerun impacted + critical suite; replace manifest/evidence |
| Country leak qua side channel | List/count/export/cache đúng row nhưng lộ total/old data | J4 bao cả aggregate/export/browser cache/pool/storage |
| Money UI đúng nhưng Ledger sai | E2E chỉ assert text | Lower-layer invariant/DB reconciliation bắt buộc |
| Volume test Green giả | Empty/small DB, warm cache không ghi | Deterministic volume profile + environment/sample method |
| Clean setup phụ thuộc máy dev | Old volume/env/node_modules | Fresh directory + new Compose project/volumes + README-only commands |
| Restore mất MinIO | Chỉ backup DB | Backup object manifest/content và privacy smoke |
| Release tag sai | Tag trước fix hoặc evidence source khác | Tạo tag sau final clean/critical run; verify commit/manifest/checksum |
| Demo quá dài | Rehearsal >15 phút | Cắt giải thích/visual phụ, không cắt evidence critical; dùng fixed bookmarks |
| Mock bị trình bày quá mức | Slide nói production/global all-network | Mock disclosure đầu/cuối demo và Known Limitations |
| Solo sign-off giả độc lập | Một người tự ghi đã được Finance/Security duyệt | Ghi rõ mũ vai trò; mentor/owner xác nhận; không điền người chưa duyệt |

## 16. Demo cuối kỳ 12–15 phút

| Thời lượng | Nội dung | Evidence/Must chính |
|---:|---|---|
| 0:00–1:00 | Bài toán, Phase 1, Product → Offer → Campaign, mock/P0b disclosure | Scope trung thực |
| 1:00–3:00 | Global identity, VN/PH profile, country config/i18n và isolation | CP-01–CP-05, CR-01–CR-03 |
| 3:00–5:00 | KYC field request changes → resubmit → approve | AD-04, CR-04, audit |
| 5:00–8:00 | Campaign activation → Join → personal asset → content Needs Changes/resubmit/approve | AD-03, AD-09, CR-05, CR-06 |
| 8:00–11:30 | Gross–Tax–Net → Ledger → reconcile/lock → payout failure release → retry success | CP-06, CP-08, AD-06, AD-07, CR-07, CR-08 |
| 11:30–13:00 | UNKNOWN/duplicate callback/idempotency + direct-ID/RLS evidence | CP-02, AD-01, AD-02 |
| 13:00–15:00 | Architecture, six archetypes/capability matrix, test/clean-install/limitations và kết luận | Cover-all claim đúng mức |

Quy tắc demo:

- Dùng deterministic seed/mock-provider controls đã công bố.
- Không sửa DB, đổi status bằng SQL hoặc dùng credential/PII thật.
- Live flow là chính; screenshot/video fallback chỉ hỗ trợ khi môi trường trình chiếu lỗi.
- Không demo CPS là executable nếu P0b CUT; show capability Draft/disabled thay thế.
- Confirmed failure gọi là balance release; post-success refund là linked reversal khác.
- Không tuyên bố local MVP là production-ready, legal-compliant hoặc cover mọi network thực tế.

## 17. Bộ bàn giao và handoff cuối dự án

### Release package

1. Source code và release tag/commit.
2. Release manifest/checksum/runtime/migration/seed versions.
3. `.env.example`, Docker Compose, migration, seed và verify scripts.
4. README setup/reset/troubleshooting.
5. OpenAPI, ERD, architecture, state, permission, glossary và decision log.
6. Runbook, rollback, backup/restore và provider UNKNOWN recovery.
7. RTM 22 Must, final test report, security/idempotency/NFR/install-restore evidence.
8. Known limitations, mock/P0b/waiver status và open Sev-2 backlog.
9. VN/PH demo fixtures, account/role sheet đã redacted và provider controls.
10. Slide, demo script 12–15 phút và rehearsal notes.
11. Product/Tech/QA-Security/Finance sign-off record.

### Handoff record bắt buộc

- Gate G25: GO, CONDITIONAL GO hoặc NO-GO.
- Exact release tag/commit/candidate, migration version và seed version.
- 22-Must tracker với evidence path/status thật.
- P0b CPS: DONE hoặc CUT/DEFERRED.
- Sev-0/Sev-1/Sev-2 còn mở và impact/owner/deadline.
- Known limitations và mock provider/config disclosure.
- Clean-install/restore/test commands và kết quả gần nhất.
- Runbook/rollback/contact/escalation owner.
- Next-phase backlog tách riêng khỏi MVP release.

Nếu triển khai chưa bắt đầu hoặc Gate G25 chưa đạt, execution log phải ghi đúng `PLANNED/TODO/NO-GO`; tuyệt đối không đổi thành `DONE` chỉ vì đủ tài liệu kế hoạch.
