# MA TRẬN TRUY XUẤT YÊU CẦU — Affiliate GLOBAL

> Lập ngày 2026-07-20 (audit độc lập, chỉ đọc — không sửa code).
> Nguồn yêu cầu: `requirements/Book1.xlsx` (= `Plan/docs/Book1.xlsx`, 22 Must + 7 Should) và
> `requirements/Requirements.xlsx` (5 bước mentor). Mọi kết luận đều dẫn file/endpoint/test.
>
> **Quy ước trạng thái** (chỉ dùng đúng các nhãn cho phép):
> Hoàn thành · Có triển khai nhưng chưa hoàn chỉnh · Prototype · Chỉ có tài liệu · Chưa triển
> khai · Không tìm thấy · Không đủ bằng chứng.
>
> **Lưu ý trung thực về test**: các con số "API 88/88, E2E 17/17" là do `Plan/LOG.md` báo cáo.
> Trong audit này em **không tự chạy test** (quy định không đổi DB/hạ tầng). Điều em **xác minh
> trực tiếp**: các file test tồn tại (`apps/api/test/*.ts` = 86 khối `test()` + `money-spine`
> tham số hoá VN/PH; `apps/web/e2e/*.ts` = 17 khối `test()`), và code nghiệp vụ mà chúng phủ.

---

## 1. Nguồn dữ liệu đã đọc (bằng chứng khảo sát)

| Nguồn | Đường dẫn | Ghi chú |
|---|---|---|
| Đề bài gốc | `requirements/Book1.xlsx` Sheet1 A1:F93 | 22 Must + 7 Should + tiêu chí chấm |
| 5 bước mentor | `requirements/Requirements.xlsx` Sheet1 | Bước 1–5 + 4 kỳ vọng năng lực |
| Ảnh yêu cầu (mockup) | `Report/assets/00..12-*.png` | 13 ảnh màn V01–V12 (do người làm render) |
| Kế hoạch | `Plan/KE_HOACH_V2.md` | 20 mốc N1–N20, phạm vi cắt/giữ |
| Nhật ký | `Plan/LOG.md` | Nhật ký N1–N15 có dẫn chứng |
| Product | `docs/PRODUCT.md` | 8 quyết định sản phẩm (QĐ-1..8) |
| Data model | `docs/DATA_MODEL.md` | 18 bảng suy từ mockup |
| Kiến trúc | `docs/ARCHITECTURE.md` | Modular monolith + đường đi lòng tin |
| Q&A mentor | `Report/MENTOR_QA.md` | Bộ hỏi đáp giả lập (đến N10b) |
| Source | `apps/api/src`, `apps/web/src`, `apps/api/prisma` | Xác minh endpoint/model/seed |
| Git | 32 commit, 2026-07-18 → 2026-07-20 | 1 commit/mốc, lịch sử sạch |

---

## 2. Ma trận truy xuất 22 Must + 7 Should

Cột: **BE** backend · **FE** frontend/màn · **DB** schema · **Test** (file test phủ) ·
**Demo** (chạy E2E được). Ký hiệu: ✅ đủ · 🟡 một phần · ❌ chưa · ➖ không áp dụng.

### A. CORE PLATFORM

| Mã | Yêu cầu (Book1) | Ưu tiên | BE | FE | DB | Test | Demo | Kết luận | Bằng chứng |
|---|---|---|:--:|:--:|:--:|:--:|:--:|---|---|
| CP-01 | Cấu hình theo quốc gia (Global Admin sửa nước) | Must | 🟡 | 🟡 | ✅ | 🟡 | 🟡 | **Chưa hoàn chỉnh** | `CountryConfig` + seed VN/PH (tax 10/8, min_payout, feature_kyc/payout/cps) `apps/api/prisma/seed.sql`; đọc config qua `markets.service.ts`. **Ghi/sửa config bởi Global Admin = mockup tĩnh** `mockup/admin/config/page.tsx`, chưa có endpoint ghi. |
| CP-02 | Cách ly dữ liệu theo country | Must | ✅ | ✅ | ✅ | ✅ | ✅ | **Hoàn thành** | `auth/rbac.ts` `assertStaffForCountry`; cross-country 404 test ở `kyc/content/campaign/reconciliation/payout.smoke.test.ts`; nguyên tắc "đường đi lòng tin" `docs/ARCHITECTURE.md §3`. |
| CP-03 | Điều hướng /vn /ph | Must | ✅ | ✅ | ✅ | ✅ | ✅ | **Hoàn thành** | `apps/web/src/app/[market]/page.tsx` + `lib/market-context.ts`; `markets.controller.ts` `GET :market/context`; `e2e/market-round-trip.spec.ts`; `/xx` → 404 kiểm soát. |
| CP-04 | Identity global + hồ sơ theo country | Must | ✅ | ✅ | ✅ | ✅ | ✅ | **Hoàn thành** | `CreatorCountryProfile` UNIQUE(user,country); `country/profile.*`; `country-profile.smoke.test.ts`. |
| CP-05 | Đa ngôn ngữ (i18n) + fallback | Must | ➖ | 🟡 | ✅ | ❌ | 🟡 | **Chưa hoàn chỉnh** | Cơ chế đủ: `lib/i18n.ts` `langFromLocale/t/fallback` + `formatMoney` theo locale; **từ điển chỉ 7 key `country.*`**, phần lớn chuỗi UI hardcode tiếng Việt; Filipino (fil) rơi về en. Kế hoạch N16. |
| CP-06 | Hiển thị & chọn tiền tệ (local + USD tham chiếu) | Must | ➖ | 🟡 | ✅ | ❌ | 🟡 | **Chưa hoàn chỉnh** | Tiền local đúng: `formatMoney` VND exp0/PHP exp2; USD tham chiếu có helper tĩnh `mockup/data.ts toUsdReference` (rate mock "demo only"). **Nút chọn USD/local ở màn thật chưa nối**; rút tiền theo local (đúng). |
| CP-07 | Tỷ giá tham chiếu realtime | **Should** | ❌ | ❌ | ➖ | ❌ | ❌ | **Chưa triển khai (cắt có công bố)** | Chỉ bảng tỷ giá tĩnh; `PRODUCT.md §5` công bố mock. Should → hoãn hợp lệ. |
| CP-08 | Tính thuế theo country (Gross–Tax–Net) | Must | ✅ | ✅ | ✅ | ✅ | ✅ | **Hoàn thành** | `country_config.tax_percent` 10/8; `earnings.service.ts` tính net=gross−tax (BigInt floor); V07 `mockup/creator/earnings`; `earnings.smoke.test.ts`. |
| CP-09 | Feature flag rollout % theo country | **Should** | 🟡 | ❌ | 🟡 | ❌ | ❌ | **Chưa hoàn chỉnh (Should)** | Có cờ bật/tắt ở cột (`feature_kyc/payout/cps` trong `country_config`), **không có rollout %** cũng không có UI bật/tắt runtime. Should → chấp nhận. |

### B. ADMIN

| Mã | Yêu cầu (Book1) | Ưu tiên | BE | FE | DB | Test | Demo | Kết luận | Bằng chứng |
|---|---|---|:--:|:--:|:--:|:--:|:--:|---|---|
| AD-01 | Đăng nhập & RBAC (MFA cho Finance/Global) | Must | ✅ | ✅ | ✅ | ✅ | ✅ | **Hoàn thành (lõi); MFA-admin thiếu** | `auth/*` mock-login+session; `rbac.ts` 4 vai (LOCAL_OPS/FINANCE/ADMIN, GLOBAL); RBAC 403 test rải khắp. **MFA/OTP mới áp cho payout creator**, chưa áp login admin. |
| AD-02 | Audit trail | Must | ❌ | ❌ | ✅ | ❌ | ❌ | **Chưa triển khai (chỉ schema)** | Model `AuditEvent` tồn tại (`schema.prisma`) nhưng **không có lệnh ghi audit nào** trong `apps/api/src` (grep 0 hit ngoài code sinh). Chữ "audit" ở web chỉ là nhãn mockup. Kế hoạch N17. |
| AD-03 | Duyệt nội dung E2E (queue, lý do, hàng loạt) | Must | ✅ | ✅ | ✅ | ✅ | ✅ | **Hoàn thành (lõi); thao tác hàng loạt thiếu** | `content.controller.ts` queue+review (approve/reject có lý do); claim `WHERE state=SUBMITTED` chống 2 Ops; `content.smoke.test.ts` (12); `e2e/content-flow`. **Bulk/hàng loạt chưa có** (xử lý từng item). |
| AD-04 | Duyệt KYC E2E theo từng field | Must | ✅ | ✅ | ✅ | ✅ | ✅ | **Hoàn thành** | `kyc.controller.ts` queue + review theo field; reject bắt lý do; `kyc.smoke.test.ts` (9); `e2e/kyc-flow`. |
| AD-05 | Quản trị creator (suspend/ban) | **Should** | ❌ | ❌ | ➖ | ❌ | ❌ | **Chưa triển khai (Should)** | Không tìm thấy endpoint/màn suspend/ban. Should → hoãn. |
| AD-06 | Đối soát E2E (batch→lock→xuất file) | Must | ✅ | ✅ | ✅ | ✅ | ✅ | **Hoàn thành (lõi); export/anomaly thiếu** | `reconciliation.*` create batch (gom PENDING) → lock → AVAILABLE; UNIQUE(earning_id) 1 earning/batch; `reconciliation.smoke.test.ts` (7); `e2e/reconciliation-flow`. **Xuất file + phát hiện bất thường chưa có.** |
| AD-07 | Chốt tỷ giá & chi trả (payout, xử lý failed) | Must | ✅ | ✅ | ✅ | ✅ | ✅ | **Hoàn thành (lõi); chốt tỷ giá thiếu** | `payout.service.ts` OTP+reserve+3 kết cục (PAID/FAIL→hoàn 1 lần/UNKNOWN→giữ)+resolveHold; `payout.smoke.test.ts` (15)+`money-spine.test.ts`; `e2e/payout-flow`,`payout-fail-flow`. **"Chốt tỷ giá cho batch" chưa có** (gắn CP-07). |
| AD-08 | Báo cáo tài chính cơ bản | **Should** | ❌ | ❌ | ➖ | ❌ | ❌ | **Chưa triển khai (Should)** | Không có dashboard doanh thu confirmed/estimated. Should → hoãn. |
| AD-09 | Quản trị campaign & ngân sách | Must | ✅ | ✅ | ✅ | ✅ | ✅ | **Hoàn thành (lõi); đa ngữ/analytics/export thiếu** | `campaign.controller.ts` builder POST (RBAC LOCAL_ADMIN); budget=slots×price suy ra; `reward_rule` 3 trục; `campaign.smoke.test.ts` (11); `e2e/campaign-flow`. **Campaign đa ngôn ngữ + analytics + export chưa có**; `PENDING_FUNDING` mới thiết kế. |
| AD-10 | Global Admin dashboard toàn cục | **Should** | ❌ | 🟡 | ➖ | ❌ | ❌ | **Chưa triển khai (Should)** | Chỉ mockup config V09; không có dashboard all-countries thật. Should → hoãn. |

### C. CREATOR

| Mã | Yêu cầu (Book1) | Ưu tiên | BE | FE | DB | Test | Demo | Kết luận | Bằng chứng |
|---|---|---|:--:|:--:|:--:|:--:|:--:|---|---|
| CR-01 | Đăng nhập SSO (TikTok/Google) | Must | ✅ | ✅ | ✅ | ✅ | ✅ | **Hoàn thành (mock có công bố)** | `auth/mock-login` upsert user+session; `lib/auth-client.ts`; V01 login; `e2e/creator-login`. SSO thật = mock đúng định dạng (đề bài cho phép). |
| CR-02 | Onboarding country profile + chuyển nước | Must | ✅ | ✅ | ✅ | ✅ | ✅ | **Hoàn thành** | `country/profile.*` upsert theo phiên; V02 chọn/đổi nước; `country-profile.smoke.test.ts`. |
| CR-03 | i18n + tiền hiển thị (USD/local) | Must | ➖ | 🟡 | ✅ | ❌ | 🟡 | **Chưa hoàn chỉnh** | Như CP-05/CP-06 — cơ chế có, phủ chuỗi mỏng, nút chọn tiền chưa nối. |
| CR-04 | KYC theo checklist (upload, bank/tax, sửa đúng phần) | Must | ✅ | ✅ | ✅ | ✅ | ✅ | **Hoàn thành (lõi); upload file thật mock** | `kyc.service.ts` 4 field, nộp lại chỉ field chưa duyệt, ACCEPTED khoá; V03; `e2e/kyc-flow`. **Upload giấy tờ/ký hợp đồng là field text mock** (đề bài cho phép). |
| CR-05 | Khám phá & join campaign + My Campaigns | Must | ✅ | ✅ | ✅ | ✅ | ✅ | **Hoàn thành** | `campaign.controller` discover/detail; `join.service.ts` `FOR UPDATE` race-safe + snapshot + KYC-gate + waitlist; `join.smoke.test.ts` (10, gồm RACE); `e2e/join-flow`,`waitlist-flow`. **Hashtag cá nhân = hashtag campaign** (chưa cá nhân hoá per-creator). |
| CR-06 | Nộp & theo dõi content (kiểm link/hashtag/platform, resubmit) | Must | ✅ | ✅ | ✅ | ✅ | ✅ | **Hoàn thành** | `content.service.ts` chặn sai nền tảng, cờ hashtag, chuỗi attempt/supersedes; V06; `e2e/content-flow`. |
| CR-07 | Thu nhập & minh bạch thuế | Must | ✅ | ✅ | ✅ | ✅ | ✅ | **Hoàn thành** | `earnings.service.ts` Gross/Tax/Net + trạng thái PENDING/AVAILABLE/PAID + ledger view; V07; `e2e/earnings-flow`. |
| CR-08 | Rút tiền E2E (OTP, lỗi→hoàn về balance + lý do) | Must | ✅ | ✅ | ✅ | ✅ | ✅ | **Hoàn thành** | `payout.service.ts` wallet+OTP+request+status; FAIL→`PAYOUT_RELEASE` hoàn đúng 1 lần; V08; `e2e/payout-fail-flow`. |
| CR-09 | Profile & liên kết social | **Should** | ❌ | ❌ | 🟡 | ❌ | ❌ | **Chưa triển khai (Should)** | `social_profile` mới thiết kế ở QĐ-6, chưa code. Should → hoãn. |
| CR-10 | Thông báo push cốt lõi | **Should** | ❌ | ❌ | ➖ | ❌ | ❌ | **Chưa triển khai (Should, cắt)** | `PRODUCT.md §5` công bố cắt. Should → hoãn. |

---

## 3. Tổng hợp đếm

### 22 Must

| Mức | Số | Danh sách |
|---|---:|---|
| ✅ Hoàn thành (lõi chạy + test/E2E phủ) | **17** | CP-02, CP-03, CP-04, CP-08, AD-01, AD-03, AD-04, AD-06, AD-07, AD-09, CR-01, CR-02, CR-04, CR-05, CR-06, CR-07, CR-08 |
| 🟡 Chưa hoàn chỉnh | **4** | CP-01, CP-05, CP-06, CR-03 |
| ❌ Chưa triển khai | **1** | AD-02 (audit trail — chỉ schema) |

> Lưu ý: 8/17 mục "Hoàn thành" còn thiếu chi tiết **thứ cấp** (MFA-admin, bulk-action,
> export/anomaly, chốt-tỷ-giá, đa-ngữ-campaign, hashtag-cá-nhân, upload-file-thật). Đây là
> phần "hoàn thiện thêm", không phải "chưa có luồng"; luồng lõi của từng mục đều chạy E2E.

### 7 Should

| Mức | Số | Danh sách |
|---|---:|---|
| 🟡 Một phần | 1 | CP-09 (cờ bật/tắt cột, chưa rollout %) |
| ❌ Chưa triển khai (hoãn hợp lệ) | 6 | CP-07, AD-05, AD-08, AD-10, CR-09, CR-10 |

---

## 4. 5 bước mentor (Requirements.xlsx) ↔ hiện trạng

| Bước | Yêu cầu | Trạng thái | Bằng chứng |
|---|---|---|---|
| 1 | Product mockup ("suy nghĩ rất kỹ") | ✅ Hoàn thành | 12 màn V01–V12 `apps/web/src/app/mockup/*` + `docs/PRODUCT.md` (8 QĐ) |
| 2 | Thiết kế database ("hiểu sâu") | ✅ Hoàn thành | `docs/DATA_MODEL.md` 18 bảng + `schema.prisma` + 3 migration |
| 3 | Thiết kế kiến trúc | ✅ Hoàn thành | `docs/ARCHITECTURE.md` (vì sao monolith, đường đi lòng tin) |
| 4 | Backend API + frontend (coding) | ✅ Hoàn thành (lõi) | 12 nhóm endpoint + web nối API thật; 17 E2E |
| 5 | Setup hạ tầng dưới máy | 🟡 Một phần | `compose.yaml` (Postgres), README chạy tay; **Docker hoá API/Web + one-command up chưa có** (kế N18) |
| — | Biết ưu tiên gì trước + vì sao | ✅ | `KE_HOACH_V2.md §2` (spine dọc trước breadth) |
| — | Chỉ rõ bài toán phức tạp + thiết kế giải | ✅ | 7 bài toán khó neo vào code (`join FOR UPDATE`, exactly-once, payout 3 trạng thái…) |
| — | Dữ liệu mock | ✅ | SSO/eKYC/OTP/payment/FX đều mock có công bố |
| — | Hiểu sâu để hỏi đáp | 🟡 | `Report/MENTOR_QA.md` (mới tới N10b); `docs/HARD_PROBLEMS.md` **chưa có** (kế N19) |
