# LOG — đọc file này trước, đừng đọc lại toàn bộ project

> Mục đích: phiên làm việc mới nắm trạng thái trong vài giây. Cập nhật sau mỗi mốc lớn.
> Nếu file này mâu thuẫn với code/docs thực tế → tin thực tế, sửa lại file này.

## Trạng thái ngay bây giờ (2026-07-18)

- **Đang chạy KẾ HOẠCH V2** (`Plan/KE_HOACH_V2.md` — plan duy nhất, 4 tuần N1-N20).
  Toàn bộ plan cũ (7 file) + docs cũ (~25 file) đã xóa có chủ đích; lịch sử trong git.
- Lý do làm lại: bộ cũ do AI sinh quá nhiều, không giải thích nổi khi mentor hỏi đáp.
  V2 = gọn + hiểu sâu: 5 docs mỏng, schema lean ~16 bảng, brainstorm trước code sau.
- **Xong Tuần A (N1-N5) + N6-N9 + N10 core**: schema lean (20 model) + auth/session/login +
  country + i18n + KYC + Campaign + **Join race-safe (FOR UPDATE) + snapshot + KYC-gate + My
  Campaigns**. Spine tới trình duyệt: login→chọn nước→KYC→Approved→**join campaign (không
  oversell)**. **API 41/41, E2E 11/11**. Đang Tuần B. Kế: N10b (thu hồi suất + waitlist) → hết Tuần B.
- Code hiện có: walking skeleton chạy trên **schema mới 18 bảng** (Next.js `/vn` `/ph` →
  NestJS → Postgres). Schema 45 bảng cũ **ĐÃ XÓA & thay** bằng lean N5 (migration
  `20260718095722_init_lean_18_tables`, DB có 20 base table gồm _prisma_migrations).
- Git: `main`; mốc: `aaa7b88` (tuần 1 ngày 1-4 cũ) → `08fd74e` (checkpoint trước V2) → các
  commit V2 sau đó.

## Tổng kết Tuần A — Product & Database (N1-N5) ✅ XONG

Mục tiêu Tuần A: từ đề bài → hiểu sản phẩm → vẽ màn hình → suy ra dữ liệu → schema thật chạy được.

| Ngày | Làm gì | Đầu ra chạm được | Giải thích 1 câu cho mentor |
|---|---|---|---|
| **N1** | Chốt Product | `docs/PRODUCT.md` + plan V2 | 3 QĐ nền: reward content-flat, KYC-tại-Join, budget = suất×giá |
| **N2** | Mockup Creator 8 màn | `/mockup/creator/*` | Màn hình cho biết dữ liệu nào PHẢI tồn tại — thiết kế DB từ nhu cầu thật |
| **N3** | Mockup Staff 4 màn | `/mockup` (V09-V12) | Reward 3 trục SỐNG trong UI; payout 3 trạng thái; đối soát khoá batch |
| **N4** | ERD từ mockup | `docs/DATA_MODEL.md` (18 bảng) | Mỗi bảng có màn nào cần + unique key chống bug gì |
| **N5** | Schema thật | `schema.prisma` 18 bảng + migrate + seed | Xoá 45 bảng cũ; DB lean chạy được, /vn /ph xanh |

**3 quyết định sản phẩm (QĐ-1/2/3)** và **7 bài toán khó** đã neo vào schema:
`earning.submission_id` (exactly-once), `participation(profile,campaign)` (join idempotent),
`payout_attempt.provider_ref` (không double-pay), `ledger_entry` append-only, snapshot ở
`participation`, `row_version` (409), `country_id` + `role_assignment` (cách ly).

**Trạng thái kỹ thuật cuối Tuần A**: lint/typecheck/build sạch · API 4/4 · E2E 4/4 · DB 20
bảng seed VN/PH · git tới `5c3b487`. Câu tự kiểm để qua tuần: *"chỉ vào bất kỳ bảng nào, nói
được màn nào cần nó + unique nào chống bug gì trong 10 giây"* → tài liệu `DATA_MODEL.md` §2+§4.

## Sự cố cần nhớ

- **Book1.xlsx từng bị mất khỏi đĩa và CHƯA TỪNG có trong git** (phát hiện 2026-07-18 khi dọn
  repo). Đã khôi phục từ bản giải nén trong scratchpad (10/10 file XML, 187 strings + 93 rows
  khớp nguyên bản) và commit vào git ngay sau đó. Bài học: file nguồn quan trọng phải vào git
  ngay, đừng để untracked.

## Đọc gì khi cần

| Cần biết | Đọc |
|---|---|
| Kế hoạch, lịch, phạm vi, bài toán khó | `Plan/KE_HOACH_V2.md` |
| Đề bài gốc | `Plan/docs/Book1.xlsx` (xlsx = zip; unzip rồi parse XML bằng node — không cần Excel) |
| Product/personas/luồng | `docs/PRODUCT.md` (tạo tại N1) |
| Data model + vì sao | `docs/DATA_MODEL.md` (N4) |
| Kiến trúc | `docs/ARCHITECTURE.md` (N6) |
| Q&A hỏi đáp mentor | `docs/HARD_PROBLEMS.md` (N19) |
| Cách chạy | `README.md` |

## Gotcha kỹ thuật — đừng debug lại từ đầu

1. **Prisma 7** (`prisma-client` generator, esm): bắt buộc `new PrismaClient({ adapter: new PrismaPg({ connectionString }) })` — xem `apps/api/src/prisma.service.ts`.
2. **Generated client là ESM `.ts`** → API chạy qua `tsx` (`pnpm dev`/`start` trong apps/api), không chạy `node dist/main.js`.
3. **NestJS DI vỡ dưới tsx/esbuild** (không emit decorator metadata) → mọi constructor param phải `@Inject(Token)` tường minh.
4. **`pnpm` không có trên PATH** → luôn `corepack pnpm`; script lồng trong package.json cũng phải ghi `corepack pnpm`.
5. **Cảnh báo "No projects matched the filters" khi `pnpm --filter`** = noise vô hại do tên thư mục có `(GLOBAL)`, lệnh vẫn chạy đúng.
6. **`.env` bị gitignore** → mất là mất luôn password volume Postgres cũ (`P1000` khi lệch). Hỏi user trước khi `docker compose down -v`.
7. **`apps/api` tự nạp `.env`** qua `src/load-env.ts` (import đầu trong main.ts + test) → `dev:api`/`dev:web`/`pnpm test` không cần source env; riêng `db:*` (prisma CLI) vẫn cần.
8. **`git rm` nhiều pathspec: 1 cái sai = abort cả cụm** — tách lệnh khi xóa hàng loạt.
9. **`Cannot find module './xxx.js'` HOẶC `Internal Server Error` ở localhost:3000** = `.next`
   bị `next build` (production) ghi đè, hoặc bị xóa, **trong khi `next dev` đang chạy** → runtime
   dev mất chunk. **Đừng `pnpm build` (và đừng xóa `.next`) khi dev server web đang chạy.** Fix:
   kill process web dev (`Stop-Process -Id <pid> -Force`; tìm pid bằng `netstat -ano | grep :3000`)
   → `Remove-Item -Recurse -Force apps/web/.next` → chạy lại `corepack pnpm dev:web`. Nếu cần
   build để verify, làm khi dev server tắt, hoặc restart dev sau khi build.

## Nhịp cập nhật

Mỗi ngày N: 1 dòng bên dưới (ngày, việc chính, kết quả, việc kế). Mỗi mốc lớn: sửa mục
"Trạng thái ngay bây giờ".

## Nhật ký N1-N20

- **N1 (2026-07-18)**: Chốt plan V2; commit checkpoint `08fd74e`; dọn repo (xóa 7 plan cũ +
  docs cũ + 5 scripts); khôi phục + commit Book1.xlsx; viết `KE_HOACH_V2.md` + LOG mới.
  Brainstorm xong `docs/PRODUCT.md` — Quang chốt 3 QĐ nền móng: (1) reward = content-flat
  không CPS, (2) KYC gate tại Join, (3) budget = số suất × đơn giá. Kế: N2 mockup Creator 8 màn.
- **Refine reward model (sau trao đổi mentor 17/07)**: mentor chỉ điểm "cấn" giữa trả-theo-view
  và ngân sách cố định. Chốt (Quang): CORE = `CONTENT_APPROVED + FLAT`; thiết kế `reward_rule`
  **tổng quát 3 trục** (trigger / pricing / cap) để view-gate & CPS là config/model-only chừa
  đường. Insight phòng thủ: "view làm cổng điều kiện, không làm hệ số nhân → ngân sách không vỡ".
  Đã ghi đầy đủ vào `docs/PRODUCT.md` QĐ-1 + mục 6 (câu hỏi mentor). Áp vào schema ở N4-N5.
- **N2 (2026-07-18)**: Dựng mockup 8 màn Creator (V01-V08) BẰNG Next.js trong `apps/web`
  (không tạo HTML rời — giữ đồng nhất kiến trúc Ngày 1, tái dùng được ở N6+). Không thêm thư
  viện: dùng React `useState` + CSS Module (built-in). Cấu trúc: `apps/web/src/mockup/`
  (data.ts mock + helper tiền minor-units, ui.tsx shared client components, mockup.module.css);
  `apps/web/src/app/mockup/` (index + creator/{login,country,kyc,discover,campaign,submit,
  earnings,wallet}). Mỗi màn: thanh chọn state (happy/loading/error/reject...), banner ngữ
  cảnh country, và callout "màn này trả lời câu hỏi gì" — nhúng luôn 7 bài toán khó vào UI để
  demo Q&A. typecheck+lint+build sạch, 8 route render 200, tiền VND/PHP format đúng. Truy cập:
  `/mockup`. Kế: N3 mockup Admin/Ops/Finance 4 màn + nối 2 luồng click.
- **N3 (2026-07-18)**: Dựng 4 màn Staff (V09-V12): admin/config (Global Admin cấu hình nước,
  vai duy nhất vượt biên giới), ops/review (hàng đợi KYC+content, approve/reject có lý do, xung
  đột 409), admin/campaign-builder (3 trục reward SỐNG trong UI: content-flat enabled,
  view-gate/CPS khoá kèm note "chừa đường"; ngân sách = suất×đơn giá tự tính), finance/workbench
  (đối soát → khoá batch immutable → payout 3 trạng thái paid/fail-hoàn/unknown-giữ). Tái dùng
  data.ts/ui.tsx/css của N2. Index `/mockup` thêm mục Staff + 2 kịch bản click xuyên màn (happy:
  Join→content→Ops duyệt→earning→Finance khoá→rút; reject: nộp→Ops từ chối→sửa→duyệt).
  typecheck+lint+build sạch, 12 route render 200. Xong toàn bộ mockup (Tuần A phần Product).
  Kế: N4 — từ mockup suy ra ERD lean ~16 bảng (`docs/DATA_MODEL.md`), áp reward_rule 3 trục.
- **Fix sau N3 (2026-07-18)**: (1) V11 chữ 3 trục bị chìm → chuyển `.opt` sang layout cột,
  tách label/note, brighten note. (2) Lỗi chọn quốc gia: `/vn`,`/ph` crash khi chưa chạy API
  → `fetchMarketContext` trả union 3 kết cục (ok/not-found/api-unreachable), trang hiện thông
  báo "API chưa sẵn sàng + cách chạy dev:api" thay vì crash. (3) Hydration mismatch do extension
  trình duyệt chèn attr vào `<html>` → thêm `suppressHydrationWarning`. (4) Làm rõ **Core
  Platform KHÔNG phải persona** mà là tầng nền (CP-01..08) — ghi vào `PRODUCT.md` mục 2 + chỉ
  ra nó "sống" ở đâu trong mockup. E2E 4/4 xanh (API up), /vn êm khi API down.

- **N4 (2026-07-18)**: Suy ERD lean **18 bảng** TỪ 12 màn mockup → `docs/DATA_MODEL.md`. Mỗi
  bảng: vì sao tồn tại (màn nào cần) + unique key chống bug gì. 6 nhóm: A danh tính/nền nước
  (users, countries, country_configs, role_assignments), B onboarding (creator_country_profiles,
  kyc_cases, kyc_fields), C campaign (campaigns, reward_rules 3 trục, participations+snapshot),
  D content (submissions +version/supersedes), E tiền (earnings UNIQUE submission_id,
  ledger_entries append-only, reconciliation_batches/lines, payout_requests, payout_attempts),
  F cắt-ngang (otp_codes, audit_events). Có bản đồ bảng→màn + bảng 7-bài-toán-khó-neo-vào-đâu
  + mục "cố ý KHÔNG mô hình hóa" (brands/fx/notif). CHƯA code schema (đó là N5). Kế: N5 viết
  schema.prisma mới 18 bảng, xóa 45 bảng cũ, migrate DB rỗng + seed.

- **N5 (2026-07-18)**: Viết lại `schema.prisma` từ đầu = **18 bảng lean** (+audit) đúng
  DATA_MODEL.md, xóa schema 45 bảng + 3 migration cũ. Wipe DB (DROP SCHEMA public) → `migrate
  dev` tạo migration mới `init_lean_18_tables` → seed VN/PH (countries + country_configs:
  tax 10/8, minPayout, feature flags). Chỉnh `markets.service.ts`: locale/fallback về
  `countries`, config 1:1 (`include:{config:true}`) thay vì list versioned — response 8-field
  giữ NGUYÊN nên web/e2e không đổi. Kết quả: lint/api-typecheck/web-typecheck/build sạch, API
  smoke 4/4, **E2E 4/4** (/vn=VND/vi-VN, /ph=PHP/fil-PH đọc từ DB mới), DB 20 base table.
  3 unique trụ cột đã vào schema: `earning.submission_id`, `participation(profile,campaign)`,
  `payout_attempt.provider_ref`. Kế: N6 ARCHITECTURE.md + auth mock SSO + session.

- **N6 (2026-07-19)**: Mở màn Tuần B. (1) Viết `docs/ARCHITECTURE.md` 1 trang — modular
  monolith (vì sao KHÔNG microservices: bài toán tiền cần transaction 1 DB), sơ đồ module,
  "đường đi của lòng tin" (server không tin danh tính/vai/nước từ client). (2) Auth mock SSO +
  session THẬT: thêm bảng `sessions` (migration `add_session`), `apps/api/src/auth/*` —
  `auth.service.ts` (mockLogin upsert user + cấp session, resolveSession, logout),
  `session-auth.guard.ts` + `current-auth.decorator.ts`, `auth.controller.ts` (POST
  /auth/mock-login · GET /auth/me · POST /auth/logout). Session lưu DB (sha256 token) thay JWT
  để thu hồi tức thì. Mở rộng `PrismaClientLike` (user/session delegate). Kết quả: lint/api-
  typecheck/api-build sạch, **API 9/9** (5 auth + 4 market), login→me→logout→me-401 chạy thật
  trên DB. Kế: N7 country context end-to-end (route→session→query scoped) + i18n + web login UI.

- **N7 phần 1 — web login nối API thật (2026-07-19)**: Sếp báo nút Google/TikTok ở V01 bấm
  không đăng nhập được (vì mockup N2 là hình tĩnh, chưa nối auth N6). Đã tạo
  `apps/web/src/lib/auth-client.ts` (mockLogin/fetchMe/save·load·clearSession qua
  `NEXT_PUBLIC_API_BASE_URL`, token ở localStorage) và nối `mockup/creator/login/page.tsx`:
  nút SSO gọi `/auth/mock-login` THẬT → tạo user+session trong DB → hiện card "Đã đăng nhập"
  + email + nút Đăng xuất. Thêm E2E `creator-login.spec.ts`. Kết quả: web typecheck + lint
  sạch, **E2E 5/5** (thêm login), DB xác nhận có user `creator.google@demo.affiliate.gl` +
  session active. Kế N7 phần 2: chọn nước → tạo `creator_country_profiles` gắn phiên → query
  scope theo country phiên + i18n.

- **N7 phần 2 — country context end-to-end + i18n (2026-07-19)**: API module `country/`
  (guarded bằng `SessionAuthGuard`): `POST /me/country/:market` upsert `creator_country_profiles`
  gắn **user của phiên** (userId từ session, KHÔNG từ client) — idempotent nhờ UNIQUE(user,
  country); `GET /me/countries` chỉ trả hồ sơ của chính phiên. Route `:market` là ý định, hồ sơ
  cột vào session → minh hoạ bài toán #1. Web: `lib/country-client.ts` + rewire màn V02 (bỏ
  StateBar demo, thành màn thật: needLogin/loading/ready) gọi API thật, hiện context từ DB +
  format tiền theo locale. Nền i18n `lib/i18n.ts` (vi/en + fallback + `formatMoney` theo locale).
  Kết quả: **API 14/14**, **E2E 7/7** (thêm: chọn VN tạo profile thật + hiện `500.000 ₫`;
  country yêu cầu login), typecheck/lint/build sạch. Kế: N8 module KYC (creator nộp → Ops
  duyệt/từ chối theo field → nộp lại).

- **N8 — module KYC (2026-07-19)**: API `kyc/` — creator: `GET/POST /me/country/:market/kyc`
  (get-or-create case + 4 field checklist; nộp/nộp lại chỉ field CHƯA duyệt, ACCEPTED bị khoá kể
  cả khi client cố ghi đè); Ops: `GET /ops/:market/kyc/queue` + `POST /ops/:market/kyc/:caseId/review`
  (duyệt/từ chối THEO TỪNG FIELD, reject bắt buộc lý do; all ACCEPTED→APPROVED, còn lại→REJECTED).
  RBAC + cách ly ở `auth/rbac.ts` (`assertStaffForCountry`): Ops chỉ nước mình; Ops PH mở case
  VN→404; creator vào queue→403. Seed 2 Ops demo (`ops.vn@`/`ops.ph@demo.affiliate.gl` +
  role_assignment LOCAL_OPS) → "đăng nhập vai Ops" = mock-login bằng email đó. Web: `lib/kyc-client.ts`
  + rewire V03 (form thật, khoá/mở field theo trạng thái) + V10 (Ops queue + duyệt theo field,
  nút đăng nhập vai Ops; content queue vẫn mock→N11). Kết quả: **API 23/23**, **E2E 8/8** (thêm
  luồng KYC end-to-end: creator nộp→Ops duyệt→creator thấy Approved), typecheck/lint/api-build sạch.
  Kế: N9 campaign (admin tạo/builder + creator discover theo nước).

- **N9 — module Campaign (2026-07-19)**: API `campaign/` — `GET /markets/:market/campaigns`
  (discover, lọc theo nước), `GET .../:id` (detail, 404 nếu campaign không thuộc nước → cách ly),
  `POST .../campaigns` (builder, cần LOCAL_ADMIN nước đó). reward_rule 3 trục Phase-1 khoá cứng
  CONTENT_APPROVED+FLAT+SLOTS_X_PRICE; **budgetCap = suất×đơn giá suy ra**; "Đầy" = slotsLeft≤0
  **suy ra, không lưu**; currency ép theo nước; tiền BigInt→Number khi ra JSON. Seed 2 Admin demo
  (`admin.vn@`/`admin.ph@` + LOCAL_ADMIN) + 5 campaign VN/PH + reward_rules. Web: `lib/campaign-client.ts`
  + rewire V04 discover (list thật + badge Đầy) + V05 detail (đọc ?id, hiện 3 trục + budget; Join
  để N10) + V11 builder (đăng nhập vai Admin → tạo thật, 3 trục khoá). Kết quả: **API 34/34**
  (thêm 11: isolation discover/detail, RBAC admin-only, cross-country 403, builder tạo→discover),
  **E2E 10/10** (thêm discover + builder). Gotcha test: dùng tên/email unique mỗi run (hàng đợi
  KYC + campaign tích luỹ giữa các lần chạy) + locator scoped `[data-creator]`. Kế: N10 Join
  (idempotent giữ suất + snapshot điều khoản + chặn khi KYC chưa APPROVED).

- **N10 core — Join race-safe + snapshot + KYC-gate (2026-07-19)**: Migration `join_slots_waitlist`
  (campaigns.ends_at; participations: state EXPIRED/WAITLISTED, submit/fix_deadline_at, waitlisted_at,
  strike_count; snapshot_* thành nullable). API `campaign/join.service.ts` + `join.controller.ts`:
  `POST /markets/:market/campaigns/:id/join` chạy trong **$transaction + `SELECT campaign FOR UPDATE`**
  (serial-hóa) → check joinable/KYC-APPROVED/strike/sức-chứa → tạo participation JOINED + **snapshot
  điều khoản** + hạn nộp 48h + tăng slots_taken (tất cả trong khóa). **Không oversell** (UNIQUE
  profile+campaign + đếm trong khóa). Mã lỗi có kiểu: SLOT_FULL/KYC_REQUIRED/CAMPAIGN_NOT_JOINABLE/
  JOIN_BLOCKED_STRIKE. `/leave` trả suất; `GET /me/country/:market/participations` (My Campaigns).
  Web: `campaign-client` join/leave/mine + V05 nút Join thật (thông báo lỗi theo mã) + màn mới
  `/mockup/creator/my-campaigns` (deadline + rời suất) + link ở discover. **API 41/41** (thêm 7 join:
  KYC-gate, snapshot, idempotent, leave, My Campaigns, **RACE 3 người tranh 1 suất → đúng 1 thắng
  2 SLOT_FULL, slotsLeft=0**), **E2E 11/11** (thêm join-flow). typecheck/lint/api-build sạch.
  slots_taken làm bộ đếm quyền uy (tăng/giảm trong khóa); "Đầy" vẫn suy ra (>=slots_total).
  Kế: **N10b** — worker thu hồi suất (QĐ-4) + waitlist tự đôn (QĐ-5) + strike active + gợi ý campaign.

## Current State & Hand-off (cập nhật trước compact — 2026-07-18)

**1. Vừa xong / trạng thái:**
- Xong hết **Tuần A (N1-N5)**: PRODUCT.md + 12 màn mockup + DATA_MODEL.md + **schema lean 18 bảng đã migrate + seed**.
- Reward model chốt: CORE = `CONTENT_APPROVED + FLAT`, bảng `reward_rule` 3 trục (trigger/pricing/cap) — view-gate & CPS là config/model-only. Đã vào schema thật.
- Toàn xanh: lint/typecheck/build + API 4/4 + E2E 4/4. DB Postgres healthy, 20 base table, seed VN/PH configs.
- Không có việc dở dang. (Chưa commit N5 tại thời điểm viết — commit ngay sau.)

**2. File/khái niệm quan trọng đang thao tác:**
- Schema thật: `apps/api/prisma/schema.prisma` (18 bảng, 6 nhóm A-F) + migration `20260718095722_init_lean_18_tables` + `apps/api/prisma/seed.sql` (chỉ countries+configs).
- Walking skeleton đã cập nhật cho schema mới: `apps/api/src/markets.service.ts` (đọc `config` 1:1, locale từ `countries`). Response 8-field KHÔNG đổi.
- Product docs: `docs/PRODUCT.md`, `docs/DATA_MODEL.md`, `Plan/KE_HOACH_V2.md`.
- Mockup (tái dùng ở N6+): `apps/web/src/mockup/**` + `apps/web/src/app/mockup/**` (12 màn).
- **Gotcha DB**: `db:*` (prisma CLI) cần nạp `.env` thủ công vào session PowerShell trước khi chạy (config đọc `env("DATABASE_URL")`). `migrate reset` Prisma 7 KHÔNG có `--skip-seed` → dùng `db execute DROP SCHEMA public CASCADE` để wipe.

**3. Nhiệm vụ đầu tiên phiên sau — N10b (hết Tuần B):**
- N10 core XONG (join race-safe/snapshot/KYC-gate/My Campaigns, API 41/41, E2E 11/11). Migration `join_slots_waitlist` đã có sẵn cột: `participations.{state EXPIRED/WAITLISTED, submit_deadline_at, fix_deadline_at, waitlisted_at, strike_count}`, `campaigns.ends_at`.
- N10b làm 4 việc (theo QĐ-4/QĐ-5, chi tiết `docs/PRODUCT.md`):
  1. **Worker thu hồi suất** (QĐ-4): 1 service method reclaim thuần (test được) + scheduler mỏng. Quét participation JOINED quá `submit_deadline_at` / REJECTED quá `fix_deadline_at` → EXPIRED + giảm slots_taken + **tăng strike_count**. CHỈ thu hồi khi bóng ở chân creator (CONTENT_SUBMITTED/APPROVED miễn nhiễm).
  2. **Waitlist** (QĐ-5): join khi hết suất → tạo participation `WAITLISTED` + `waitlisted_at` (thay vì trả SLOT_FULL luôn); trả kèm vị trí hàng chờ.
  3. **Tự đôn**: khi reclaim/leave trả 1 suất → trong khóa campaign, lấy WAITLISTED sớm nhất → JOINED + snapshot lúc đôn + hạn nộp mới.
  4. **Gợi ý campaign tương tự** (read-only): cùng nước, còn suất, ưu tiên cùng platform hoặc reward gần.
- Cần đặt SLA test-được: cho phép override `submit_deadline_at` (vd tạo participation với deadline quá khứ) để test reclaim không phải chờ 48h. Đã có sẵn cột deadline nên chỉ cần seed/set thẳng.
- Web: V05 khi SLOT_FULL → hiện "đã vào hàng chờ vị trí K" + gợi ý; My Campaigns hiện WAITLISTED/EXPIRED; (đã có STATE_BADGE sẵn cho 2 state này).
- Fixture/gotcha: test E2E hàng đợi tích luỹ giữa các lần chạy → luôn dùng email/campaign unique + set deadline quá khứ để test reclaim.

**(cũ) — N10 core (ĐÃ XONG):**
- N6-N9 XONG. Đã có: `/auth/*`, `/me/country/*`, `/me/country/:market/kyc`, `/ops/:market/kyc/*`, `/markets/:market/campaigns[/:id]`, `auth/rbac.ts`, `lib/{auth,country,kyc,campaign}-client.ts`, seed Ops+Admin+5 campaign.
- N10: **Join campaign** — creator Join 1 campaign của nước mình: (1) **idempotent** giữ 1 suất (UNIQUE(profile,campaign) → bấm 2 lần không tạo 2 participation; chặn khi hết suất — **suất khả dụng = suy ra từ hold còn hiệu lực**, không tin bộ đếm); (2) **snapshot điều khoản** lúc Join (copy reward_minor/currency/trigger/pricing vào `participations.snapshot_*`); (3) **chặn Join khi KYC chưa APPROVED** (QĐ-2). + màn "My Campaigns".
- **QĐ-4 (đã brainstorm+chốt với Quang) — thu hồi suất chống ôm suất**, làm cùng N10:
  - Schema delta: `campaigns.ends_at`; `participations` thêm state `EXPIRED` + `submit_deadline_at`/`fix_deadline_at` + `strike_count`. → cần migration (như N6 thêm session).
  - Hạn: SLA theo creator **48h nộp / 24h sửa** (hằng số Phase 1) + `ends_at` campaign.
  - Cơ chế: **worker quét nền định kỳ** (scheduler mỏng gọi 1 service method reclaim test được) đánh dấu `EXPIRED` + trả suất; **chỉ thu hồi khi bóng ở chân creator** (chờ Ops thì DỪNG đồng hồ — CONTENT_SUBMITTED/APPROVED không bị thu hồi).
  - Chống gian lận: **strike**, sau **2 lần** bị thu hồi vì ì thì cấm join lại campaign đó (đếm trên row participation giữ lại; re-join = EXPIRED→JOINED cùng row).
  - Chi tiết đầy đủ: `docs/PRODUCT.md` QĐ-4.
- Web: nút Join ở V05 (đang disabled) → gọi API thật; màn My Campaigns hiện deadline/đếm ngược + trạng thái (kể cả EXPIRED); nút "Rời suất".
- **QĐ-5 (đã brainstorm+chốt) — tranh suất cuối + danh sách chờ** (chi tiết `docs/PRODUCT.md` QĐ-5):
  - Join race-safe: transaction + `SELECT campaign FOR UPDATE` (serial-hóa) + đếm hold còn hiệu lực + UNIQUE(profile,campaign) → không oversell; FCFS.
  - Mã lỗi có kiểu: `SLOT_FULL`/`KYC_REQUIRED`/`CAMPAIGN_NOT_JOINABLE`/`ALREADY_JOINED`/`JOIN_BLOCKED_STRIKE`.
  - Loser: từ chối rõ + **danh sách chờ** (participation state `WAITLISTED` + `waitlisted_at`) + **tự đôn** người đầu hàng khi có suất trả lại (snapshot lúc đôn) + **gợi ý campaign tương tự** (cùng nước/còn suất/cùng nền tảng hoặc reward gần). Strike KHÔNG áp cho thua-race.
  - Schema thêm state `WAITLISTED` + `waitlisted_at`.
- **Đề xuất chia việc (scope lớn — giữ "mỗi ngày demo được + giải thích được"):**
  - **N10 (demo giữa kỳ):** Join race-safe (FOR UPDATE) + idempotent + snapshot + chặn-KYC + mã lỗi có kiểu + màn My Campaigns + tự rời. Migration schema delta (ends_at, EXPIRED/WAITLISTED, deadlines, strike_count, waitlisted_at) làm luôn ở đây.
  - **N10b:** worker thu hồi suất (QĐ-4) + auto-đôn waitlist (QĐ-5) + strike + gợi ý campaign tương tự.
  - → dịch money spine (N11-15) trễ ~1 ngày, hấp thụ vào buffer N20. Xong N10+N10b là hết Tuần B.
