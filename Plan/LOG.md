# LOG — đọc file này trước, đừng đọc lại toàn bộ project

> Mục đích: phiên làm việc mới nắm trạng thái trong vài giây. Cập nhật sau mỗi mốc lớn.
> Nếu file này mâu thuẫn với code/docs thực tế → tin thực tế, sửa lại file này.

## Trạng thái ngay bây giờ (2026-07-18)

- **Đang chạy KẾ HOẠCH V2** (`Plan/KE_HOACH_V2.md` — plan duy nhất, 4 tuần N1-N20).
  Toàn bộ plan cũ (7 file) + docs cũ (~25 file) đã xóa có chủ đích; lịch sử trong git.
- Lý do làm lại: bộ cũ do AI sinh quá nhiều, không giải thích nổi khi mentor hỏi đáp.
  V2 = gọn + hiểu sâu: 5 docs mỏng, schema lean ~16 bảng, brainstorm trước code sau.
- **Đang ở N1** (Tuần A): brainstorm `docs/PRODUCT.md` cùng Anh Quang. Kế tiếp: N2-N3 mockup
  (trọng tâm), N4 ERD lean, N5 schema mới.
- Code hiện có: walking skeleton chạy được (Next.js `/vn` `/ph` → NestJS → Postgres seed
  VN/PH). Schema 45 bảng cũ **vẫn còn** — chỉ thay tại N5 khi có schema lean (đừng xóa sớm,
  app đang phụ thuộc bảng country/country_config).
- Git: `main`; mốc: `aaa7b88` (tuần 1 ngày 1-4 cũ) → `08fd74e` (checkpoint trước V2) → các
  commit V2 sau đó.

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

## Current State & Hand-off (cập nhật trước compact — 2026-07-18)

**1. Vừa xong / trạng thái:**
- Xong hết Tuần A phần Product: N1 PRODUCT.md, N2 mockup 8 màn Creator, N3 mockup 4 màn Staff, +2 fix.
- Reward model đã chốt: CORE = `CONTENT_APPROVED + FLAT`, schema `reward_rule` tổng quát 3 trục (trigger/pricing/cap) — view-gate & CPS là config/model-only.
- Git sạch, đã commit hết tới `799fc2b`. `pnpm verify` (typecheck/lint/build) + E2E 4/4 xanh. Postgres đang healthy, đã seed VN/PH.
- Không có việc dở dang.

**2. File/khái niệm quan trọng đang thao tác:**
- Mockup: `apps/web/src/mockup/{data.ts, ui.tsx, mockup.module.css}` + `apps/web/src/app/mockup/**` (12 màn: creator/* + admin/config + admin/campaign-builder + ops/review + finance/workbench).
- Product docs: `docs/PRODUCT.md` (3 QĐ + reward 3 trục + Core Platform), `Plan/KE_HOACH_V2.md` (lịch N1-N20).
- Walking skeleton (giữ, xây tiếp N6+): `apps/web/src/app/[market]/page.tsx`, `src/lib/market-context.ts`, `apps/api/src/*`.
- **Schema 45 bảng cũ `apps/api/prisma/schema.prisma` VẪN CÒN — sẽ thay tại N5** (walking skeleton đang phụ thuộc country/country_config).

**3. Nhiệm vụ đầu tiên phiên sau — N5:**
- N4 XONG: `docs/DATA_MODEL.md` (18 bảng, thiết kế trên giấy). Giờ CODE thật.
- Viết `apps/api/prisma/schema.prisma` MỚI đúng 18 bảng trong DATA_MODEL.md §2 (theo thứ tự 6 nhóm A-F).
- Xóa schema 45 bảng cũ + 3 migration cũ → tạo migration mới TỪ DB rỗng → seed VN/PH + country_configs.
- Nhớ giữ 3 unique-key trụ cột: `earnings.submission_id` (exactly-once), `participations(profile,campaign)` (join idempotent), `payout_attempts.provider_ref` (không double-pay).
- **Cảnh báo phụ thuộc**: walking skeleton (`market-context.ts` → `/markets/:market/context`) đang đọc bảng country/country_config cũ — schema mới phải giữ được 2 bảng đó (đổi tên = countries/country_configs) để `/vn` `/ph` không gãy. Chạy E2E sau migrate để chắc.
