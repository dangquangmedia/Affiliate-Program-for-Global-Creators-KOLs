# LOG — đọc file này trước, đừng đọc lại toàn bộ project

> Mục đích: phiên làm việc mới nắm trạng thái trong vài giây. Cập nhật sau mỗi mốc lớn.
> Nếu file này mâu thuẫn với code/docs thực tế → tin thực tế, sửa lại file này.

## Trạng thái ngay bây giờ (2026-07-18)

- **Đang chạy KẾ HOẠCH V2** (`Plan/KE_HOACH_V2.md` — plan duy nhất, 4 tuần N1-N20).
  Toàn bộ plan cũ (7 file) + docs cũ (~25 file) đã xóa có chủ đích; lịch sử trong git.
- Lý do làm lại: bộ cũ do AI sinh quá nhiều, không giải thích nổi khi mentor hỏi đáp.
  V2 = gọn + hiểu sâu: 5 docs mỏng, schema lean ~16 bảng, brainstorm trước code sau.
- **Xong Tuần A (N1-N5)**: Product (PRODUCT.md) + 12 màn mockup + ERD (DATA_MODEL.md) +
  **schema lean thật đã migrate**. Kế: Tuần B (N6-N10) — ARCHITECTURE.md + auth/country/KYC/
  campaign/join spine thật.
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
9. **`Cannot find module './xxx.js'` ở `.next/server/webpack-runtime.js`** = `.next` cache lẫn
   giữa `next build` (production) và `next dev` chạy đồng thời trên cùng thư mục. Fix: dừng dev,
   `Remove-Item -Recurse -Force apps/web/.next`, chạy lại `dev:web`. **Đừng `pnpm build` khi
   dev server web đang chạy.**

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

**3. Nhiệm vụ đầu tiên phiên sau — N6 (Tuần B):**
- Viết `docs/ARCHITECTURE.md` 1 trang (modular monolith — vì sao không microservices; sơ đồ module; luồng country context) + code auth mock SSO + session (bảng `users` + phiên).
- Bắt đầu spine thật: login → session → country context end-to-end (route→session→mọi query scoped theo country phiên).
- Schema đã có `users`, `role_assignments`, `creator_country_profiles` sẵn sàng cho auth/RBAC.
