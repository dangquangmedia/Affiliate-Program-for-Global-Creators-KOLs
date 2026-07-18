# KẾ HOẠCH TRIỂN KHAI CHI TIẾT TUẦN 2

> Dự án: Affiliate GLOBAL  
> Thời lượng: Ngày 6–10, khoảng 40 giờ  
> Nguồn phạm vi: `Plan/docs/Book1.xlsx`, kế hoạch 5 tuần và kế hoạch chi tiết Tuần 1  
> Trạng thái khi lập kế hoạch: Pre-implementation; Tuần 1 chưa được thực thi  
> Điều kiện bắt đầu: Gate G5 của Tuần 1 phải đạt `GO` hoặc `CONDITIONAL GO` không ảnh hưởng Auth/Country/KYC  
> Mục tiêu tuần: dựng foundation bảo mật đa quốc gia và hoàn thành vertical slice Creator KYC → Local Ops review

## 1. Kết quả bắt buộc cuối Tuần 2

Tuần 2 phải biến walking skeleton thành hệ thống có identity, country isolation, quyền và KYC chạy thật ở mức MVP.

Cuối tuần phải chứng minh được sáu kết quả:

1. **Global Identity chạy được:** một user đăng nhập một lần, session có lifecycle rõ, không tạo user trùng khi đăng nhập lại.
2. **Country Profile độc lập:** cùng một global user có profile VN và PH nhưng KYC, bank, tax, agreement và preference không lẫn nhau.
3. **Country isolation có defense-in-depth:** route context, API guard/scoped repository và PostgreSQL RLS cùng chặn direct-ID cross-country access.
4. **RBAC, MFA và Audit chạy thật:** năm role có quyền đúng; Finance/Global Admin phải qua MFA mock; action nhạy cảm có audit an toàn.
5. **Country config và i18n chạy được:** VN/PH dùng config thay vì `if country`; VI/EN/Filipino có fallback; locale/currency preference được lưu.
6. **KYC vertical slice hoàn chỉnh:** Creator submit → Local Ops review → reject một field → Creator chỉ sửa field đó → resubmit → approve.

Kết quả cuối tuần là **Core Platform foundation + KYC E2E**. Chưa xây Product/Offer/Campaign, Content, Earning, Ledger, Reconciliation hoặc Payout.

## 2. Entry Gate và phạm vi tuần

### 2.1. Điều kiện bắt đầu Ngày 6

Trước `W2-D6-T01`, phải có bằng chứng:

- Git repository hợp lệ và execution log nội bộ không bị staged/publish.
- Web, API và PostgreSQL khởi động được theo README.
- Migration/seed VN/PH, `/health`, `/vn`, `/ph` và verify command đang Green.
- ERD, API contract, state machine và permission matrix Tuần 1 đã được freeze.
- DEC-07 country source of truth, DEC-09 OAuth fallback, DEC-10 MFA/OTP, DEC-13 ORM và DEC-16 Global Admin bypass không còn `OPEN`.
- Không còn `NO-GO` item của Gate G5.

Nếu Gate G5 là `CONDITIONAL GO`, chỉ được carry-over các việc như visual polish, copy hoặc P0b design. Nếu thiếu migration, country contract, permission/state hoặc walking skeleton, dùng tối đa nửa ngày đầu Tuần 2 để đóng gate rồi mới bắt đầu Auth.

### 2.2. P0 bắt buộc Tuần 2

- Auth/session adapter và local/mock login fallback.
- Global User, External Identity và Session.
- Creator Country Profile VN/PH và country switching.
- Country context resolver, scoped authorization và RLS cho các bảng nhạy cảm đã tồn tại.
- RBAC cho Creator, Local Ops, Local Finance, Local Admin và Global Admin.
- MFA/OTP mock cho Local Finance và Global Admin.
- Audit foundation cho login, role/country access, country config và KYC decisions.
- Country config seed/API/UI tối thiểu, gồm simple feature toggle, allowed social platforms và provider/payment flags theo country.
- i18n VI/EN/Filipino, fallback EN, locale/currency preference.
- Country-specific KYC checklist, private upload, mock eKYC adapter.
- Creator KYC submit/status/resubmit.
- Local Ops KYC queue/detail/field-level review.
- Automated negative tests chống country leak, role bypass, MFA bypass và KYC history overwrite.

### 2.3. Không phải P0 Tuần 2

- Google/TikTok OAuth thật nếu credential chưa sẵn sàng.
- SMS/email OTP production.
- Generic ABAC/rule engine; Tuần 2 dùng permission policy cụ thể theo matrix.
- eKYC/OCR/face matching thật.
- Malware scanning production, document redaction tự động hoặc retention engine pháp lý.
- Country onboarding wizard cho quốc gia bất kỳ.
- Admin user-management nâng cao.
- Bulk KYC operation nâng cao.
- Notification email/push.
- Product, Campaign, Content, Earnings và Finance workflow.

## 3. Thứ tự ưu tiên và dependency

| Thứ tự | Chức năng | Mức | Dependency/lý do |
|---:|---|---|---|
| 1 | Kiểm tra Gate G5 và baseline Green | P0 | Không xây feature trên skeleton hoặc contract chưa ổn định |
| 2 | Auth/session + Global User/Identity | P0 | Mọi profile, role, KYC và audit cần actor ổn định |
| 3 | Country Profile + request country context | P0 | Là ownership root cho dữ liệu creator theo market |
| 4 | RBAC + scoped repository/API guard | P0 | Chặn sai quyền ở application layer trước khi thêm dữ liệu nhạy cảm |
| 5 | PostgreSQL RLS + pool-context tests | P0 | Defense-in-depth và chống query bỏ sót country filter |
| 6 | Audit + MFA/OTP | P0 | Phải có trước khi Admin/Ops bắt đầu thao tác nhạy cảm |
| 7 | Country config + i18n/preference | P0 | KYC checklist và UI phụ thuộc country/locale config |
| 8 | KYC checklist/version + private storage | P0 | Phải có trước Creator KYC submission |
| 9 | Creator KYC submit/status/resubmit | P0 | Đầu vào cho Local Ops review |
| 10 | Local Ops KYC review + full E2E | P0 | Chứng minh vertical slice và gate cuối tuần |
| 11 | OAuth/eKYC/OTP thật, polish và automation nâng cao | P1 Tuần 2 | Không được lấy thời gian của isolation/KYC E2E |

Dependency bắt buộc:

```text
G5 Week 1 GO
  → G6 Identity + Country Profile
  → G7 Isolation + RBAC + Audit + MFA
  → G8 Country Config + i18n + KYC Config
  → G9 Creator KYC
  → G10 Ops Review + Week 2 E2E Gate
```

Không làm theo kiểu “xong toàn bộ backend rồi mới làm frontend”. Mỗi ngày phải đóng một vertical slice DB → API → UI → test/evidence.

## 4. Phân bổ công suất 40 giờ

| Ngày | Task đã lên lịch | Buffer | Trọng tâm |
|---|---:|---:|---|
| 6 | 7 giờ | 1 giờ | Auth, Global Identity, Country Profile |
| 7 | 7 giờ | 1 giờ | RBAC, country isolation, RLS, Audit, MFA |
| 8 | 7 giờ | 1 giờ | Country config, i18n, preference, KYC checklist config |
| 9 | 7 giờ | 1 giờ | Creator KYC, MinIO và mock eKYC |
| 10 | 7 giờ + 1 giờ integration/fix buffer | Đã nằm trong task W2-D10-T08 | Ops review, E2E, regression và gate |

Buffer chỉ xử lý P0 blocker, integration và security defect. Không dùng buffer cho OAuth thật, hi-fi hoặc P1.

## 5. Quyết định kỹ thuật/nghiệp vụ phải khóa

Các quyết định này phải lấy từ Decision Log Tuần 1 hoặc được chốt ở đầu Ngày 6–8 trước khi code phần liên quan.

| ID | Quyết định | Default recommendation | Deadline |
|---|---|---|---|
| W2-DEC-01 | Session model | Server-managed session + HttpOnly cookie; Secure ở production config; CSRF protection cho state-changing request; logout/revoke được | Đầu Ngày 6 |
| W2-DEC-02 | External identity uniqueness | Unique `provider + provider_subject`; không tự link account chỉ dựa vào email chưa xác minh | Đầu Ngày 6 |
| W2-DEC-03 | Local/mock auth | Chỉ bật ở development/test; production config phải fail closed | Đầu Ngày 6 |
| W2-DEC-04 | Creator country routing | Route chọn requested market; server kiểm tra profile/session; chưa có profile thì vào onboarding | Ngày 6 |
| W2-DEC-05 | Cross-country response | Direct-ID resource ngoài scope trả `404`; đúng country nhưng thiếu role/action trả `403` | Đầu Ngày 7 |
| W2-DEC-06 | RLS request context | Set context bằng transaction-local mechanism; runtime DB role không có `BYPASSRLS`; migration role tách riêng | Ngày 7 |
| W2-DEC-07 | Audit transaction | State change nhạy cảm và audit record cùng transaction; không ghi document/bank/tax value thô | Ngày 7 |
| W2-DEC-08 | MFA scope | Local Finance và Global Admin bắt buộc; session chỉ elevated sau OTP hợp lệ | Ngày 7 |
| W2-DEC-09 | Locale preference | Pre-country dùng user/browser default; sau khi chọn market dùng preference của country profile | Ngày 8 |
| W2-DEC-10 | Currency preference | Local currency là mặc định; user có thể chọn USD reference để xem, không đổi settlement currency | Ngày 8 |
| W2-DEC-11 | Country config ownership | Global Admin edit; local role chỉ đọc phần được phép; mọi thay đổi có version/audit | Ngày 8 |
| W2-DEC-12 | KYC checklist | Version theo country; KYC Case snapshot checklist version lúc tạo | Trước schema KYC |
| W2-DEC-13 | Active KYC case | Mỗi Country Profile có tối đa một active case; submit/resubmit idempotent | Ngày 9 |
| W2-DEC-14 | KYC field review | Review theo field; Approved field khóa; Needs Changes field mới được sửa | Ngày 9 |
| W2-DEC-15 | Document storage | MinIO private bucket; metadata trong DB; download qua API proxy có authorization; upload URL nếu dùng phải ngắn hạn và object-key scoped | Ngày 9 |
| W2-DEC-16 | Provider timeout | Giữ `Pending/Unknown` hoặc chuyển manual review; không tự reject và không tạo case trùng khi retry | Ngày 9 |
| W2-DEC-17 | Concurrent review | Optimistic version/check; reviewer thứ hai nhận conflict thay vì ghi đè | Trước Ngày 10 |
| W2-DEC-18 | CR-01 provider acceptance | Một Google/TikTok OAuth thật nếu credential sẵn; nếu không, local/mock adapter chỉ được coi là MVP khi acceptance owner ký waiver/disclosure rõ | Cuối Ngày 6 |

## 6. Artifact và module phải có

### 6.1. Tài liệu/evidence

| Artifact | Đường dẫn dự kiến | Ngày | Mức |
|---|---|---:|---|
| Week 2 test matrix | `docs/qa/WEEK2_TEST_MATRIX.md` | 6–10 | P0 |
| Week 2 evidence | `docs/qa/WEEK2_EVIDENCE.md` | 6–10 | P0 |
| Country-isolation design/runtime proof | `docs/security/COUNTRY_ISOLATION.md` | 7 | P0 |
| RBAC matrix test mapping | cập nhật `docs/product/PERMISSION_MATRIX.md` | 7 | P0 |
| Session/MFA security decisions | Decision Log/ADR tương ứng | 6–7 | P0 |
| Country configuration reference | `docs/product/COUNTRY_CONFIG.md` | 8 | P0 |
| KYC checklist và failure behavior | `docs/product/KYC_RULES.md` | 8–9 | P0 |
| API/OpenAPI updates | contract của Auth/Country/KYC | xuyên tuần | P0 |
| Week 2 demo script | cập nhật `docs/product/DEMO_SCENARIOS.md` | 10 | P0 |

### 6.2. Backend module dự kiến

- Auth/Session.
- Identity/User.
- Country/Country Profile/Country Config.
- Access Control: role assignment, permission guard, country context.
- Audit.
- MFA/OTP mock provider.
- KYC Case/Field/Document/Review.
- KYC provider adapter/mock.
- Object storage adapter/MinIO.

### 6.3. Frontend surface dự kiến

- Login/session-expired/MFA challenge.
- Country onboarding/switcher.
- Locale/currency preferences.
- Creator KYC wizard/status/timeline/resubmit.
- Local Ops KYC queue/detail/review.
- Minimal Global Admin country-config surface.

## 7. Kế hoạch chi tiết theo ngày

### Ngày 6 — Auth, Global Identity và Country Profile

#### Outcome duy nhất

Một user đăng nhập một lần, có session hợp lệ và tạo/chuyển được hai country profile độc lập.

| Task ID | Timebox | Mũ vai trò | Công việc | Đầu ra | Acceptance/evidence |
|---|---:|---|---|---|---|
| W2-D6-T01 | 30 phút | Tech Lead/QA | Kiểm Gate G5, pull forward unresolved P0 và chạy baseline verify | Entry checklist | Chỉ bắt đầu khi skeleton/migration/route Green |
| W2-D6-T02 | 1 giờ | Backend/Data | Migration/model cho User, External Identity, Session, Country Profile | Identity schema | Unique provider subject; unique user+country; profile-owned KYC/bank/tax boundary rõ |
| W2-D6-T03 | 1 giờ 30 | Backend/Security | Auth provider interface, local/mock adapter, create/refresh/revoke session, logout | Auth API | Login lại không tạo user trùng; expired/revoked session bị chặn; dev login fail-closed ở production config |
| W2-D6-T04 | 45 phút | Frontend | Login/session UI, protected shell và session-expired recovery | Auth UI | Loading/error/session-expired states; credential/token không lưu trong localStorage nếu session dùng cookie |
| W2-D6-T05 | 1 giờ 30 | Full-stack | Create/list/switch Country Profile; `/vn` và `/ph` profile context | Country Profile slice | Một user có VN+PH profile; switch không làm đổi dữ liệu profile còn lại; profile creation idempotent |
| W2-D6-T06 | 1 giờ | QA/Backend | Unit/integration tests cho identity, session và profile uniqueness | Test evidence | AUTH/PROFILE test set Green; direct duplicate request không tạo duplicate record |
| W2-D6-T07 | 45 phút | Product/QA | Demo Gate G6, cập nhật OpenAPI/RTM/evidence/log | G6 checklist | CR-01/CR-02 và CP-04 có vertical slice tối thiểu |

Giữ 1 giờ buffer cho OAuth/session/cookie integration.

#### Auth/session acceptance bắt buộc

- `provider + provider_subject` là identity key; email không phải khóa liên kết duy nhất nếu chưa verified.
- Login callback/retry idempotent.
- Session có created-at, expires-at, revoked-at và last-used metadata phù hợp.
- Logout/revoke làm request tiếp theo thất bại.
- Development login không thể bật nhầm ở production config.
- Error message không tiết lộ account/provider nội bộ quá mức cần thiết.
- Finance/Global Admin login được đánh dấu `MFA_PENDING`; chưa truy cập privileged route trước Ngày 7.

#### Country Profile acceptance bắt buộc

- Unique `(user_id, country_id)`.
- Route `/vn` chọn/tạo VN context; `/ph` chọn/tạo PH context.
- Nếu user chưa có profile trong market, hiển thị onboarding thay vì lấy profile country khác.
- Language/currency/KYC/bank/tax/agreement thuộc Country Profile hoặc entity con, không nằm dùng chung trên Global User.
- Không nhận `country_id` từ body làm nguồn tin cuối cùng.

#### Gate G6 — Identity Gate

Pass khi:

- Login → session → protected shell chạy.
- Cùng identity đăng nhập hai lần chỉ có một Global User/External Identity.
- Một user tạo/chuyển VN và PH profile độc lập.
- Expired/revoked session bị chặn.
- Production config không có local/dev login.
- Migration, test, OpenAPI và evidence được cập nhật.

### Ngày 7 — RBAC, country isolation, RLS, Audit và MFA

#### Outcome duy nhất

Local role không thể đọc/sửa country khác ngay cả khi gọi direct API ID hoặc query application quên filter.

| Task ID | Timebox | Mũ vai trò | Công việc | Đầu ra | Acceptance/evidence |
|---|---:|---|---|---|---|
| W2-D7-T01 | 30 phút | Security/Product | Chuyển Permission Matrix thành executable role/action cases | Test-data matrix | 5 role × action × country × state có allow/deny expected result |
| W2-D7-T02 | 1 giờ | Backend/Security | Role Assignment, permission guard và privileged-route policy | RBAC layer | Creator/Ops/Finance/Admin/Global đúng quyền; backend không dựa vào UI hide |
| W2-D7-T03 | 1 giờ | Backend | Country context resolver và scoped repository/query pattern | Country scope layer | Route/session mismatch bị xử lý theo policy; request body/header không bypass scope |
| W2-D7-T04 | 1 giờ 15 | Data/Security | Runtime DB role, RLS policy cho Country Profile/current sensitive tables và pool-safe context | RLS proof | Raw/direct query bằng runtime role không đọc row ngoài country; context không leak giữa pooled requests |
| W2-D7-T05 | 45 phút | Backend/Governance | Request-context middleware + explicit Audit service trong command nhạy cảm + safe before/after summary | Audit foundation | Actor/action/entity/country/outcome/time/correlation ID; audit atomic; không log token/document/bank/tax value |
| W2-D7-T06 | 1 giờ | Backend/Frontend | MFA/OTP mock cho Finance và Global Admin | MFA flow | Expiry, max attempts, single-use, audit; MFA_PENDING không vào privileged route |
| W2-D7-T07 | 1 giờ 15 | QA/Security | API, DB/RLS, role matrix, direct-ID và MFA negative tests | Security evidence | 100% critical permission cases Green; cross-country metadata không leak |
| W2-D7-T08 | 15 phút | Tech Lead/QA | Gate G7 và cập nhật risk/evidence/log | G7 checklist | Không còn P0 country/RBAC/MFA defect |

Giữ 1 giờ buffer cho RLS/connection-pool hoặc cookie/MFA integration.

#### Defense-in-depth bắt buộc

```text
Route/request market
  → authenticated session
  → role + country authorization guard
  → scoped repository/query
  → PostgreSQL RLS using transaction-local context
  → safe 404/403 + audit/security event
```

Không được coi frontend route guard là security boundary.

#### Negative cases bắt buộc

- Ops VN gọi direct ID của Country Profile/KYC PH → `404`, không lộ metadata.
- Finance VN gọi approve KYC VN → `403`.
- Creator A gọi profile/KYC của Creator B cùng country → `404`.
- Local Admin PH mở privileged route VN → denied.
- Global Admin cross-country đúng permission → allowed + audit.
- Session `MFA_PENDING` gọi Finance/Global privileged endpoint → denied.
- OTP sai, hết hạn, vượt attempt hoặc dùng lại → denied + audit.
- Hai request liên tiếp dùng pooled DB connection khác country → không thấy row của request trước.
- Query code quên `country_id` filter → RLS vẫn chặn.
- DB request thiếu country context → fail closed, không trả toàn bộ row.
- INSERT/UPDATE cố ghi `country_id` khác context → RLS `WITH CHECK` từ chối.
- List/count/cursor tạo ở VN không được dùng để suy ra dữ liệu PH.

#### Audit safety acceptance

- State change và audit cùng transaction cho action bắt buộc.
- Audit có actor, effective role, country, action, entity type/id, result, timestamp, request/correlation ID.
- Before/after chỉ chứa field/status summary đã cho phép; không chứa document image, token, OTP, bank number hoặc tax ID đầy đủ.
- Audit record không được update/delete qua application role.
- Denied privileged/cross-country attempts có security audit phù hợp nhưng không tạo log chứa PII.

#### Gate G7 — Isolation Gate

Pass khi:

- RBAC parameterized tests Green.
- Direct-ID cross-country bị chặn ở API.
- RLS raw-query và pooled-context tests Green.
- Finance/Global MFA không bypass được.
- Audit được ghi đúng và không chứa PII/secrets.
- Không có country leak dù UI, API ID hoặc repository query bị thao tác.

Country leak, RLS context leak hoặc MFA bypass là `NO-GO/stop-release`; không chuyển sang KYC cho tới khi sửa.

### Ngày 8 — Country configuration, i18n và KYC checklist config

#### Outcome duy nhất

VN và PH dùng chung code nhưng khác config/locale/currency/KYC checklist/payment-social-provider flags/simple feature toggle; không viết `if country` rải rác trong business logic.

| Task ID | Timebox | Mũ vai trò | Công việc | Đầu ra | Acceptance/evidence |
|---|---:|---|---|---|---|
| W2-D8-T01 | 30 phút | Backend/Data | Hoàn thiện Country Config schema/version và seed VN/PH | Country config data | Code, enabled, timezone, locales, currency, KYC/payment/social/provider flags, simple feature toggles và rule references có version |
| W2-D8-T02 | 1 giờ | Full-stack/Admin | API/UI tối thiểu để Global Admin xem/sửa config cho phép; read view cho local context | Config slice | Change có validation/version/audit; Local Admin không sửa country khác |
| W2-D8-T03 | 1 giờ 15 | Frontend | i18n setup và translation keys cho Auth/Profile/KYC/Admin shell | Core translations | VI/EN/Filipino; missing key fallback EN; không hiện raw key trên critical screen |
| W2-D8-T04 | 45 phút | Full-stack | Lưu language/currency display preference theo Country Profile | Preference slice | VN/PH preference độc lập; đổi USD reference không đổi settlement currency |
| W2-D8-T05 | 45 phút | Frontend/Domain | Locale formatter cho date/time/number/currency | Formatter layer | VND/PHP format đúng seed; API vẫn dùng UTC/ISO; không dùng float để tính tiền |
| W2-D8-T06 | 45 phút | Domain/Backend | Tax/FX provider interface và synthetic config contract, chưa làm calculation engine | Rule interfaces | Không hard-code rate theo country; dữ liệu ghi rõ demo only |
| W2-D8-T07 | 1 giờ | Product/Data | KYC checklist/version schema và seed khác nhau cho VN/PH | KYC config | Case sau này snapshot version; required/optional field, document policy và provider mode rõ |
| W2-D8-T08 | 45 phút | QA | Config authorization, fallback, formatting và preference isolation tests | Test evidence | Locale/config test set Green; missing translation fallback; cross-country edit bị chặn |
| W2-D8-T09 | 15 phút | Product/QA | Gate G8 và update OpenAPI/RTM/log | G8 checklist | CP-01/CP-05/CR-03 foundation sẵn sàng cho KYC |

Giữ 1 giờ buffer cho translation/config/schema adjustment.

#### Country Config P0 fields

- Country code, display name, enabled status và timezone.
- Default locale, allowed locales và fallback locale.
- Settlement/local currency và allowed reference currencies.
- KYC checklist version và mock provider configuration.
- Tax rule reference/version, FX source/fallback reference ở mức interface/config.
- Allowed social platforms; KYC/payment provider mode và MFA/OTP/provider flags nếu áp dụng theo market.
- Simple boolean feature enable/disable theo country. Percentage rollout vẫn là `CP-09`/P1, không nằm trong CP-01 P0.
- Timestamps/version và actor audit cho thay đổi.

Không biến toàn bộ config thành một JSON blob không kiểm soát. Các field core phải typed/validated; provider-specific extension có schema rõ.

#### i18n/locale acceptance

- Critical screens có key VI, EN và Filipino hoặc fallback EN đã được kiểm chứng.
- KYC/content/payout status, validation/failure reason, OTP và provider-timeout safe messages dùng translation key/error-code mapping; không hard-code message quan trọng.
- Không lưu text đã dịch vào business record khi chỉ cần translation key/code.
- API time là UTC ISO-8601; UI format theo country/profile timezone.
- Local currency luôn là settlement/payout currency; USD chỉ là display reference.
- Missing/invalid locale không crash app và fallback có chủ đích.

#### Gate G8 — Config/Locale Gate

Pass khi:

- Cùng một code path render khác config cho VN và PH.
- Global Admin edit hợp lệ có audit; local cross-country edit bị chặn.
- Simple feature toggle và payment/social/provider flags thay đổi behavior theo country mà không deploy; percentage rollout không được đánh dấu Done.
- VI/EN/Filipino core keys và fallback EN hoạt động.
- Preference được lưu độc lập theo profile.
- KYC checklist VN/PH khác nhau và có version.
- Tax/FX chỉ là interface/config; không giả vờ đã hoàn thành Gross–Tax–Net.

### Ngày 9 — Creator KYC, private upload và mock eKYC

#### Outcome duy nhất

Creator hoàn thành KYC theo đúng country checklist, upload synthetic documents an toàn và theo dõi được status/field feedback.

| Task ID | Timebox | Mũ vai trò | Công việc | Đầu ra | Acceptance/evidence |
|---|---:|---|---|---|---|
| W2-D9-T01 | 30 phút | Product/Backend | Review G8/KYC config và khóa field/state/validation contract | KYC implementation checklist | Không code KYC bằng field hard-code ngoài config |
| W2-D9-T02 | 1 giờ | Backend/Data | Migration/model KYC Case, Field, Document, Provider Attempt, Submission/Review version và RLS policies | KYC domain | Một active case/profile; checklist snapshot; field history/version; KYC/object metadata bị country/owner scope |
| W2-D9-T03 | 1 giờ | Backend/Security | MinIO private bucket, metadata, file validation, authorized download proxy và scoped upload | Storage adapter | Bucket/path không public; proxy kiểm tra owner/country/role; upload TTL/object key được giới hạn; no PII in log/seed |
| W2-D9-T04 | 45 phút | Integration | Mock eKYC adapter với success, validation failure, timeout/unknown và retry | Provider mock | Retry idempotent; timeout không tự reject; provider raw payload không leak ra UI/log |
| W2-D9-T05 | 1 giờ 15 | Backend | Creator KYC checklist/draft/update/upload/submit/status APIs và minimal Ops queue/detail read API | KYC API | Submit idempotent; owner/country scope; state do backend kiểm soát; Day 10 không bắt đầu Admin API từ số 0 |
| W2-D9-T06 | 1 giờ 30 | Frontend | Creator KYC wizard, checklist, document state, submit/status/timeline | Creator KYC UI | Loading/validation/error/timeout/denied/needs-changes states; mobile usable |
| W2-D9-T07 | 45 phút | QA/Security | Owner/country, upload/download proxy, state, duplicate submit và provider timeout tests | Test evidence | KYC creator test set Green; direct object path bị chặn; upload URL hết hạn đúng policy |
| W2-D9-T08 | 15 phút | Product/QA | Gate G9 và update RTM/OpenAPI/evidence/log | G9 checklist | Creator KYC sẵn sàng cho Ops review |

Giữ 1 giờ buffer cho MinIO/upload/validation integration.

#### KYC data/state rules bắt buộc

- KYC Case thuộc đúng một Creator Country Profile và snapshot checklist version.
- Field/document thuộc case; không gắn trực tiếp vào Global User.
- Approved field không sửa được trong partial resubmit.
- Needs Changes field có reason code, human-readable message và reviewer metadata an toàn.
- Submit/resubmit dùng idempotency/version check.
- Provider event/raw response được normalize; UI chỉ thấy status/reason cho phép.
- Synthetic documents only trong repo/demo; không dùng CCCD, passport, bank hoặc tax data thật.
- Phân biệt riêng KYC Case state, KYC Field state, Provider Attempt state và immutable KYC version; không dùng một enum chung cho cả bốn.
- Direct object path không công khai; document read đi qua API proxy authorization. Nếu dùng signed URL cho upload, URL là bearer nên phải TTL ngắn, object-key scoped và không được lưu/log.

Provider Attempt tối thiểu:

```text
Not Sent → Pending → Verified / Validation Failed
                   └→ Timed Out / Unknown → Retry Pending
```

- `Timed Out/Unknown` không đồng nghĩa với KYC `Rejected`.
- Idempotency gắn với `KYC version + provider + operation`.
- Callback/retry trùng chỉ tạo một transition.
- Kết quả đến muộn của version cũ không được ghi đè version resubmit mới.

#### Gate G9 — Creator KYC Gate

Pass khi:

- VN và PH load checklist từ config khác nhau.
- Creator tạo draft, upload synthetic file, submit và xem timeline/status.
- Duplicate submit không tạo case/submission trùng.
- Creator/country khác không đọc document metadata hoặc tải file qua download proxy.
- Provider timeout/unknown có trạng thái và recovery rõ, không biến thành false rejection.
- Minimal Ops queue/detail read API đã trả đúng item theo country để Ngày 10 tập trung review/UI.
- MinIO, RLS, migration, API, UI và automated tests Green.

### Ngày 10 — Local Ops KYC review, partial resubmit và full E2E

#### Outcome duy nhất

Hoàn thành vertical slice Creator → Local Ops với field-level review, lịch sử bất biến và country isolation được chứng minh.

| Task ID | Timebox | Mũ vai trò | Công việc | Đầu ra | Acceptance/evidence |
|---|---:|---|---|---|---|
| W2-D10-T01 | 30 phút | Full-stack/Ops | Hoàn thiện queue/detail UI trên minimal read API Ngày 9; server pagination/status filter | Ops queue | Ops chỉ thấy current country; empty/loading/error states; không fetch-all client-side |
| W2-D10-T02 | 1 giờ 15 | Backend | Approve/reject/request-changes theo field, final approve và invalid-transition guards | Review commands | Reason bắt buộc; Finance không review; final approve chỉ khi required fields hợp lệ |
| W2-D10-T03 | 30 phút | Frontend/Ops | Review workbench action states và field history | Review UI | Denied/conflict/error rõ; không lộ raw storage path/PII ngoài quyền |
| W2-D10-T04 | 45 phút | Full-stack | Creator partial-resubmit flow và version/timeline | Resubmit slice | Chỉ Needs Changes field editable; approved field/history giữ nguyên |
| W2-D10-T05 | 45 phút | Backend/QA | Optimistic concurrency, stale-review handling và audit verification | Concurrency proof | Hai Ops không ghi đè nhau; reviewer thứ hai nhận conflict; audit đủ actor/before-after summary |
| W2-D10-T06 | 1 giờ 30 | QA/Full-stack | E2E: VN happy KYC và PH partial rejection/resubmit/approve | E2E evidence | Hai flow chạy từ UI; không sửa DB thủ công; result/state đúng |
| W2-D10-T07 | 1 giờ | Security/QA | Cross-country, RBAC, MFA, i18n, session và provider regression | Regression evidence | Critical negative suite Green; không có P0/P1 security/data defect |
| W2-D10-T08 | 1 giờ | Full-stack | Integration/fix buffer chỉ cho P0/P1 và flaky-environment root cause | Green baseline | Không dùng retry để che test flaky; không nhận P1 |
| W2-D10-T09 | 45 phút | Product/QA/Architect | Demo, chấm GO/CONDITIONAL GO/NO-GO, cập nhật RTM/tracker/evidence/log | Gate G10 + handoff | Next exact action là Product/Offer/Campaign Ngày 11 |

#### KYC review acceptance bắt buộc

- Queue filter/pagination chạy server-side và luôn country-scoped.
- Review action backend kiểm tra role, country, state và expected version.
- Reject/request changes bắt buộc reason code + safe message.
- Partial resubmit không clone/xóa approved decision sai cách; lịch sử cũ còn truy được.
- Final approve chỉ xảy ra khi mọi required field hợp lệ.
- Audit có actor, field status change và reason code; không ghi raw document/bank/tax value.
- Direct ID PH từ Ops VN bị chặn ở API và RLS.
- Concurrent review không tạo hai final decisions hoặc mất lịch sử.

#### Gate G10 — Week 2 E2E Gate

Pass khi:

- Login/global identity/session ổn định.
- Một user có VN/PH profile độc lập.
- Role, country guard và RLS negative tests Green.
- Finance/Global Admin MFA không bypass được.
- Country config/i18n/preference hoạt động cho VN/PH.
- Creator KYC → Ops partial reject → Creator partial resubmit → Ops approve chạy E2E.
- Provider timeout/duplicate/retry được xử lý không nhân case/submission.
- KYC document private; không có PII/secrets trong log/repo/evidence.
- Audit đầy đủ cho privileged state changes.
- Verify/build/migration/seed và test suite Green.

## 8. Test matrix bắt buộc

| Test ID | Scenario | Layer | Expected result | Stop-release |
|---|---|---|---|---|
| W2-AUTH-01 | Login lại cùng provider subject | Integration | Một User/Identity, session mới hợp lệ | Có nếu duplicate identity |
| W2-AUTH-02 | Expired/revoked session | API/E2E | Bị chặn, UI có recovery | Có nếu vẫn truy cập được |
| W2-AUTH-03 | Dev login trong production config | Config/Integration | Fail closed | Có |
| W2-AUTH-04 | User suspended hoặc role bị thu hồi dùng session cũ | Integration/Security | Quyền bị chặn theo policy; không tin claim cũ từ client | Có nếu vẫn truy cập được |
| W2-AUTH-05 | Cookie flags, session fixation và CSRF trên state-changing request | Integration/Security | HttpOnly/SameSite/Secure theo env; session rotate; forged request bị chặn | Có nếu auth/action bypass |
| W2-PROFILE-01 | Một user tạo VN + PH profile | Integration/E2E | Hai profile độc lập, unique user+country | Có nếu lẫn dữ liệu |
| W2-COUNTRY-01 | Ops VN direct-ID profile/KYC PH | API | 404, không lộ metadata | Có |
| W2-COUNTRY-02 | RLS raw query với VN context | DB integration | Không thấy PH row | Có |
| W2-COUNTRY-03 | Pooled connection đổi VN → PH | DB integration | Context cũ không leak | Có |
| W2-RBAC-01 | Finance approve KYC | API/E2E | 403 | Có |
| W2-RBAC-02 | Creator A đọc KYC Creator B | API | 404 | Có |
| W2-MFA-01 | MFA_PENDING gọi privileged API | API | Denied | Có |
| W2-MFA-02 | OTP sai/hết hạn/dùng lại | Unit/Integration | Denied, attempt/audit đúng | Có nếu bypass |
| W2-AUDIT-01 | KYC/config state change | Integration | Audit cùng transaction, safe summary | Có nếu missing/PII leak |
| W2-I18N-01 | Thiếu Filipino key | UI test | Fallback EN, không raw key | Không, trừ critical flow hỏng |
| W2-I18N-02 | VN/PH preference isolation | Integration/E2E | Locale/currency không lẫn | Có nếu lẫn profile |
| W2-KYC-01 | KYC happy path | E2E | Draft → Submitted → Approved | Có |
| W2-KYC-02 | Partial reject/resubmit | E2E | Chỉ field lỗi editable; history giữ nguyên | Có |
| W2-KYC-03 | Duplicate submit/resubmit | Integration | Không tạo duplicate case/version | Có |
| W2-KYC-04 | Provider timeout rồi retry | Integration | Không false reject/duplicate | Có |
| W2-KYC-05 | Unauthorized document access/direct object path | API/storage | API proxy denied; bucket/path không public; upload URL hết hạn | Có |
| W2-KYC-06 | Hai Ops review cùng version | Integration/E2E | Một success, một conflict | Có nếu ghi đè/mất lịch sử |
| W2-KYC-07 | Late/duplicate provider result cho version cũ | Integration | Không overwrite KYC version mới hoặc nhân transition | Có |

## 9. Definition of Done cho mỗi vertical slice Tuần 2

Một task chức năng chỉ được đánh dấu `DONE` khi có đủ:

- Migration/schema hoặc config version nếu cần.
- API validation và state transition do backend kiểm soát.
- Authentication, role và country scope.
- RLS policy/test nếu entity chứa dữ liệu local nhạy cảm.
- Audit cho action privileged/state-changing.
- UI loading, empty, validation, error, denied và recovery phù hợp.
- i18n key cho user-facing copy.
- Unit/integration test và ít nhất một negative case.
- OpenAPI/RTM/Decision Log cập nhật nếu contract đổi.
- Synthetic seed/fixture; không có PII/secrets.
- Lint, type-check, test liên quan và build Green.
- Command/file evidence trong `WEEK2_EVIDENCE.md`.

Không đánh dấu `DONE` chỉ vì UI chạy được hoặc API trả `200`.

## 10. Mục tiêu trạng thái requirement cuối Tuần 2

| ID | Mục tiêu cuối tuần | Điều kiện/evidence | Lưu ý |
|---|---|---|---|
| CP-01 | DONE mức MVP lean | Typed country config VN/PH có API/UI, simple feature boolean, payment/social/provider flags, version, validation, audit | Percentage rollout/country-onboarding framework nằm ngoài P0 |
| CP-02 | IN_PROGRESS foundation verified | API + scoped repo + RLS trên bảng hiện có + negative tests | Chỉ final DONE sau khi áp dụng cho bảng Tuần 3–4 và regression Tuần 5 |
| CP-03 | DONE | Protected `/vn`, `/ph`, route/context mismatch test | Skeleton Ngày 5 được harden bằng session/authorization |
| CP-04 | DONE | Global User + hai Country Profile độc lập | KYC/bank/tax không nằm trên global user |
| CP-05 | IN_PROGRESS core foundation | VI/EN/Filipino core + fallback | Screen Tuần 3–4 tiếp tục bổ sung, final audit Tuần 5 |
| CP-06 | TODO/PARTIAL DESIGN | Formatter + display preference only | Money/earnings hoàn thành Tuần 4 |
| CP-08 | TODO/PARTIAL DESIGN | Tax config/interface only | Gross–Tax–Net engine hoàn thành Tuần 4 |
| AD-01 | DONE mức MVP | Session, RBAC, MFA, role/country tests | Real provider delivery không bắt buộc |
| AD-02 | IN_PROGRESS foundation | Audit service + Auth/Config/KYC actions | Mở rộng xuyên Tuần 3–5 |
| AD-04 | DONE | Queue, field review, partial resubmit, audit, E2E | Country/RBAC/concurrency tests bắt buộc |
| CR-01 | DONE nếu OAuth thật; CONDITIONAL nếu disclosed mock | Provider abstraction + một Google/TikTok OAuth thật, hoặc local/mock kèm waiver được acceptance owner ký | Không tự coi dev login tương đương real SSO |
| CR-02 | DONE | Create/switch VN/PH profile | Profile data độc lập |
| CR-03 | DONE core | Locale/currency preference theo profile | USD chỉ display reference |
| CR-04 | DONE | Country checklist, private upload, status, partial resubmit | eKYC thật ngoài scope |

Tracker chính chỉ dùng status hợp lệ `TODO/IN_PROGRESS/DONE/BLOCKED/CUT`; các ghi chú `PARTIAL DESIGN` ở bảng trên phải được phản ánh bằng `TODO` hoặc `IN_PROGRESS`, không đánh dấu `DONE` sai thực tế.

## 11. Gate cuối Tuần 2

### GO

Chuyển sang Product/Offer/Campaign Ngày 11 khi:

- [ ] Gate G5 Tuần 1 vẫn Green sau regression.
- [ ] Auth/session/global identity không duplicate và dev login production bị chặn.
- [ ] Một user có VN/PH profile độc lập.
- [ ] Five-role RBAC matrix và MFA negative tests Green.
- [ ] Direct-ID, raw RLS và pooled-context country isolation tests Green.
- [ ] Audit không thiếu privileged action và không chứa PII/secrets.
- [ ] Country config, i18n fallback và profile preference chạy cho VN/PH.
- [ ] KYC checklist/version khác nhau theo country.
- [ ] Creator KYC và Local Ops partial reject/resubmit/approve chạy E2E.
- [ ] Duplicate/timeout/concurrency/document-access tests Green.
- [ ] 0 P0, 0 P1 defect; không có flaky test bị che bằng retry.
- [ ] Migration/seed/verify/build Green từ clean restart.
- [ ] RTM, OpenAPI, evidence, tracker và execution log được cập nhật.

### CONDITIONAL GO

Có thể sang Tuần 3 nếu chỉ còn:

- Real OAuth provider chưa tích hợp nhưng adapter/local mock chạy, có waiver/disclosure và acceptance owner chấp thuận rõ; nếu chưa có waiver thì CR-01 vẫn `PARTIAL/BLOCKED`.
- Minor UI polish hoặc copy/translation ngoài critical path.
- Advanced KYC filter/bulk action.
- Notification delivery.
- Non-critical provider simulation variation.

Mỗi item phải có owner/deadline hoặc được đưa rõ sang backlog; không được ảnh hưởng country isolation, KYC history hoặc Auth.

### NO-GO

Không xây Campaign/Content nếu còn một trong các lỗi:

- Cross-country hoặc cross-user data leak.
- RLS context leak qua connection pool.
- Local/dev auth bật ở production config.
- MFA bypass cho Finance/Global Admin.
- Audit thiếu hoặc ghi PII/secrets.
- KYC document public/không kiểm soát quyền.
- Partial resubmit sửa/ghi đè approved field hoặc mất lịch sử.
- Duplicate submit/provider retry tạo case/submission trùng.
- Concurrent review ghi đè quyết định.
- Migration/seed/verify không tái lập được.

Nếu NO-GO, dùng đầu Tuần 3 để đóng defect; không thêm Product/Campaign lên foundation đang leak hoặc sai ownership.

## 12. P1/Stretch và thứ tự cắt scope

### P1/Stretch Tuần 2

1. Google OAuth thật nếu credential đã sẵn sàng và adapter core Green.
2. TikTok OAuth thật.
3. Email/SMS OTP thật.
4. OCR/document preview nâng cao.
5. eKYC provider thật hoặc auto-decision.
6. Bulk KYC review nâng cao.
7. Advanced queue search/filter/export.
8. Country onboarding wizard bất kỳ.
9. Notification email/push.
10. Full UI localization cho non-critical/admin supporting screens.

### Thứ tự cắt khi trễ

1. Cắt OAuth/eKYC/OTP thật, giữ adapter/mock đầy đủ failure states.
2. Cắt visual polish, animation và document preview.
3. Cắt bulk/advanced filter/export; giữ queue pagination và single review.
4. Thu Country Config UI về form tối thiểu hoặc seed + validated API; giữ audit và authorization.
5. Dịch đầy đủ critical journey; supporting copy dùng fallback EN.
6. Hoãn non-critical provider variation/notification.

Không được cắt:

- Global identity và country-profile ownership.
- API authorization + country-scoped query + RLS defense-in-depth.
- RBAC/MFA cho privileged role.
- Audit safe/transactional.
- Private KYC document access.
- Field-level partial reject/resubmit/history.
- Duplicate/concurrency/provider-timeout behavior.
- Automated cross-country tests và KYC E2E.

## 13. Risk register Tuần 2

| Risk | Trigger | Hành động giảm thiểu/contingency |
|---|---|---|
| OAuth credential chậm | Chưa sẵn trước Ngày 6 | Dùng local/mock provider adapter; không chờ credential |
| Session/cookie integration lỗi | Web/API không giữ session cuối Ngày 6 | Ưu tiên same-origin/reverse-proxy local path; cắt OAuth thật |
| RLS pool context leak | Test VN→PH thấy row cũ | Dừng feature; transaction-local context + runtime role; viết regression trước tiếp tục |
| RBAC chỉ tồn tại ở UI | Direct API vẫn chạy | Parameterized API tests; backend guard là source of truth |
| Audit làm lộ PII | Log có document/bank/tax/OTP | Allowlist safe summary, redaction test, synthetic data only |
| i18n phình scope | Mất nhiều giờ dịch supporting UI | Chỉ dịch critical journey, fallback EN có chủ đích |
| MinIO/upload chậm | Trưa Ngày 9 chưa upload private được | Giữ metadata + storage adapter đơn giản; bỏ preview/OCR |
| KYC schema hard-code VN | Thêm PH cần sửa code | Checklist/config version theo country trước KYC API |
| Day 10 quá tải | Trưa chưa có partial review | Cắt advanced filter/bulk/polish; giữ single review + E2E + isolation |
| Concurrent review mất dữ liệu | Hai Ops approve/reject ghi đè | Optimistic version và conflict test bắt buộc |
| Provider timeout false reject | Unknown bị chuyển Rejected | Tách Unknown/Manual Review; retry idempotent |
| Test flaky do time/OTP | Rerun mới pass | Fake clock, fixed OTP seed/test provider; sửa root cause, không che bằng retry |

## 14. Demo cuối Tuần 2

Thời lượng mục tiêu: 12–15 phút.

1. Global user login và session lifecycle.
2. Tạo VN Country Profile, chọn VI/VND và mở KYC checklist VN.
3. Upload synthetic document, submit KYC.
4. Local Ops VN mở queue, request changes riêng bank field có reason.
5. Creator chỉ sửa bank field, resubmit; Ops approve.
6. Chuyển cùng global user sang PH, hiển thị Filipino/English fallback và PHP.
7. Chứng minh KYC VN không xuất hiện trong PH profile.
8. Dùng Ops VN gọi direct-ID KYC PH và cho thấy bị chặn.
9. Minh họa Finance/Global Admin phải qua MFA.
10. Mở audit trail an toàn cho KYC/config actions.
11. Trình bày automated security/KYC evidence và known limitations.

Không demo bằng dữ liệu giấy tờ, bank hoặc tax thật.

## 15. Handoff sang Tuần 3 — Ngày 11

Next exact action sau Gate G10 `GO`:

1. Tạo schema/migration/API cho Product, Offer, Reward Rule và Campaign dựa trên ERD.
2. Áp dụng ngay country-scoped repository, RLS, RBAC, audit và i18n pattern Tuần 2 cho entity mới.
3. Xây Campaign Builder vertical slice cho Local Admin.
4. Seed product archetype/campaign VN/PH bằng config, không hard-code category/network.
5. Viết activation validation trước khi mở Creator discovery/join.

Trước khi đóng Tuần 2, cập nhật `Plan/00_PROJECT_EXECUTION_LOG.md` với:

- DONE/IN_PROGRESS/NOT DONE thực tế.
- Gate G10: GO, CONDITIONAL GO hoặc NO-GO.
- Feature tracker status và evidence đúng thực tế.
- Kết quả direct-ID/RLS/MFA/KYC E2E tests.
- P0/P1 defects, risk và known limitations.
- Next exact action cho `W3-D11-T01`.
