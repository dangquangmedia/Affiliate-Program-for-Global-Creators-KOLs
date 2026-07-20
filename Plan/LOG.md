# LOG — đọc file này trước, đừng đọc lại toàn bộ project

> Mục đích: phiên làm việc mới nắm trạng thái trong vài giây. Cập nhật sau mỗi mốc lớn.
> Nếu file này mâu thuẫn với code/docs thực tế → tin thực tế, sửa lại file này.

## Trạng thái ngay bây giờ (2026-07-20 — **HOÀN THÀNH N1–N20, đóng dự án**)

- **KẾ HOẠCH V2 chạy XONG trọn 20 ngày** (`Plan/KE_HOACH_V2.md`). Tuần A (product+DB) → B (core
  spine) → C (money spine) → D (i18n/audit/setup/docs/regression). **22/22 Must có bằng chứng.**
- **Sản phẩm**: multi-country (VN/PH) affiliate, luồng tiền **chạy thật end-to-end** + **13 màn
  prototype** (V01–V13). Vòng đời: login SSO mock → chọn nước → KYC → join (snapshot) → nộp content
  → Ops duyệt (earning exactly-once) → sổ cái append-only → Finance đối soát → AVAILABLE → rút
  (OTP+reserve) → provider 3 kết cục (PAID/FAIL-hoàn/UNKNOWN-giữ) → audit trail.
- **Xác minh cuối (N20, DB sạch)**: `lint` + `2×typecheck` + **API 105/105** + **E2E 17/17** +
  `build` (api+web) — tất cả xanh; 3 migration áp từ DB rỗng OK; V13 audit render thật (bắt trọn
  quyết định của regression run). One-command `corepack pnpm bootstrap` dựng máy sạch.
- **7 bài toán khó + audit**: `docs/HARD_PROBLEMS.md` (Q&A có file:dòng chứng minh + kịch bản demo).
- **Schema**: lean 18 bảng, 3 migration (`init_lean_18_tables` → `add_session` → `join_slots_waitlist`).
- Git: `main`; mốc N16–N20: `9c7ce69`(N16)→`ed57342`(N17)→`536a4d8`(N18)→`31eeaa7`(N19)→N20.
- **Nợ kỹ thuật còn (không chặn chấm điểm)**: QĐ-7 phí / QĐ-8 escrow / QĐ-6 apply-flow (docs-only,
  chưa code runtime); i18n index launcher + 3 nhãn `data.ts`; `Report/` PPTX + `MENTOR_QA.md` phủ
  N1–N10b, chưa cập nhật N11–N19 (`HARD_PROBLEMS.md` đã phủ money-spine + audit).

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

- **N10b — thu hồi suất + waitlist + tự đôn + gợi ý (2026-07-19, HẾT Tuần B)**: KHÔNG cần migration
  (cột đã có từ N10). (1) **Waitlist (QĐ-5)**: `join()` khi hết suất KHÔNG báo `SLOT_FULL` nữa mà
  tạo/ghi `WAITLISTED` + `waitlisted_at` (trong khóa) và trả **vị trí hàng chờ FCFS** (đếm
  `waitlisted_at` sớm hơn +1). (2) **Tự đôn (QĐ-5)**: `promoteNextWaitlisted(tx)` — trong khóa
  campaign, lấy `WAITLISTED` sớm nhất → `JOINED` + **snapshot điều khoản lúc đôn** + hạn nộp mới +
  tăng slots_taken. Gọi từ `leave()` (đã bọc `$transaction`+`FOR UPDATE`) và từ reclaim → trả suất
  rồi đôn = net 0, không kẹt oan. (3) **Worker thu hồi (QĐ-4)**: `reclaimExpired(now)` LOGIC THUẦN
  (test in-process) quét `JOINED` quá `submit_deadline_at` / `REJECTED` quá `fix_deadline_at` →
  mỗi suất khóa campaign, RE-KIỂM trong khóa (creator có thể vừa nộp/rời) → `EXPIRED` + `strike_count`+1
  + trả suất + tự đôn. `CONTENT_SUBMITTED`/`APPROVED` MIỄN NHIỄM (đồng hồ dừng khi chờ Ops). Scheduler
  `reclaim.scheduler.ts` MỎNG: `setInterval` chỉ bật khi có env `RECLAIM_SWEEP_MS` (test/demo không tự
  quét). (4) **Gợi ý (QĐ-5)**: `GET /markets/:m/campaigns/:id/similar` — cùng nước, ACTIVE, còn suất,
  ưu tiên cùng platform rồi reward gần, top 3. Web: V05 nút "Vào hàng chờ" + thẻ "Đang trong hàng chờ
  · vị trí #K" + danh sách campaign gợi ý; My Campaigns hiện vị trí chờ + lý do EXPIRED + nút rời hàng
  chờ. **API 44/44** (thêm: full→WAITLISTED+vị trí, leave tự đôn, reclaim→EXPIRED+strike+đôn; RACE đổi
  thành 1 JOINED + 2 WAITLISTED vị trí {1,2}), **E2E 12/12** (thêm waitlist-flow). lint/2×typecheck sạch.
  Mẹo test reclaim: `UPDATE participation SET submit_deadline_at = now() - interval '1 hour'` rồi gọi
  `app.get(JoinService).reclaimExpired()`. Kế: **N11** — nộp content → review → Earning exactly-once (Tuần C money spine).

- **Brainstorm QĐ-6/7/8 (2026-07-19, trước N11)**: chốt 3 quyết định sản phẩm mới, ghi đầy đủ ở
  `docs/PRODUCT.md` §3. **QĐ-6 điều kiện tham gia**: mô hình **Apply → duyệt** (kiểu AccessTrade)
  cho campaign có cờ `requires_approval` — `APPLIED` không chiếm suất, Ops duyệt dựa trên hồ sơ
  social TỰ KHAI + lịch sử NỘI SINH (nguyên tắc: không xây cổng cứng trên dữ liệu mình không kiểm
  soát; khai láo tự triệt qua strike/tier). **QĐ-7 thu phí**: take-rate 5–10% trên budget, thu từ
  BRAND (nạp budget+phí); creator nhận đúng số niêm yết; rút tiền miễn phí trên ngưỡng; phí ≠ thuế.
  **QĐ-8 escrow**: prepaid 100% — brand nạp đủ trước, campaign mới ACTIVE (`PENDING_FUNDING`);
  hoàn phần chưa dùng khi kết thúc; GTM giai đoạn 0 = concierge/agency mode. **Phạm vi (chốt):**
  docs cả 3 ngay (đã xong) + code LÁT MỎNG sau N11 (QĐ-6 apply-flow; QĐ-7 `platform_fee_bps`+builder
  ghép N12/N13; QĐ-8 `PENDING_FUNDING`+nút nạp quỹ mock ghép N13/N14) — money spine không bị chậm.

- **N16 phần 1 — i18n cơ chế thật + USD toggle + phủ 4 màn demo (2026-07-20, mở Tuần D)**: sau
  khi Quang tự research + lập 4 report audit (`Report/PROJECT_AUDIT_DAY15_TO_DAY20.md` +
  `MVP_GAP_ANALYSIS.md` + `REQUIREMENT_TRACEABILITY_MATRIX.md` + `DAY15_DAY20_PLAN.md`) → chốt gap
  P0 = i18n/USD/audit/responsive; vào N16. **Quyết định thiết kế (mentor có thể hỏi):** ngôn ngữ
  UI = **công tắc tường minh vi/en, mặc định vi, ĐỘC LẬP với market** — không suy từ nước (nếu suy
  từ nước thì mở PH → tiếng Anh → vỡ `payout-fail-flow` chạy PH assert chuỗi Việt). Tách bạch
  "locale dữ liệu" (sự thật của nước, hiện ở ContextBanner) vs "ngôn ngữ UI" (lựa chọn người dùng).
  Dựng `mockup/prefs.tsx` (`PrefsProvider`+`usePrefs`: lang+showUsd, localStorage) + `app/mockup/
  layout.tsx` bọc toàn khu. Mở rộng `lib/i18n.ts`: `t(lang,key,params?)` thêm **interpolation
  `{param}`** + `usdReference(minor,currency)` (tỷ giá tĩnh mock) + từ điển vi/en cho chrome +
  login/country/earnings/wallet. `Frame` thêm **công tắc VI/EN + toggle "$ USD"** (dùng chung mọi
  màn) + crumb qua `t()`; `ContextBanner`/`UsdRef` theo lang. Convert **V01 login, V02 country,
  V07 earnings, V08 wallet** sang `t()` + nối USD ref (hiện USD tham chiếu cạnh tiền local khi bật
  toggle). **Giữ chuỗi `vi` y hệt UI cũ** (default vi) nên **E2E 17/17 không đổi** — đã liệt kê
  mọi chuỗi e2e khoá trước khi sửa (grep getByText/getByRole/getByPlaceholder). Kết quả: typecheck
  +lint sạch, **E2E 17/17** (chạy 2 lần: 50.8s/41.6s). Commit `7c35878`.

- **N16 phần 2 — phủ i18n TRỌN V01–V12 + responsive (2026-07-20, đóng N16)**: convert nốt 5 màn
  creator (kyc/discover/campaign/my-campaigns/submit — `be2204a`) + 4 màn staff (config/review/
  builder/workbench — `24d9b62`) + StateBar sang `t()`. Pattern mỗi màn: map `...KIND` (chỉ màu) +
  `t(lang,\`prefix.${key}\`)` cho badge; tách note markup thành `.noteQ/.noteBody/.noteHard`; giữ
  chuỗi vi y hệt chuỗi e2e khoá (grep trước khi sửa). **Responsive** (`9c7ce69`): `.marketPills`
  `flex-wrap` (5 pill VI/EN/$USD/VN/PH gọn mobile) + media query ≤560px (card chứa bảng tự cuộn
  ngang). **Xác minh trực quan qua Playwright MCP** viewport 375px: topbar wrap OK không tràn;
  công tắc EN đổi TRỌN UI sang tiếng Anh; toggle $USD phản ánh đúng. **E2E 17/17** cả 3 lượt.
  **CÒN**: `mockup/page.tsx` (index launcher — server component, chưa convert, không nằm trong
  V01–V12 nên để tùy chọn) + 3 nhãn data trong `data.ts` (feature labels config, option labels
  builder) giữ VI khi EN. Kế: **N17 audit AD-02** (Must ❌ duy nhất).

- **N17 — Audit trail AD-02 + bộ RBAC negative tests (2026-07-20, Tuần D)**: KHÔNG cần migration
  (model `AuditEvent`/bảng `audit_event` đã có từ N5 nhưng **0 lệnh ghi** — chính là Must ❌ cuối).
  Tạo **`AuditService`** (`audit/audit.service.ts`) song hành LedgerService: `record(client,
  {actorUserId, countryId, action, targetType, targetId, metadata})` ghi **APPEND-ONLY**, nhận
  `client` = **tx của hành động** nên vết audit + quyết định **cùng commit / cùng rollback** —
  không có quyết định thiếu dấu, cũng không có dấu cho quyết định đã rollback (câu trả lời mentor).
  Nối vào **5 điểm quyết định staff**, mỗi cái TRONG transaction: KYC review (bọc cập nhật case cuối
  + audit vào 1 `$transaction`), content approve/reject (trong tx claim sẵn), reconcile create/lock
  (tx sẵn), payout settle/resolve (thêm `actorUserId`+`action` vào `applyProviderOutcome`), campaign
  create (bọc create + audit vào 1 `$transaction`). 8 action: `KYC_REVIEWED` · `CONTENT_APPROVED/
  REJECTED` · `RECON_BATCH_CREATED/LOCKED` · `PAYOUT_SETTLED/RESOLVED` · `CAMPAIGN_CREATED`. Endpoint
  `GET /admin/audit?market=` **chỉ GLOBAL_ADMIN** (thêm `assertGlobalAdmin` vào `rbac.ts` — vai duy
  nhất vượt biên giới) + seed tài khoản `global.admin@demo.affiliate.gl` (country_id NULL, dùng
  `ON CONFLICT (id)` vì NULL≠NULL nên unique 3 cột không bắt trùng — re-seed idempotent). Facade
  thêm delegate `auditEvent`. Web: `lib/audit-client.ts` + màn **V13 `/mockup/admin/audit`** (login
  vai Global Admin, bảng sự kiện mới-nhất-trước, lọc All/VN/PH) + i18n vi/en (khối `audit.*`) + thêm
  V13 vào index. **Bộ negative tests gom rõ** (`test/rbac.negative.test.ts` — đọc 1 file thấy hết 3
  lớp phòng thủ): **A cách ly nước** (Ops/Finance PH đụng tài nguyên VN → 404 không lộ tồn tại) ·
  **B sai vai** (creator/ops/finance/local-admin thiếu vai → 403) · **C transition sai** (double
  review/lock/settle → 409). `test/audit.test.ts`: view cần GLOBAL_ADMIN (401/403); mỗi quyết định
  sinh đúng 1 vết action đúng; reject ghi lý do vào metadata; **double-approve 409 KHÔNG để lại vết
  thứ 2** (chứng minh audit ATOMIC với quyết định); global admin lọc theo nước không lẫn. Kết quả:
  **API 105/105** (88 cũ + 6 audit + 11 rbac negative), **E2E 17/17** (48.5s), typecheck+lint sạch.
  **Sự cố môi trường**: giữa chừng Docker Desktop tắt → Postgres 54329 mất → `/health` 503 →
  playwright webServer timeout 30s (KHÔNG phải lỗi test); mở lại Docker + `compose up -d postgres`
  → API tự reconnect qua pool → E2E xanh. Bài học: E2E cần Docker sống; nếu `/health` 503 kiểm
  `docker info` trước khi nghi code. Kế: **N18** seed demo đầy đủ + README máy sạch + docker
  one-command; sửa bug tồn.

- **N18 — One-command setup + README máy sạch + seed demo (2026-07-20, Tuần D)**: KHÔNG đụng
  source nghiệp vụ (test 105/105 + E2E 17/17 giữ nguyên). (1) **`scripts/setup.mjs`** +
  `package.json` script **`bootstrap`** (`node scripts/setup.mjs`): ensure `.env` (copy từ
  `.env.example` nếu thiếu — mật khẩu placeholder KHỚP cả `AFFILIATE_DB_PASSWORD` lẫn `DATABASE_URL`
  nên chạy được ngay) → nạp `.env` vào `process.env` (prisma CLI không tự nạp) → `docker compose up
  -d postgres` → **chờ Postgres ready** (poll `docker compose exec pg_isready` 40×2s) → `db:generate`
  → `db:migrate:deploy` → `db:seed`. **Idempotent, đã chạy thật end-to-end OK**. **Gotcha lớn**:
  KHÔNG đặt tên script là `setup` — `corepack pnpm setup` bị nuốt bởi **lệnh built-in `pnpm setup`**
  (cấu hình PATH/PNPM_HOME của pnpm, không chạy script); phải tên khác (`bootstrap`) hoặc gọi
  `pnpm run setup`. (2) **README viết lại hoàn toàn** — bản cũ còn "Week 1 walking skeleton" + trỏ
  file đã xóa (`00_PROJECT_EXECUTION_LOG.md`, `G5_WEEK1_GATE.md`) + "chỉ /health+/markets". Bản mới:
  mô tả đúng (13 màn + luồng tiền thật + audit), cài 1 lệnh `corepack pnpm bootstrap`, **bảng tài
  khoản demo** (creator email bất kỳ; ops/admin/finance .vn/.ph; global.admin@ xem audit), kịch bản
  demo, verify, reset DB sạch, cấu trúc thật (worker/packages = scaffolding chưa dùng), troubleshoot
  (Docker tắt→/health 503, P1000, env cho db:*). (3) **Seed** giữ nguyên — đã đủ 4 vai × 2 nước +
  global admin (N17) + 5 campaign VN/PH trạng thái đa dạng (ACTIVE/PAUSED/đầy); demo tương tác nên
  dữ liệu spine sinh LIVE khi click (không pre-seed để demo minh hoạ rõ hơn). Kế: **N19**
  `docs/HARD_PROBLEMS.md` Q&A (7 bài toán + audit AD-02) + kịch bản demo chi tiết.

- **N19 — `docs/HARD_PROBLEMS.md` Q&A + kịch bản demo (2026-07-20, Tuần D)**: chỉ tài liệu (không
  đụng code → API 105/105 + E2E 17/17 giữ nguyên). Viết bộ **8 mục** (7 bài toán khó + audit AD-02),
  mỗi mục: *mentor có thể hỏi* → *vì sao khó* → *giải pháp* → **file:dòng code chứng minh** → *test*.
  Neo vào code THẬT, **đã verify từng dòng bằng grep** (lệch +2 do N17 thêm import/inject audit —
  đã chỉnh: content 265/293/297/299, kyc 191). Các neo chính: #1 cách ly `rbac.ts`+kyc/content 404;
  #2 tiền BigInt `schema:156`+`content:297` floor; #3 exactly-once `content:278` claim + `schema:365`
  UNIQUE(submission_id); #4 payout 3 kết cục `payout:313/325/347`+`schema:464` provider_ref; #5
  snapshot `join:98`+`content:293`; #6 ledger `ledger:63`+`schema:404` UNIQUE; #7 concurrency
  `recon:199` claim + `join:164` FOR UPDATE + `schema:327` UNIQUE(profile,campaign); #8 audit atomic
  `audit:64` + test "rolled-back decision leaves NO audit". Kèm **bảng kịch bản demo 15 phút** (11
  bước bám tài khoản demo README: creator→ops→join→content→earning→finance→payout FAIL/UNKNOWN→
  global admin audit→PH/EN/USD) + câu chốt "DB làm trọng tài mọi chỗ đúng-1-lần". Kế: **N20** buffer
  + regression + tổng duyệt (Anh Quang tự trả lời 7 bài toán không nhìn tài liệu).

- **N20 — Regression trên DB sạch + tổng duyệt (2026-07-20, ĐÓNG DỰ ÁN)**: chốt mốc cuối. **Reset
  DB sạch** (`docker compose down -v` xoá volume) → `corepack pnpm bootstrap` → **3 migration áp từ
  DB RỖNG thành công** (validate luôn đường cài máy sạch N18). Chạy regression đầy đủ (tách bước để
  tránh `next build` đụng `.next` của dev — gotcha #9): **lint sạch · 2×typecheck sạch · API 105/105
  · E2E 17/17 (44.9s) · build api+web OK** ("Compiled successfully", 19/19 static pages). API dev tự
  reconnect DB mới qua pool sau reset. **Tổng duyệt V13 audit qua Playwright MCP**: đăng nhập Global
  Admin, bảng render đủ cột, và audit log **bắt trọn quyết định của regression run** (KYC_REVIEWED×45,
  CONTENT_APPROVED×34, CAMPAIGN_CREATED×39, RECON ×28/×28, PAYOUT_SETTLED×21, PAYOUT_RESOLVED×2) —
  bằng chứng sống cho AD-02. Cập nhật mục "Trạng thái ngay bây giờ" ở đầu LOG (đóng dự án). **KẾ
  HOẠCH V2 (N1–N20) HOÀN THÀNH.** Việc còn lại thuần optional/nợ nhẹ (xem mục đầu + hand-off §3).

- **N15 — Payout FAIL/UNKNOWN + hoàn tiền 1 lần + E2E cả spine tiền VN+PH (2026-07-20, đóng
  Tuần C)**: KHÔNG cần migration (enum `PayoutState` đã có `FAILED_RELEASED`/`UNKNOWN_HOLD`;
  `PayoutAttemptResult` đã có `FAIL`/`UNKNOWN`). Mở `settle` (payout.service.ts) cho **3 kết cục**
  (bài toán #4): **SUCCESS** → PAID (reserve đã trừ, số dư không đổi); **FAIL** (provider xác nhận
  KHÔNG chuyển) → `FAILED_RELEASED` + ghi sổ `PAYOUT_RELEASE +amount` **hoàn đúng 1 lần** — rời
  khỏi tập "đang giữ" nên số dư rút được TỰ phục hồi (rút lại = lệnh MỚI, không ghi đè);
  **UNKNOWN** (timeout/không rõ) → `UNKNOWN_HOLD` + **KHÔNG hoàn** (hoàn vội = double-pay nếu
  provider thật đã chuyển) — giữ reserve chờ đối soát tay. Thêm `resolveHold` (Finance đối chiếu
  sao kê provider): SUCCESS → PAID (giữ), FAIL → FAILED_RELEASED + hoàn. Gom logic vào 1 helper
  **`applyProviderOutcome`**: **claim `UPDATE ... WHERE state=fromState`** (kẻ đến sau match 0 →
  409 `ALREADY_SETTLED`/`NOT_ON_HOLD`) + mỗi lần gọi provider = 1 `payout_attempt` với
  `provider_ref` KHÁC NHAU (`mock-{id}-{lần}`, đếm attempt) → callback/retry idempotent; hoàn đúng
  1 lần được đảm bảo bởi claim + `UNIQUE(ref_type,ref_id,entry_type)`. Endpoint mới `GET
  /ops/:m/payouts/holds` (hàng đợi UNKNOWN_HOLD) + `POST /ops/:m/payouts/:id/resolve`. Facade thêm
  `payoutAttempt.findMany`. Web: `payout-client.ts` (`settlePayout(result)`, `resolveHold`,
  `payoutHolds`); V12 nút 3 kết cục (Thành công / Thất bại-hoàn / Không rõ) + card "Chờ đối soát
  tay — UNKNOWN" với nút kết luận; V08 vốn đã render đủ 4 badge trạng thái. Kết quả: **API 88/88**
  (thêm 10: 6 payout — FAIL hoàn-1-lần + số dư phục hồi + double 409, UNKNOWN giữ + không release +
  hiện ở holds, resolve FAIL/SUCCESS, guard NOT_ON_HOLD, 400 result lạ; **4 money-spine E2E API
  chạy trọn luồng tiền trên VN+PH cả SUCCESS lẫn FAIL**), **E2E 17/17** (thêm `payout-fail-flow`
  chạy trên **PH** để cách ly khỏi `payout-flow` VN — spec đó settle mọi lệnh PROCESSING của VN).
  **Chỉnh playwright.config**: `workers: 3` + `timeout: 60_000` — `next dev` compile route theo
  yêu cầu, dưới tải nhiều worker gây timeout GIẢ (thao tác đúng, chỉ chậm); nới timeout trị đúng
  gốc, ổn định qua 2 lần chạy liên tiếp. Vòng đời tiền **TRỌN VẸN**: content→earning→đối soát→
  AVAILABLE→rút→{PAID · FAIL-hoàn · UNKNOWN-giữ→đối soát tay}. Kế: **Tuần D (N16+)** — i18n/polish,
  audit+RBAC negative tests, seed+README máy sạch, HARD_PROBLEMS.md Q&A; lát mỏng QĐ-7/8 nếu còn giờ.

- **N14 — Payout: rút tiền + OTP + reserve + provider mock SUCCESS (2026-07-20)**: KHÔNG cần
  migration (bảng `payout_request/attempt` + `otp_code` đã có). Module `payout/`: creator
  `GET /me/country/:m/wallet` (số dư rút được = Σ net earning AVAILABLE − Σ lệnh đang giữ
  PROCESSING/PAID/UNKNOWN_HOLD; min từ `country_config.min_payout_minor`; lịch sử),
  `POST .../payouts/otp` (phát OTP mock 6 số, trả `code` chỉ dev để hiện màn),
  `POST .../payouts` {amount, otpId, code, idempotencyKey}. **Chống bấm 2 lần**: `idempotency_key`
  UNIQUE — key đã có → trả lệnh cũ (short-circuit + catch P2002 khi đua). **OTP**: đúng mã + chưa
  dùng + chưa hết hạn, **consume nguyên tử** `UPDATE otp_code ... WHERE consumed_at IS NULL`. Kiểm
  min (409 `BELOW_MIN_PAYOUT`) trước OTP; **số dư kiểm + reserve TRONG cùng transaction** (không rút
  vượt kể cả 2 lệnh song song) → `PROCESSING` + ghi sổ `PAYOUT_RESERVE −amount` (tái dùng
  `LedgerService.post`). Finance `GET /ops/:m/payouts` (hàng đợi PROCESSING) +
  `POST /ops/:m/payouts/:id/settle` {result:"SUCCESS"} → claim `WHERE state='PROCESSING'`
  (double-settle 409 `ALREADY_SETTLED`) + `payout_attempt` (`provider_ref` UNIQUE) → `PAID`; reserve
  đã trừ tiền nên PAID không đổi số dư. RBAC `LOCAL_FINANCE` + cách ly (PH settle VN → 404). Web:
  `lib/payout-client.ts`, V08 wallet rewire (số dư + OTP flow + lịch sử, idempotency key 1/lệnh),
  V12 thêm hàng đợi payout thật (settle → PAID). **Fail/UNKNOWN để N15.** Kết quả: **API 78/78**
  (thêm 9: wallet số dư, request→PROCESSING+reserve, below-min, insufficient, OTP invalid/used,
  idempotency 1 lệnh, settle→PAID + double-settle 409, RBAC+cách ly), **E2E 16/16** (thêm
  payout-flow V08). **Đổi test script → `--test-concurrency=1`** (suite integration dùng chung DB,
  chạy song song làm test "NOTHING_TO_RECONCILE" gom nhầm earning từ file khác). Vòng đời tiền GẦN
  TRỌN: content→earning→đối soát→AVAILABLE→**rút→PAID**. Kế: **N15** payout FAIL→hoàn 1 lần /
  UNKNOWN→giữ + bút toán đảo + E2E cả spine tiền VN+PH.

- **N13 — Đối soát Finance (batch → lock → AVAILABLE) (2026-07-20)**: KHÔNG cần migration (bảng
  `reconciliation_batch/line` đã có). Seed thêm 2 tài khoản `finance.vn@`/`finance.ph@` +
  role_assignment `LOCAL_FINANCE` (đăng nhập vai như Ops/Admin) — đã re-seed DB. Module
  `reconciliation/`: `createBatch` gom mọi earning **PENDING** của nước CHƯA nằm batch nào
  (`where reconLine: { is: null }`) → tạo batch OPEN + 1 line/earning (`UNIQUE(earning_id)` chốt: 1
  earning đúng 1 batch, kể cả 2 Finance bấm cùng lúc); rỗng → 409 `NOTHING_TO_RECONCILE` (không tạo
  batch rỗng). `lockBatch` OPEN→LOCKED bằng **claim `UPDATE ... WHERE status='OPEN'`** (double-lock
  → 409 `BATCH_ALREADY_LOCKED`) + trong CÙNG transaction flip earning dòng hợp lệ PENDING→**AVAILABLE**
  (mở tiền rút N14). LOCKED = bất biến. **KHÔNG ghi bút toán sổ cái** khi flip: PENDING→AVAILABLE là
  cổng quy trình, không phải chuyển tiền (net đã accrue vào sổ ở N12) — điểm hiểu-sâu cho mentor.
  RBAC `LOCAL_FINANCE` (Ops/creator → 403); cách ly nước (Finance PH mở batch VN → 404). Routes
  `GET/POST /ops/:market/reconciliation` + `GET/:id` + `POST/:id/lock`. Facade thêm delegate
  `reconciliationBatch`/`reconciliationLine` + `earning.update`. Web: `lib/reconciliation-client.ts`;
  V12 rewire màn thật (login vai Finance, tạo/xem/khoá batch, bảng dòng + tổng hợp lệ; payout để mock
  N14). Kết quả: **API 69/69** (thêm 7: RBAC, create gom PENDING, lock→AVAILABLE, double-lock 409,
  chỉ đối soát 1 lần, cách ly PH-VN, dashboard PENDING→AVAILABLE), **E2E 15/15** (thêm
  reconciliation-flow V12). Vòng đời tiền: PENDING → **AVAILABLE** (rút được). Kế: **N14** payout
  (reserve + OTP + provider mock) — dùng lại LedgerService (PAYOUT_RESERVE/PAID/RELEASE).

- **N12 — Ledger append-only + dashboard earnings V07 (2026-07-20)**: KHÔNG cần migration (bảng
  `ledger_entry` đã có từ N5). Tạo **`LedgerService`** (`ledger/ledger.service.ts`) — tập trung
  logic ghi sổ APPEND-ONLY (bài toán #6), tái dùng cho payout N14-15: `post(tx, entry)` (chỉ
  CREATE trong transaction có sẵn), `postEarningAccrual(tx, earning)` ghi cặp bút toán
  `EARNING_ACCRUE (+gross)` / `TAX (−tax)` (cùng `ref_type='earning'`+`ref_id=earning.id`, khác
  `entry_type` nên không đụng `UNIQUE(ref_type,ref_id,entry_type)`), `view(profileId,countryId)`
  (bút toán mới-nhất-trước + số dư luỹ kế `balanceAfterMinor` tính lại từ sổ + `balanceMinor` tổng).
  Nối vào `content.service.review()`: sau khi tạo earning (bắt `earning.id`), gọi
  `ledger.postEarningAccrual(tx, …)` **TRONG CÙNG transaction approve** → earning + sổ cái luôn
  nhất quán; exactly-once của earning kéo theo sổ không nhân đôi. Tạo **`EarningsService`** +
  `GET /me/country/:market/earnings` (dashboard: danh sách earning + summary Gross/Thuế/Net + net
  theo trạng thái PENDING/AVAILABLE/PAID + `ledger` view). Web: `lib/earnings-client.ts`; V07
  rewire màn thật (tổng quan Gross–Thuế–Net + số dư sổ, danh sách earning, **thẻ Sổ cái
  append-only** hiện từng bút toán +/− và số dư luỹ kế). Facade thêm delegate `ledgerEntry`. Kết
  quả: **API 62/62** (thêm 6: post +gross/−tax, dashboard tổng đúng net=gross−tax, sổ số dư luỹ
  kế, double-approve không nhân đôi sổ, cách ly VN/PH), **E2E 14/14** (thêm earnings-flow V07).
  Vòng đời tiền hiện: content APPROVED → earning PENDING + sổ +net (chưa AVAILABLE tới khi đối
  soát N13). Kế: **N13** đối soát (Finance tạo batch → lock → PENDING→AVAILABLE) + lát mỏng QĐ-7 phí.

- **N11 — content → review → Earning exactly-once (2026-07-19, mở màn Tuần C)**: API module
  `content/` — creator: `GET/POST /me/country/:market/campaigns/:campaignId/content` (nộp link +
  caption; kiểm sơ bộ: SAI NỀN TẢNG chặn sớm 400, thiếu hashtag trong caption = cờ advisory "Cần
  xem" không chặn; mỗi lần nộp = 1 dòng `content_submission`, attempt_no tăng, supersedes trỏ bản
  bị từ chối; nộp xong participation → CONTENT_SUBMITTED = đồng hồ QĐ-4 DỪNG); Ops:
  `GET /ops/:market/content/queue` + `POST .../:submissionId/review` (APPROVE/REJECT). **Bài toán
  #7 (2 Ops đụng nhau):** "claim" bằng `UPDATE ... WHERE state='SUBMITTED' RETURNING id` trong
  transaction — kẻ đến sau match 0 hàng → 409 `ALREADY_REVIEWED`. **Bài toán #3 (exactly-once):**
  earning chỉ tạo bởi người claim thắng; `UNIQUE(earning.submission_id)` là chốt chặn cuối trong
  DB. Approve → earning PENDING (gross = SNAPSHOT lúc join — bài toán #5; tax theo
  `country_config.tax_percent` VN 10/PH 8, BigInt floor) + participation APPROVED. Reject → bắt
  buộc lý do + participation REJECTED + `fix_deadline_at = now+24h` (nối QĐ-4: test chứng minh
  REJECTED quá hạn sửa bị worker thu hồi → EXPIRED). Facade thêm delegate
  submission/earning/countryConfig. Web: `lib/content-client.ts`; V06 rewire màn thật (form
  url+caption, lịch sử attempt, lý do reject + hạn sửa, Suspense ?id=&m=); V10 hàng đợi content
  THẬT (duyệt/từ chối + lý do, báo ALREADY_REVIEWED khi bị reviewer khác xử trước); my-campaigns/V05
  link nộp bài kèm id + "Sửa & nộp lại" cho REJECTED; `ui.tsx Field` thêm onChange (controlled).
  Kết quả: **API 56/56** (thêm 12: block sai nền tảng, advisory hashtag, SUBMISSION_PENDING,
  isolation queue/review PH-VN, approve→earning gross/tax đúng, double-approve 409 + vẫn 1 earning,
  **RACE 2 approve song song → đúng 1 thắng 1 earning**, reject cần lý do + fix deadline, resubmit
  chuỗi attempt + đúng 1 earning tổng, REJECTED quá hạn bị reclaim), **E2E 13/13** (thêm
  content-flow V06). Gotcha mới: test cách ly phải gọi route nước MÌNH của staff (PH route + PH
  token + tài nguyên VN → 404); gọi route VN bằng token PH là 403 — ngữ nghĩa khác. Kế: **N12**
  ledger append-only + dashboard earnings (V07) Gross–Thuế–Net.

## Current State & Hand-off (cập nhật 2026-07-20 — **HOÀN THÀNH N1–N20, đóng dự án**)

**1. Vừa xong / trạng thái:**
- **XONG TRỌN N1–N20** — dự án đóng, KHÔNG có việc đang dở. Vòng đời tiền end-to-end + **13 màn V01–V13**; **22/22 Must có bằng chứng**.
- **Xác minh cuối N20 (DB sạch)**: lint + 2×typecheck + **API 105/105** + **E2E 17/17** + build api+web — tất cả **xanh**; 3 migration áp từ DB rỗng OK; V13 audit render thật.
- **Git `main` sạch**, đã commit hết: N17 `ed57342` · N18 `536a4d8` · N19 `31eeaa7` · N20 `1644703`. Chỉ còn untracked/ignore: `.claude/settings.local.json`, `Report/FIGMA_UI_PROMPTS_12_SCREENS.md` (cố ý không commit).
- **Môi trường**: Postgres Docker 54329 **đang chạy**; **API dev 3001 CÒN chạy, WEB dev 3000 ĐÃ TẮT** (kill để `next build`) → cần demo thì `corepack pnpm dev:web`.

**2. File/biến quan trọng (chốt của N17 audit — mốc code cuối):**
- `audit/audit.service.ts` `record(client,input)` append-only **nhận tx** + `list(auth,market?)` chỉ GLOBAL_ADMIN (`take:200`); `audit/audit.controller.ts` `GET /admin/audit`; `auth/rbac.ts` `assertGlobalAdmin`; facade `auditEvent` trong `prisma.service.ts`; seed `global.admin@` (country NULL, `ON CONFLICT (id)`). Nối 5 điểm: `content/reconciliation/payout.service.ts` (tx CÓ SẴN) + `kyc/campaign.service.ts` (bọc `$transaction` mới). Web V13 `app/mockup/admin/audit/page.tsx` + `lib/audit-client.ts` + `lib/i18n.ts` khối `audit.*`. Test `test/audit.test.ts` + `test/rbac.negative.test.ts`.
- **Gotcha carry-forward**: (a) prisma CLI cần env (`bootstrap` tự nạp); (b) đừng `next build`/xoá `.next` khi dev:web chạy; (c) test email/tên unique; (h) test API `--test-concurrency=1`; (j) e2e dùng **PH**/`data-creator` duy nhất; (s) E2E cần Docker sống — `/health` 503 thì `docker info` + `compose up -d postgres`; (u) script bootstrap phải tên KHÁC `setup` (đụng built-in `pnpm setup`).

**3. Nhiệm vụ đầu tiên phiên sau (dự án đã đóng — mọi việc OPTIONAL, đợi Anh Quang chọn hướng):**
- **Không có việc bắt buộc.** Nếu Anh Quang muốn tiếp, chọn 1 trong:
  - (A) **Đồng bộ tài liệu bảo vệ**: cập nhật `Report/MENTOR_QA.md` (đang phủ N1–N10b) cho N11–N19, nguồn = `docs/HARD_PROBLEMS.md`.
  - (B) **Mở rộng chiều sâu (lát mỏng)**: QĐ-7 phí (`platform_fee_bps`+builder) / QĐ-8 escrow (`PENDING_FUNDING`) / QĐ-6 apply-flow (`requires_approval`+APPLIED).
  - (C) **Polish nhỏ**: i18n `mockup/page.tsx` index + 3 nhãn `data.ts`.
- **Khởi động lại nhanh**: `corepack pnpm bootstrap` → `dev:api` + `dev:web` → `/mockup`. Verify đầy đủ: tắt dev:web rồi `corepack pnpm verify`.
