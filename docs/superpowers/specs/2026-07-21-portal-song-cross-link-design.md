# Thiết kế — "Portal sống": 5 dashboard hoạt động thật + cross-link money spine

> Ngày: 2026-07-21 · Trạng thái: đã brainstorm & duyệt hướng · Phạm vi spec này = **SP-1**.
> SP-2 (Global Admin toàn quyền) ghi ở phụ lục, sẽ có spec riêng.

## 1. Bối cảnh & hiện trạng

Có **2 khu UI**:
- `/mockup` (13 màn) — **nối API thật, đã test** (105/105 API, 17/17 E2E). Đây là engine luồng đang chạy.
- `/portal` (5 dashboard theo vai) — **UI đẹp nhưng TĨNH hoàn toàn**: đọc dữ liệu hardcode từ
  `apps/web/src/mockup/data.ts` (`KYC_QUEUE`, `CONTENT_QUEUE`…), nút chỉ `setActive()` đổi tab,
  **không gọi API, không lưu, không nối màn nào với màn nào**.

Backend + 9 client lib đã phủ trọn money spine:
`auth · kyc · campaign · content · earnings · reconciliation · payout · audit · country`
(tại `apps/web/src/lib/*-client.ts`).

## 2. Mục tiêu & tiêu chí thành công

Biến 5 dashboard `/portal` thành **UI thật, thống nhất**: nút bấm gọi API thật, các màn nối nhau
qua chung một DB. Cụ thể, đạt khi chạy được kịch bản cross-link end-to-end:

> Creator (portal) nộp link content → **link hiện ở Ops (portal)** để duyệt → Ops approve → tạo
> earning PENDING → **hiện ở Finance (portal)** → Finance đối soát + lock → AVAILABLE → payout →
> **tiền về ví Creator (portal)**. Tất cả trong /portal, không nhảy sang /mockup.

**Quyết định hướng (đã chốt):**
- Hợp nhất về /portal; /mockup giữ làm "phòng thí nghiệm luồng", gỡ dần sau.
- Cổng chọn vai → **tự mockLogin ngầm** bằng tài khoản seed (phiên + RBAC thật, bỏ ma sát gõ login).
- Nối kiểu **thin-fetch mỗi dashboard** (đi lại đúng pattern /mockup đã chứng minh) — không dựng
  store/context toàn cục, không chuyển sang RSC (phiên nằm ở localStorage phía client).

## 3. Kiến trúc SP-1

### 3.1 Session bootstrap — `apps/web/src/app/portal/session.ts` (mới)

Bảng vai → tài khoản seed (đã có trong `apps/api/prisma/seed.sql`):

| Vai portal | Email seed | Role thật | Nước |
|---|---|---|---|
| Creator | (tạo/đăng nhập user thường qua mockLogin email demo) | — (user + country profile) | chọn VN/PH |
| Ops | `ops.vn@` / `ops.ph@demo.affiliate.gl` | LOCAL_OPS | khoá theo nước |
| Admin | `admin.vn@` / `admin.ph@demo.affiliate.gl` | LOCAL_ADMIN | khoá theo nước |
| Finance | `finance.vn@` / `finance.ph@demo.affiliate.gl` | LOCAL_FINANCE | khoá theo nước |
| Global Admin | `global.admin@demo.affiliate.gl` | GLOBAL_ADMIN (country_id NULL) | vượt biên giới |

`enterAs(role, market)` → `mockLogin(email)` (tái dùng `auth-client`) → `saveSession` → điều
hướng tới `/portal/<role>`. Staff local: chọn nước = chọn tài khoản seed nước đó.

### 3.2 Mỗi dashboard = client component fetch thật

- On mount: gọi client lib tương ứng, thay mảng hardcode bằng state thật.
- Nút hành động: gọi endpoint thật → **refetch** phần liên quan → UI cập nhật.
- Trạng thái rỗng/tải/lỗi/forbidden xử lý tường minh (các client lib đã trả `{forbidden}` /
  `{unauthorized}` — dùng đúng để hiện thông báo, không crash).
- **Cross-link không cần đẩy thủ công**: chung DB nên Ops fetch queue là thấy content Creator vừa nộp.

## 4. Đặc tả nối từng dashboard (SP-1)

### 4.1 Creator — `apps/web/src/app/portal/creator/page.tsx`
- Dữ liệu: `listCampaigns(market)`, `myParticipations(market)`, `getEarnings(market)`, `getWallet(market)`, `getMyKyc(market)`.
- Nút: **Join** `joinCampaign` · **Nộp link content** `submitContent(market, campaignId, url, caption)` ·
  **Rút tiền** `requestOtp` → `createPayout`. KYC chưa duyệt → chặn Join (đã có cơ chế QĐ-2).
- Sau nộp content → refetch participations (state → CONTENT_SUBMITTED).

### 4.2 Ops — `apps/web/src/app/portal/ops/page.tsx`
- Dữ liệu: `getKycQueue(market)`, `contentQueue(market)` → **hiện link content thật của creator**.
- Nút: **Duyệt/từ chối KYC** `reviewKyc(market, caseId, decisions)` · **Approve/Reject content**
  `reviewContent(...)`. Approve → backend tạo **earning PENDING exactly-once**.
- Sau duyệt → refetch queue (item rời hàng đợi).

### 4.3 Admin — `apps/web/src/app/portal/admin/page.tsx`
- Dữ liệu: `listCampaigns(market)` + participations tổng hợp.
- Nút: **Tạo campaign (builder)** `createCampaign(...)` (title, brand, platform, hashtag, reward,
  slots, reward rule 3 trục). Campaign mới → hiện ở Creator discover.

### 4.4 Finance — `apps/web/src/app/portal/finance/page.tsx`
- Dữ liệu: `listBatches(market)`, `payoutQueue(market)`, `payoutHolds(market)`.
- Nút: **Tạo batch** `createBatch` · **Lock** `lockBatch` (→ earning AVAILABLE) · **Payout**
  `settlePayout(market, id, 'SUCCESS'|'FAIL')` · **Xử lý hold** `resolveHold(market, id, result)`
  (UNKNOWN → giữ tiền). Sau thao tác → refetch → tiền phản ánh về ví Creator.

### 4.5 Global — `apps/web/src/app/portal/global/page.tsx`
- SP-1: nối phần **cấu hình quốc gia** (đọc `country-client`) + audit toàn cục (`audit-client`,
  `listAudit(undefined)` = toàn cục — global.admin có quyền cross-border).
- Phần RBAC + doanh thu tổng: **để SP-2** (chừa chỗ trong nav, hiện "đang phát triển").

## 5. Kịch bản kiểm chứng (E2E mới, /portal)
`apps/web/e2e/portal-cross-link.spec.ts`: enterAs Creator → nộp content → enterAs Ops → thấy link
→ approve → enterAs Finance → thấy earning → batch+lock → payout SUCCESS → enterAs Creator → ví tăng.

## 6. Ngoài phạm vi / cắt (YAGNI)
- SSO/OTP/payment provider: giữ mock như cũ. Không mật khẩu/2FA.
- Real-time push: cắt — refetch sau hành động / khi đổi tab là đủ.
- **i18n VI/EN cho /portal: vẫn hoãn** (đúng "điểm 3" đã defer) — vòng này /portal giữ tiếng Việt.
- Không đập /mockup trong vòng này (gỡ dần sau khi /portal thay thế đủ).

## 7. Rủi ro
- Phiên nằm localStorage: chuyển vai = đổi phiên; phải `saveSession` dứt khoát trước khi điều hướng
  (tránh state phiên cũ). Đã có tiền lệ xử lý ở e2e payout-fail-flow (đổi phiên giữa creator/finance).
- Market coupling: creator/admin/finance khoá đúng nước của phiên; tránh gọi API nước không thuộc quyền → forbidden.

---

## Phụ lục — SP-2: Global Admin toàn quyền (vision, sẽ có spec riêng)

**A. RBAC CRUD** — module backend mới `admin/staff` (guard GLOBAL_ADMIN, **audit mọi thao tác**):
- `GET /admin/staff` (lọc nước / toàn cục) · `POST` tạo staff (email + role + country → upsert
  `app_user` + `role_assignment`) · `PATCH /:id` đổi role · `DELETE /:id` = vô hiệu hóa (gỡ
  role_assignment). Không mật khẩu/2FA (vẫn mock SSO).

**B. Doanh thu tổng đa nước** — `GET /admin/global/revenue`:
- Mỗi nước: gross earnings · phí sàn (`PLATFORM_FEE`) · đã chi payout · net — **bằng tiền bản địa**.
- Thêm cột **quy USD** (tỷ giá tĩnh, ghi chú "demo") + **một dòng tổng USD** duy nhất.
- Nguyên tắc: không cộng thẳng VND+PHP; chỉ tổng sau khi quy về USD, có disclosure.
- UI: thẻ nước cạnh nhau (không gộp) + 1 dòng tổng USD.
