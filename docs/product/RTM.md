# Requirement Traceability Matrix — v0.3

> Baseline date: 2026-07-17  
> Scope count: **22 Must/P0 + 7 Should/P1**  
> Runtime status: chưa triển khai. `DESIGN_READY` chỉ xác nhận mockup/state/permission contract, không phải runtime `DONE`.

## Core Platform — 7 Must

| ID | Priority | Actor / acceptance owner | Country | Business outcome | Preconditions | Happy-path acceptance | Critical negative/edge acceptance | State transition | UI / API / DB dự kiến | Test + scenario | Evidence dự kiến | Dependency / risk | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| CP-01 | P0 | Global Admin / Product | Global + VN/PH | Country config thay đổi hành vi mà không hard-code | Admin auth; config version | VN/PH config có locale, currency, KYC, tax, payment/social/provider flags và feature toggle | Invalid/unknown flag bị reject; update có audit/version | Draft → Active version | Admin config; `/countries`; country_config | Contract + API + config tests; S01/S02 | UI/API response, audit query | AD-01/02; config drift | DESIGN_READY |
| CP-02 | P0 | Platform/Security | VN/PH isolated | Local actor không đọc/ghi/count/export country khác | Session + country context | Mọi module scope theo country; RLS/pool context đúng | Route/body tampering, list/count/export/storage cross-country bị deny | Context established → authorized/denied | Route middleware; scoped repo; RLS | Negative API/RLS/storage tests; S01/S02 | 403/empty result + DB proof | CP-04, AD-01; connection leak | DESIGN_READY |
| CP-03 | P0 | Creator/Ops / Product | VN + PH | Route market rõ và round-trip đúng context | Country config active | `/vn`, `/ph` resolve locale/config và server context đúng | Route/session mismatch không đổi context bằng body | Route selected → context resolved | Web routes; context endpoint; market table | Route/context smoke; S01/S02 | UI marker + API payload | CP-01/02 | DESIGN_READY |
| CP-04 | P0 | Creator / Security | Global + per-country | Một identity có profile VN/PH độc lập | Auth identity | Tạo/switch hai country profile; KYC/bank/tax không lẫn | Duplicate profile idempotent; unauthorized switch bị deny | User → ProfileCreated/Selected | Profile switcher; `/profiles`; user/country_profile | Integration + isolation; S01/S02 | DB rows + API/UI | CR-01, CP-02 | DESIGN_READY |
| CP-05 | P0 | All roles / Product | VN/PH | UI và system message đúng locale, fallback EN | Locale catalog | VI/EN/Filipino cho core UI/status/validation/reason/OTP/provider | Missing key fallback EN; không lộ raw key | Locale selected → rendered/fallback | i18n catalog/middleware; locale pref | Unit/UI audit; S01–S04 | locale screenshots + missing-key scan | CP-01/03; copy coverage | DESIGN_READY |
| CP-06 | P0 | Creator/Finance / Finance | VN/PH | Local currency là chính, USD chỉ tham chiếu | Country currency + FX snapshot | Money hiển thị đúng currency/rounding; payout local | Không dùng float; thiếu FX không chặn local money | Money created → displayed with snapshot | Money component/API DTO; amount_minor/currency/fx_snapshot | Golden rounding/UI; S01/S04 | formatted UI + DB snapshot | CP-08, AD-07; FX semantics | DESIGN_READY |
| CP-08 | P0 | Creator/Finance / Finance | VN/PH | Gross–Tax–Net minh bạch và tái lập | Versioned tax config | Net = Gross - Tax theo rule/version/rounding snapshot | Invalid rule/version bị reject; không sửa historical result | Commercial pending → financialized earning | Earnings UI/API; tax_rule/snapshot | Golden unit + ledger invariant; S01/S04 | calculation report + journal | CP-06, CR-07; legal disclaimer | DESIGN_READY |

## Admin — 7 Must

| ID | Priority | Actor / acceptance owner | Country | Business outcome | Preconditions | Happy-path acceptance | Critical negative/edge acceptance | State transition | UI / API / DB dự kiến | Test + scenario | Evidence dự kiến | Dependency / risk | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| AD-01 | P0 | Ops/Finance/Admin / Security | Global + scoped | Đăng nhập, RBAC, Finance/Global MFA | Identity/provider adapter | Role chỉ thấy action được phép; Finance/Global qua OTP/MFA | Wrong role/country/expired OTP/attempt limit bị deny | Unauthenticated → Authenticated → MFA verified | Admin shell/auth API; role/session/mfa tables | Permission matrix + auth E2E; S01–S04 | 2xx/403 + audit | CR-01, CP-02; provider creds | DESIGN_READY |
| AD-02 | P0 | Auditor / Security | Global + VN/PH | Critical action truy vết được và redact an toàn | Auth + action context | Auth/config/KYC/campaign/content/batch/payout/provider action có actor/country/time/outcome | Secret/PII không nằm trong audit; audit append-only | Action attempted → audit recorded | Audit viewer/API; audit_event | Inventory/redaction tests; all scenarios | audit query/export | Mọi module; coverage gap | DESIGN_READY |
| AD-03 | P0 | Local Ops / Product | Scoped | Review content reject/resubmit/approve và tạo reward exactly once | Active participation + submission | Reject reason → creator resubmit → approve → một Pending Earning | Duplicate approve không tạo duplicate money; wrong country deny | Submitted → Rejected → Resubmitted → Approved | Content queue/review API; submission/review/earning source | E2E + idempotency; S01/S03 | timeline + earning count | CR-06, CR-07; concurrency | DESIGN_READY |
| AD-04 | P0 | Local Ops / Compliance | Scoped | KYC review theo field, partial resubmit | Country profile + KYC submission | Approve hoặc reject field rõ; creator chỉ resubmit phần lỗi | Missing document/wrong country/invalid transition bị deny | Draft → Submitted → ChangesRequested/Approved | KYC queue/review API; kyc_case/field_review | E2E + isolation; S01/S02 | UI timeline + audit | CR-04, CP-02; private files | DESIGN_READY |
| AD-06 | P0 | Local Finance / Finance | Scoped | Reconcile earning, xử lý anomaly, lock batch | Financialized Pending earnings | Import/build lines, approve, resolve anomaly, lock chuyển eligible amount Available | Locked batch immutable; duplicate lock không double-post | Open → Reviewed → Locked | Finance batch UI/API; batch/line/journal | E2E/invariant/export; S01/S04 | balanced journal + CSV | CP-08, CR-07; money integrity | DESIGN_READY |
| AD-07 | P0 | Local Finance / Finance | Scoped | Lock FX reference và payout an toàn | Available balance + MFA/provider adapter | Success; confirmed failure release once; UNKNOWN hold; post-success linked reversal | Retry trước terminal resolution bị chặn; duplicate callback no double effect | Requested → Reserved → Processing → Paid/Failed/Unknown/Reversed | Payout console/API; attempt/provider_event/journal | State/idempotency E2E; S04 | reserve/balance/journal proof | AD-06, CR-08; provider ambiguity | DESIGN_READY |
| AD-09 | P0 | Ops/Admin / Product | Scoped | Build/activate campaign, quản budget và xem basic counters/CSV | Product + Offer + permission | Builder validate; budget/slot cap; counters và CSV đúng scope | Invalid terms/over cap/wrong country bị deny; thiếu counters/CSV không được DONE | Draft → Active → Paused/Closed; Full derived | Campaign UI/API; product/offer/campaign/budget | CRUD/eligibility/cap/export; S01/S03 | builder + CSV + audit | CP-01/02; cap concurrency | DESIGN_READY |

## Creator — 8 Must

| ID | Priority | Actor / acceptance owner | Country | Business outcome | Preconditions | Happy-path acceptance | Critical negative/edge acceptance | State transition | UI / API / DB dự kiến | Test + scenario | Evidence dự kiến | Dependency / risk | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| CR-01 | P0 | Creator / Product+Security | Global | Global SSO/session vào hệ thống | Provider config hoặc disclosed mock waiver | OAuth thật nếu credential sẵn; fallback adapter tạo global session idempotent | Invalid callback/replay/session bị reject; mock phải disclose | Anonymous → Authenticated | Login/callback/session API; user/identity | Auth integration; S01/S02 | provider or signed waiver evidence | AD-01; credential availability | DESIGN_READY |
| CR-02 | P0 | Creator / Product | VN/PH | Onboard và switch country profile | Global session | Tạo/chọn VN và PH profile độc lập | Duplicate command không duplicate; KYC/bank không copy xuyên country | NoProfile → ProfileCreated → Selected | Onboarding/switcher API; country_profile | E2E/isolation; S01/S02 | UI + DB rows | CP-04/02 | DESIGN_READY |
| CR-03 | P0 | Creator / Product | VN/PH | Chọn language/currency preference | Country profile | Preference persist và UI/money render đúng | Unsupported locale/currency fallback/reject rõ | PreferenceUnset → Set/Updated | Settings API/UI; profile prefs | Locale/formatter tests; S01/S02 | reload screenshot/API | CP-05/06 | DESIGN_READY |
| CR-04 | P0 | Creator / Compliance | VN/PH | Nộp KYC và resubmit field bị reject | Country profile | Checklist theo country; upload private; status/reason; partial resubmit | Join bị chặn khi chưa Approved; invalid file/wrong country deny | Draft → Submitted → ChangesRequested → Approved | KYC wizard/status API; case/document | E2E/isolation; S01/S02 | checklist/timeline/audit | AD-04, storage | DESIGN_READY |
| CR-05 | P0 | Creator / Product | VN/PH | Discover/join campaign và nhận asset cá nhân | Approved KYC + eligible profile | Browse/detail/join idempotent; My Campaigns có link/code/hashtag cá nhân | Ineligible/full/closed/duplicate join xử lý rõ, không duplicate asset | Eligible → Joined; Full là derived | Discovery/detail/My Campaigns API; participation/asset | Eligibility/idempotency; S01/S03 | UI + unique DB keys | AD-09, CR-04 | DESIGN_READY |
| CR-06 | P0 | Creator / Product | VN/PH | Submit và theo dõi content đến resubmit | Joined participation | Validate URL/file; submit; xem reject reason; resubmit | Submit sai campaign/country/type bị deny; approved immutable | Draft → Submitted → Rejected → Resubmitted → Approved | Submit/status UI/API; deliverable/version | E2E/validation; S01/S03 | timeline + audit | CR-05, AD-03 | DESIGN_READY |
| CR-07 | P0 | Creator / Finance | VN/PH | Hiểu nguồn tiền và Gross–Tax–Net theo lifecycle | Approved content + financialization | Dashboard/detail nối source→calculation→journal; Pending/Confirmed/Available/Paid/Reversed | Không hiển thị tiền country khác; totals khớp ledger; không sửa history | Pending → Confirmed → Available → Paid/Reversed | Earnings UI/API; earning/journal/snapshot | Golden/invariant/isolation; S01/S04 | UI totals + ledger query | CP-06/08, AD-06 | DESIGN_READY |
| CR-08 | P0 | Creator / Finance+Security | VN/PH | Yêu cầu payout bằng OTP và theo dõi recovery | Available balance + payout profile | Reserve once, OTP, provider success; status rõ cho failure/UNKNOWN/reversal | Insufficient/expired OTP/duplicate request/retry while UNKNOWN bị deny | Available → Reserved → Paid/Released/Unknown/Reversed | Payout UI/API; request/attempt/event/journal | E2E/idempotency; S04 | balance before/after + audit | AD-07, AD-01 | DESIGN_READY |

## Should/P1 — 7 yêu cầu tách khỏi P0

| ID | Priority | Actor / owner | Country | Business outcome | Preconditions | Happy acceptance | Critical edge | State | UI/API/DB | Test + scenario | Evidence | Dependency/risk | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| CP-07 | P1 | Finance / Product | VN/PH | Realtime FX + fallback nâng cao | P0 money Green | Provider rate/fallback policy | Stale/outage disclosed | Rate active/stale | FX adapter/cache | Provider contract | snapshot/fallback log | Không lấy time P0 | BACKLOG |
| CP-09 | P1 | Global Admin / Product | Global | Percentage rollout nâng cao | CP-01 Green | Cohort rollout | Deterministic assignment | Draft→Active | Config rollout UI/API | Cohort tests | assignment report | Scope creep | BACKLOG |
| AD-05 | P1 | Ops/Admin / Product | Scoped | Creator management nâng cao | CR flows Green | Search/filter/action | Cross-country deny | Account lifecycle | Admin creator UI/API | RBAC/isolation | export/audit | Privacy | BACKLOG |
| AD-08 | P1 | Finance / Finance | Scoped | Finance dashboard nâng cao | Money P0 Green | Trends/anomaly dashboard | Totals reconcile | Reporting snapshot | Dashboard/query model | Reconciliation test | report | BI scope | BACKLOG |
| AD-10 | P1 | Global Admin / Product | Global | Cross-country executive dashboard | CP-02 Green | Aggregates authorized | No row-level leakage | Reporting snapshot | Global dashboard/API | Permission/aggregate | report | Isolation | BACKLOG |
| CR-09 | P1 | Creator / Product | VN/PH | Social account management đầy đủ | CR-01/05 Green | Connect/verify/manage accounts | Provider failure clear | Connected/Revoked | Social UI/adapter | Provider tests | mock evidence | Real provider | BACKLOG |
| CR-10 | P1 | Creator / Product | VN/PH | Push notification | Core flows Green | Opt-in + key events | Consent/retry handling | Queued/Sent/Failed | Notification service/UI | Delivery tests | event log | Delivery infra | BACKLOG |

## P0b extension — không tính vào 22 Must

| ID | Priority | Capability | Release rule | Status |
|---|---|---|---|---|
| EXT-CPS-01 | P0b | Mock `PAID_ORDER` ingest/import | Chỉ mở khi G17 Green | CUT_DEFAULT |
| EXT-CPS-02 | P0b | `SALE_PERCENT` calculation + budget semantics | Không được phá Money/Ledger P0 | CUT_DEFAULT |
| EXT-CPS-03 | P0b | Dedupe `provider + external_event_id` | Duplicate event tạo đúng một earning | CUT_DEFAULT |

## Baseline checks

- Must count: `7 CP + 7 AD + 8 CR = 22`.
- Should count: `7`.
- P0b nằm bảng riêng và không chặn S01–S04/G25.
- Không requirement nào được đổi `DONE` trong Ngày 1 vì chưa có implementation/test runtime.
- Cell-level workbook re-diff còn pending do không có Excel session/runtime spreadsheet chuẩn; xem `G1_SCOPE_GATE.md`.
- Ngày 2: CR-01–CR-08 chuyển `DESIGN_READY` sau clickable Creator prototype/G2; trạng thái này không đồng nghĩa runtime `DONE`.
- Ngày 3: CP-01/CP-02 và AD-01/02/03/04/06/07/09 chuyển `DESIGN_READY` sau V09–V12, state/permission/provider contracts và G3; vẫn chưa có business runtime.
- Ngày 4: toàn bộ 22 Must đạt `DESIGN_READY` sau ERD/API/architecture/country/test contracts; vẫn không requirement nào là runtime `DONE`.

## G4 design coverage — 22 Must

| Must | Screen | State/policy | API boundary | Entity/constraint | Planned test/evidence |
|---|---|---|---|---|---|
| CP-01 | V09 | config version | market context/admin config inventory | Country, CountryConfig | config contract + audit |
| CP-02 | V01–V12 | deny-by-default/RLS | all `/{market}` endpoints | country_id + RLS/composite FK | ISO-01..10 |
| CP-03 | V01/V09 | context resolution | `GET /markets/{market}/context` | Country, CountryConfig | `/vn`/`/ph` DB round-trip |
| CP-04 | V02 | profile create/select | `/profiles`, `/{market}/profiles/*` | User 1:N CountryProfile, unique user+country | isolation/idempotency API |
| CP-05 | all | locale fallback | context + localized error/reason | locale/config + profile preference | UI catalog/fallback scan |
| CP-06 | V04/V07/V08/V12 | exact local money | Money DTO strings | BIGINT minor + currency, decimal FX | golden rounding/serialization |
| CP-08 | V07/V12 | snapshot/ledger immutable | earning later inventory | EarningSnapshot, LedgerEntry | tax/net + balanced journal |
| AD-01 | V09–V12 | RBAC/MFA | session + guards | Session, RoleAssignment | 401/403/MFA matrix |
| AD-02 | V09 | append-only/redacted audit | audit projection + command side effect | AuditEvent | coverage/redaction query |
| AD-03 | V10/V06/V07 | SM-04/SM-05 exactly once | content later inventory | SubmissionVersion -> unique Earning source | S03 replay count=1 |
| AD-04 | V10/V02 | SM-01 field version | Ops KYC endpoints | KycCase/FieldVersion/Decision | S02 partial resubmit/isolation |
| AD-06 | V12/V07 | SM-06 locked immutable | reconciliation inventory | Batch/Line/Ledger | lock replay/balance/export |
| AD-07 | V12/V08 | SM-07 provider matrix | payout/provider inventory | Request/Attempt/ExternalEvent | S04 fail/Unknown/refund |
| AD-09 | V11/V03–V05 | SM-02/SM-03 | campaign later inventory | Product->Offer->Campaign | lifecycle/cap/export |
| CR-01 | V01 | auth adapter/session | OAuth/local session | User/IdentityProvider/Session | callback replay/mock disclosure |
| CR-02 | V02 | independent profiles | profile endpoints | unique User+Country | create/switch/no-copy |
| CR-03 | V01/V02 | preference/fallback | preference + market context | CountryConfig/Profile | persist/reload/unsupported locale |
| CR-04 | V02/V10 | SM-01 | creator + Ops KYC endpoints | KycCase/FieldVersion/Decision | S02 + private upload |
| CR-05 | V03–V05/V11 | SM-02/SM-03 | campaign/join inventory | Participation unique + snapshot | eligibility/join replay |
| CR-06 | V05/V06/V10 | SM-04 | submission/review inventory | append SubmissionVersion | S03 validation/version history |
| CR-07 | V07/V12 | SM-05/SM-06 | earnings inventory | Earning/Snapshot/Ledger | lifecycle/source/totals |
| CR-08 | V08/V12 | SM-07 | payout inventory | Intent/Request/Attempt/Ledger | S04 idempotency/money effects |
