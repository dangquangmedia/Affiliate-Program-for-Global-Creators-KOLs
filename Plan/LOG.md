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
  chưa code runtime); i18n index launcher + 3 nhãn `data.ts`; `Report/MENTOR_QA.md` phủ N1–N10b
  (chưa cập nhật N11–N19; `HARD_PROBLEMS.md` đã phủ money-spine + audit).
- **Phiên bổ sung 2026-07-21 (sau khi đóng)**: (1) **UI thật `/portal`** — 5 dashboard theo vai +
  design system + responsive (build 6 route static xanh); (2) **làm sạch tài liệu** báo cáo (bỏ khung
  mentor/đề bài/Book1, giữ Q&A); (3) **PPTX 8 slide** dựng lại (`Report/Affiliate_GLOBAL_Prototype_Review.pptx`).

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

## Phiên 2026-07-21 — UI thật /portal + dọn tài liệu + PPTX (3 việc theo yêu cầu)

Sau khi dự án đã đóng N1–N20, Anh Quang giao 3 việc (ưu tiên Việc 2 trước):

- **Việc 2 — UI thật (trọng tâm):** dựng khu mới **`apps/web/src/app/portal/`**, tách biệt `/mockup`.
  Design system dark premium (`portal.module.css`, biến trên `.app`), component kit (`ui.tsx`:
  Icon SVG, Shell sidebar→bottom-nav, Kpi/Panel/Chip/MoneySpine…). **5 dashboard theo vai**
  `/portal/{creator,ops,admin,finance,global}` + landing `/portal`. Signature = màu bản sắc nước
  (VN hổ phách / PH ngọc lam) qua `data-market`; đổi VN/PH re-scope dữ liệu thật; money-spine.
  Thêm lối vào ở `app/page.tsx`. **Xác minh**: typecheck strict xanh · `next build` 6 route static ·
  chụp Playwright desktop+mobile · tương tác chạy thật. Gotcha gặp: chạy `next build` khi đang
  `next dev` → 404 chunk `main-app.js` chết tương tác → `rm -rf apps/web/.next` rồi `dev` lại.
- **Việc 1 — dọn tài liệu báo cáo:** bỏ dấu vết mentor/đề bài/Book1.xlsx/Requirements.xlsx/rubric–
  thang điểm/khung N1–N20-thực-tập trong `docs/PRODUCT|DATA_MODEL|ARCHITECTURE.md`, `Plan/KE_HOACH_V2.md`,
  `README.md`, `Report/{DAY15_DAY20_PLAN,MVP_GAP_ANALYSIS,PROJECT_AUDIT_DAY15_TO_DAY20,REQUIREMENT_TRACEABILITY_MATRIX,FIGMA_UI_PROMPTS_12_SCREENS}.md`.
  **GIỮ Q&A**: `Report/MENTOR_QA.md` + `docs/HARD_PROBLEMS.md`. `Plan/LOG.md` để nguyên (nhật ký nội bộ).
  → memory `reports_business_tone.md`.
- **Việc 3 — PPTX 8 slide:** dựng lại `Report/Affiliate_GLOBAL_Prototype_Review.pptx` (script python-pptx
  ở scratchpad), nhúng screenshot dashboard mới (`Report/assets/portal/*.png`). 8 slide: bìa · vấn đề ·
  5 vai+luồng tiền · 4 trụ cột kỹ thuật · UI theo vai · 7 bài toán khó · tiến độ · lộ trình.
  Máy KHÔNG có LibreOffice/PowerPoint COM → chưa render preview được, chỉ verify cấu trúc (8 slide, no overflow).

## Current State & Hand-off (cập nhật 2026-07-21)

**1. Vừa xong / trạng thái:**
- Phiên gần nhất xử lý **5 điểm góp ý prototype** (ưu tiên 4-5-3-2-1): **điểm 4** (đổi nước → đổi lang+tiền tệ, market dùng chung), **điểm 5** (gỡ kẹt KYC "chờ duyệt" + nút Duyệt nhanh demo), **điểm 2** (USD tự tính — fixed bởi 4) → XONG + verify Playwright. **Điểm 3** (/portal i18n) HOÃN (xem mục 3 dưới). **Điểm 1** (FE/BE) — Anh Quang đã rõ, bỏ qua.
- Trước đó cùng phiên: **fix login prototype** (mock-login xong tự sang chọn quốc gia) + **fix DB port 54329→5433** (Windows reserved) + **theme sáng/tối + responsive `/portal`**.
- **E2E 18/18 xanh**, typecheck xanh. `main` sạch sau các commit (trừ `.claude/settings.local.json` + file tạm `~$*.pptx` do PowerPoint mở).
- Trạng thái nền cũ N1–N20 vẫn nguyên (money-spine API 105/105). `/portal` là lớp thêm, không đụng spine.

**2. File/biến quan trọng:**
- UI mới: `apps/web/src/app/portal/` (`page.tsx` landing · `ui.tsx` · `portal.module.css` · `{creator,ops,admin,finance,global}/page.tsx`). Dùng chung `mockup/data.ts` + `formatMoney`.
- **Tinh chỉnh landing (commit `9bafb4d`)**: `/` redirect → `/portal` (bỏ walking-skeleton); landing bọc 1 khung `.landFrame`; nút "Xem prototype" ở góc phải; tiêu đề "Chào mừng đến Trung tâm điều hành"; testid `link-vn`/`link-ph` chuyển xuống footer portal → E2E `market-round-trip` vẫn xanh.
- **Theme + responsive (commit `e63b963`)**: thêm `ThemeToggle` (sáng/tối, `data-theme` trên `[data-portal-root]`, lưu `localStorage.ag_theme`, biến màu đảo nền/chữ giữ accent). Sửa tràn ngang: `box-sizing:border-box` toàn khu + `minmax(0,1fr)` grid + `min-width:0` content + topbar mobile xuống dòng/ẩn tên user. Đã đo overflowX=false ở 1440/900/390. (Bản ảnh user báo "mobile trên PC" gốc là CSS viewport nhỏ do zoom — code vốn full-width ở desktop.)
- Audit N17 (mốc code money-spine cuối): `audit/audit.service.ts` `record(client,input)` nhận tx + `list(auth,market?)`; `assertGlobalAdmin`; facade `auditEvent`; nối 5 service; V13 `/mockup/admin/audit`.
- **Gotcha carry-forward**: (a) prisma CLI cần env (`bootstrap` tự nạp); (b) **đừng `next build` khi `dev:web` chạy** (404 chunk → `rm -rf apps/web/.next`); (h) test API `--test-concurrency=1`; (j) e2e dùng PH/`data-creator`; (s) E2E cần Docker — `/health` 503 thì `docker info` + `compose up -d postgres`; (u) bootstrap ≠ tên `setup`; (v) **DB port = 5433** (đổi từ 54329 vì rơi vào dải Windows reserved 54290-54389 → Docker không bind ra host, API 503/mock-login 500). Nếu `/health` 503 dù Postgres "healthy": kiểm `docker compose ps` xem PORTS có `5433->5432` không; nếu container cũ thiếu port → `docker compose up -d --force-recreate postgres`.
- **Login prototype (commit `4269202`)**: V01 mock-login xong **tự router.push → /mockup/creator/country**. Nếu login báo "Đăng nhập bị từ chối" = API có phản hồi nhưng DB lỗi (503) — không phải bug UI; bật Docker + Postgres (port 5433) + `bootstrap`.
- **Market↔lang↔currency coupling (commit `787c389`)**: `market` giờ nằm trong `mockup/prefs.tsx` (DÙNG CHUNG mọi màn /mockup, persist `ag_pref_market`); `setMarket` kéo theo lang (VN→vi, PH→en) + tiền tệ. 14 màn dùng `usePrefs().market` thay `useState`. → điểm 2 (USD tự tính khi đổi nước) & điểm 3-cho-/mockup được giải quyết luôn vì mọi màn couple lang. **Lưu ý E2E**: bấm 🇵🇭 PH giờ đổi UI sang EN — test nào assert chuỗi tiếng Việt sau khi chọn PH phải ép lại VI (xem `payout-fail-flow.spec`). KYC "chờ duyệt" có nút "Duyệt nhanh (demo)" (mô phỏng Ops) + link hàng đợi Ops.
- **CÒN LẠI (Anh Quang xếp ưu tiên 4-5-3-2-1)**: điểm 4,5 XONG+verify; điểm 2 fixed bởi 4; **điểm 3 cho /portal (VI/EN + i18n toàn bộ dashboard) CHƯA làm — khối lượng lớn (portal đang VN-only hardcoded), cần làm đợt riêng**; điểm 1 = FE `apps/web` / BE `apps/api` (chỉ cần chỉ rõ, chưa đổi cấu trúc).

**3. VIỆC HOÃN — ƯU TIÊN LÀM ĐẦU PHIÊN SAU: i18n song ngữ VI/EN cho khu `/portal`** (điểm 3 Anh Quang):
- **Bối cảnh**: `/portal` (5 dashboard + landing) đang **hardcode tiếng Việt**, chưa có lớp i18n. Yêu cầu: thêm nút VI/EN + **tự đổi ngôn ngữ theo nước** (giống /mockup đã làm ở `787c389`).
- **Việc cần làm**:
  1. Tạo lớp lang cho `/portal` — tái dùng ý tưởng `mockup/prefs.tsx` (market→lang coupling: VN→vi, PH→en) HOẶC dict riêng trong `app/portal/`.
  2. Thêm nút **VI/EN** vào `Shell` topbar (`app/portal/ui.tsx`, cạnh `ThemeToggle`) + `landing header` (`app/portal/page.tsx`).
  3. Couple với market switch sẵn có ở portal creator + global (đổi nước → đổi lang).
  4. **Dịch toàn bộ chuỗi** (khối lượng LỚN, hàng trăm string): `ui.tsx` (nav labels, roleTag, MarketStrip), `page.tsx` landing (hero/role cards/footer), 5 file `{creator,ops,admin,finance,global}/page.tsx` (KPI labels, panel titles, chips, buttons, notes, table headers, task items).
  - Tiền tệ ĐÃ đúng theo market (dùng `formatMoney` + `MARKETS[market].currency`) — không cần đụng.
- **Cách làm gợi ý**: rút chuỗi ra 1 dict `{vi, en}` giống `lib/i18n.ts`, thay hardcode bằng `t(lang, key)`. Có thể chia nhỏ theo file để không vỡ 1 lần.

**Việc OPTIONAL khác** (sau điểm 3): render/soát PPTX trên máy có PowerPoint; mở rộng `/portal` đủ 12 màn Figma; đồng bộ `Report/MENTOR_QA.md` N11–N19.

**Môi trường hiện tại (phiên này KHÔNG tắt server)**: Postgres Docker **port 5433** đang chạy (đã migrate+seed); **API dev 3001 đang chạy** (em start, đọc `.env` port 5433); **web dev 3000 là bản Anh Quang đang mở** (code mới đã HMR). Khởi động lại nếu cần: `corepack pnpm bootstrap` → `dev:api` + `dev:web` → `/portal` (UI thật) · `/mockup` (prototype). **Điểm 1 (FE/BE): Anh Quang xác nhận đã rõ — FE `apps/web`, BE `apps/api`, không cần đổi.**

---

## Current State & Hand-off (cập nhật 2026-07-21 — phiên "SP-1 Portal sống", MỚI NHẤT — thay thế mục trên)

**1. Vừa xong / trạng thái:**
- **SP-1 "Portal sống" ĐÃ XONG + MERGE vào `main`** (merge commit `768f60b`, nhánh `feat/portal-song-cross-link` đã xoá). 5 dashboard `/portal` từ TĨNH → gọi API thật, nút hoạt động, cross-link chạy qua chung DB.
- **Cross-link chứng minh bằng capstone E2E** (`portal-cross-link.spec.ts`): Creator nộp link → Ops thấy & duyệt → Finance đối soát+lock+payout → ví Creator PAID, **trọn trong /portal**.
- Cổng chọn vai → `mockLogin` ngầm bằng account seed (phiên + RBAC thật). Mọi dashboard xử lý lỗi nhất quán (business + transport, tiếng Việt).
- **Test**: full E2E 23/25 xanh; 2 spec (`portal-admin`, `portal-global`) flake do dev-server cold-compile route > timeout 5s — PASS khi chạy riêng (3.4s/1.8s), không lỗi code, không flake trên production build. Typecheck sạch (api+web). Capstone verify lại trên main sau merge: xanh.
- Làm theo quy trình subagent-driven: 7 task TDD, mỗi task có task-review + fix loop; final whole-branch review (opus) bắt 1 gap (creator thiếu bắt lỗi transport) → đã fix (`bc28d57`) + re-review sạch.
- **CHƯA push GitHub** (main ahead origin 53 commit — Anh Quang chọn merge local).
- **Docs CHƯA commit** (working tree): `docs/PRODUCT.md` (thêm §3.0 tư duy 3-giải-pháp + 5 điểm cấn), `Report/MENTOR_QA.md` (Nhóm 0: 5 điểm cấn × 3 giải pháp), `Report/Affiliate_GLOBAL_Prototype_Review.pptx` (dựng lại 8 slide theo narrative PM: Product→DB→Kiến trúc→Coding→Triển khai), `Plan/LOG.md`, `.gitignore`.

**2. File/biến quan trọng:**
- **Mới**: `apps/web/src/app/portal/session.ts` — `enterAs(role,market)` (mockLogin seed→saveSession→set `ag_pref_market`→hard-nav), `roleEmail()`, **`readPrefMarket(): "VN"|"PH"`** (shared, mọi dashboard đọc market qua nó). `apps/web/src/app/portal/role-buttons.tsx` — client component nút chọn vai (tách khỏi `page.tsx` vì page export `metadata`).
- 5 dashboard `apps/web/src/app/portal/{creator,ops,admin,finance,global}/page.tsx` nay fetch qua 9 client lib `apps/web/src/lib/*-client.ts`; pattern action = `busy/err → try{business-branch} catch{setErr(vi)} finally{setBusy(false)}` + `load()` try/catch + narrow union (`"forbidden"/"unauthorized" in res`). `ui.tsx` `Btn` có prop optional `testId`.
- **testid** để E2E/demo: `enter-{role}` (landing) · `creator-campaign/-submit-content/-request-payout/-payout-history` · `ops-content-queue/-approve-content` · `finance-create-batch/-payout-queue` · `admin-campaign-list/-create-campaign` · `global-audit-feed`.
- E2E mới: `apps/web/e2e/portal-{role-entry,creator,ops,finance,admin,global,cross-link}.spec.ts`. Chạy `--workers=1` để tránh flake dev cold-compile.
- Spec+plan SP-1: `docs/superpowers/specs/2026-07-21-portal-song-cross-link-design.md` (có **phụ lục vision SP-2**), `docs/superpowers/plans/2026-07-21-portal-song-cross-link.md`. Ledger SDD: `.superpowers/sdd/progress.md` (+ briefs/reports — scratch).
- Không đụng backend, không đụng `/mockup`.

**3. NHIỆM VỤ ĐẦU PHIÊN SAU: SP-2 — "Global Admin toàn quyền"** (Anh Quang đã duyệt hướng, để spec riêng):
- **(A) RBAC CRUD** — module backend MỚI `apps/api/src/admin/staff` (guard chỉ GLOBAL_ADMIN, **audit mọi thao tác**): `GET /admin/staff` (lọc nước/toàn cục) · `POST` tạo staff (email+role+country → upsert `app_user`+`role_assignment`) · `PATCH /:id` đổi role · `DELETE /:id` = vô hiệu hoá (gỡ role_assignment). KHÔNG mật khẩu/2FA (vẫn mock SSO).
- **(B) Doanh thu tổng đa nước** — `GET /admin/global/revenue`: mỗi nước gross/phí sàn(`PLATFORM_FEE`)/đã chi payout/net bằng **tiền bản địa** + cột **quy USD** (tỷ giá tĩnh, ghi chú demo) + **1 dòng tổng USD** (không cộng thẳng VND+PHP). UI: thẻ nước cạnh nhau + 1 dòng tổng USD. Chỗ chờ đã có: `/portal/global` nav "Quản lý quyền"/"Doanh thu tổng" đang render placeholder "Đang phát triển — SP-2".
- **Cách vào**: brainstorm → spec (đã có vision ở phụ lục design doc) → writing-plans → subagent-driven, giống SP-1.

**Việc phụ (khi Anh Quang muốn):** (a) `git push origin main` đẩy SP-1 lên GitHub; (b) commit các docs đang dở (PRODUCT/MENTOR_QA/PPTX); (c) **điểm 3 i18n VI/EN cho `/portal`** VẪN HOÃN (portal đang VN-only hardcoded — khối lượng lớn, xem hand-off cũ ở trên); (d) làm 2 smoke-spec (`portal-admin`,`portal-global`) robust (chờ route ấm) để hết flake.

**Môi trường:** Postgres Docker **port 5433** + **API dev 3001** + **web dev 3000** đang chạy (nếu cần: `corepack pnpm bootstrap` → `dev:api`+`dev:web`). E2E chạy `cd apps/web && corepack pnpm exec playwright test --workers=1`.

---

## Current State & Hand-off (cập nhật 2026-07-21 — phiên "Dọn docs + push", MỚI NHẤT — bổ sung mục trên)

**1. Vừa xong:**
- **Dedup 4 file docs trùng lặp** (theo yêu cầu Anh Quang): chuẩn hoá phân vai — `Report/MENTOR_QA.md` = Q&A sản phẩm/nghiệp vụ; `docs/HARD_PROBLEMS.md` = Q&A kỹ thuật + file:dòng code; `docs/DATA_MODEL.md` = đặc tả 18 bảng; `docs/PRODUCT.md` = tư duy/WHY. Chỉ sửa MENTOR_QA: thêm ghi chú phân vai đầu file; rút gọn Nhóm 3 (Q9–12→trỏ DATA_MODEL), Nhóm 5 (Q16/17/21/22/23→trỏ HARD_PROBLEMS/Nhóm 0), Nhóm 6 (Q24→trỏ HARD_PROBLEMS #1). **Giữ nguyên** Nhóm 0 (5 điểm cấn — Anh Quang chốt) + Q18/19/20/25/26. 3 file kia KHÔNG đụng.
- **ĐÃ commit + PUSH lên GitHub** (main giờ đồng bộ origin/main): `3acd9dc` (dedup MENTOR_QA + Nhóm 0 tồn phiên trước), `908f0d4` (gom docs tồn: PRODUCT/PPTX 8slide/FIGMA/LOG). → **SP-1 + toàn bộ docs nay đã ở origin/main**, không còn commit local lẻ.
- **`.gitignore` đã khôi phục về bản gốc** — bản working-tree bị sửa nhầm (thêm `Report/` ⇒ ignore thư mục báo cáo, + bỏ ignore `.playwright-mcp/`); đã `git checkout` bỏ.

**2. Working tree còn lại (KHÔNG commit — nhiễu local, an toàn để tắt máy):**
- `.claude/settings.local.json` (modified) + `.claude/settings.json` (untracked): permission config máy local.
- `.playwright-mcp/`: artifact test, đã ignore lại.

**3. Nhiệm vụ phiên sau: KHÔNG ĐỔI — vẫn là SP-2 "Global Admin toàn quyền"** (RBAC CRUD `apps/api/src/admin/staff` + doanh thu tổng USD `GET /admin/global/revenue`) — xem chi tiết mục hand-off SP-1 ngay trên. Việc phụ (a) đã xong (push). Còn (c) i18n /portal + (d) 2 smoke-spec robust vẫn hoãn.

**Môi trường:** như mục trên (Postgres 5433 / API 3001 / web 3000).

---

## Current State & Hand-off (cập nhật 2026-07-22 — Go rewrite Tuần 2, MỚI NHẤT)

- **Vừa xong:** Tuần 1–2 Go rewrite đạt đủ gate; Go API tại `apps/api-go` đang có **17/36 operation** (platform, market, auth/session/RBAC, profile, KYC, campaign, audit). DB sạch/container smoke pass; `go vet` + `go test` xanh; Nest **105/105**, Playwright **25/25**. Image local: `affiliate-api-go:week2`; DB test `affiliate_go_week2` đã xóa. Chưa cutover, Nest `apps/api` vẫn là oracle.
- **File/biến quan trọng:** `apps/api-go/internal/{auth,country,kyc,campaign,audit,httpapi}/`; SQL tại `apps/api-go/db/queries/`; acceptance `apps/api-go/integration/week2_test.go`; báo cáo `Report/GO_WEEK{1,2}_COMPLETION.md`; kế hoạch `Plan/GO_BACKEND_REWRITE_PLAN.md`. Runtime dùng `DATABASE_URL`, Go port mặc định `3002`, Nest `3001`, Postgres `5433`.
- **Đầu phiên sau:** triển khai **Tuần 3** — đọc/port `apps/api/src/campaign/{join.controller.ts,join.service.ts,reclaim.scheduler.ts}` sang Go; việc đầu tiên là chốt SQL transaction `SELECT campaign ... FOR UPDATE` và viết test race 3 creator tranh slot cuối (1 `JOINED`, 2 `WAITLISTED`).

---

## Current State & Hand-off (cập nhật 2026-07-22 — Go rewrite Tuần 3, MỚI NHẤT)

- **Vừa xong:** Tuần 3 đạt 3/3 gate; Go API **20/36 operation**. Join dùng campaign row lock + KYC gate + snapshot; waitlist strict-FCFS; leave/reclaim promote; submit/fix deadline + strike; `cmd/reclaim` one-shot đã nằm trong image `affiliate-api-go:week3`. DB sạch, Go test/vet, Nest 105/105, Playwright 25/25 pass. Chưa cutover.
- **File quan trọng:** `apps/api-go/internal/campaign/join.go`, `db/queries/join.sql`, `internal/store/sqlcgen/join.sql.go`, `cmd/reclaim/main.go`, `integration/week3_test.go`, `Dockerfile`; báo cáo `Report/GO_WEEK3_COMPLETION.md`.
- **Đầu phiên sau:** triển khai **Tuần 4** — đọc/port content submit/review trước; việc đầu tiên là chốt conditional claim `UPDATE ... WHERE state='SUBMITTED' RETURNING` và test double-approve chỉ tạo 1 earning + 1 bộ ledger.

---

## Current State & Hand-off (cập nhật 2026-07-22 — Go rewrite Tuần 4, MỚI NHẤT)

- **Vừa xong:** Tuần 4 đạt 3/3 gate; Go API **25/36 operation**. Content submit/reject/resubmit + strict attempt chain; conditional review claim; earning + accrual/tax ledger + audit atomic; dashboard/running balance; VN/PH tax dùng `int64`. DB sạch, Go test/vet, Nest 105/105, Playwright 25/25 pass. Image `affiliate-api-go:week4`; chưa cutover.
- **File quan trọng:** `apps/api-go/internal/{content,earnings}/`, `db/queries/{content,earnings}.sql`, `integration/week4_test.go`, `Report/GO_WEEK4_COMPLETION.md`.
- **Đầu phiên sau:** triển khai **Tuần 5** — đọc/port reconciliation trước; việc đầu tiên là chốt transaction create/lock batch và test earning chỉ thuộc một batch, double-lock chỉ chuyển `PENDING → AVAILABLE` một lần.

---

## Current State & Hand-off (cập nhật 2026-07-22 — Go rewrite Tuần 5, MỚI NHẤT)

- **Vừa xong:** Tuần 5 đạt 4/4 gate; Go API đủ **36/36 operation**. Reconciliation race-safe; wallet/OTP/payout atomic; profile lock chống overspend; `SUCCESS/FAIL/UNKNOWN_HOLD` + manual resolve; settlement/audit rollback atomic. DB sạch, Go test/vet, Nest 105/105, Playwright 25/25 pass. Image `affiliate-api-go:week5`; chưa cutover.
- **File quan trọng:** `apps/api-go/internal/{reconciliation,payout}/`, `internal/httpapi/week5.go`, `db/queries/{reconciliation,payout}.sql`, `integration/week5_test.go`, `Report/GO_WEEK5_COMPLETION.md`.
- **Đầu phiên sau:** triển khai **Tuần 6** — việc đầu tiên là lập ma trận 105 Nest cases ↔ Go acceptance, chạy frontend với Go API port 3001 và ghi differential contract gaps trước khi sửa.

---

## Current State & Hand-off (trước compact — Go rewrite Tuần 5)

- **Vừa xong:** Tuần 5 hoàn tất 4/4 gate; Go API **36/36 operation**, money-spine/concurrency/rollback xanh; image `affiliate-api-go:week5`; chưa cutover.
- **File/biến chính:** `apps/api-go/internal/{reconciliation,payout}/`, `internal/httpapi/week5.go`, `db/queries/{reconciliation,payout}.sql`, `integration/week5_test.go`, `Report/GO_WEEK5_COMPLETION.md`; `DATABASE_URL`, Go `3002`, Nest `3001`, PostgreSQL `5433`.
- **Việc đầu tiên phiên sau:** bắt đầu Tuần 6 bằng ma trận **105 Nest cases ↔ Go acceptance**, sau đó chạy frontend với Go API ở port `3001` để ghi contract gaps.

---

## Current State & Hand-off (cập nhật 2026-07-22 — Go rewrite Tuần 6 HOÀN TẤT, MỚI NHẤT)

- **Vừa xong:** Tuần 6 "full parity + hardening" đạt đủ 4/4 gate — **đánh giá lại toàn bộ và kiểm
  chứng thật trong phiên này** (không chỉ tin README/tài liệu cũ): `go build`/`go vet`/`gofmt`/
  `govulncheck` sạch; `go test ./...` (kể cả `integration/week6_test.go` — race KYC review 2 Ops
  cùng duyệt) PASS; **105/105 legacy case** (`test:api:parity`) PASS; **13/13 differential Nest↔Go**
  PASS; **25/25 Playwright E2E trên Go** (kể cả 7 spec `/portal`) PASS; **`go test -race ./...`**
  (container Linux CGO cô lập, `compose.race.yaml`) PASS, không data race; **toàn bộ `pnpm verify`**
  (lint→typecheck→4 tầng test→build Go+Next.js) chạy trót lọt tới bước cuối. Đếm trực tiếp router:
  **36/36 route** khớp đúng inventory kế hoạch (không suy từ tài liệu). Grep TODO/FIXME/stub trên
  toàn bộ Go source: sạch. Root scripts (`dev:api`/`build`/`db:*`/`lint`/`typecheck`) đã trỏ hẳn sang
  Go, không còn Prisma/Nest trên đường chạy chính (`apps/api` NestJS vẫn giữ nguyên làm oracle
  differential + fallback rollback, không xoá).
- **Bổ sung trong phiên này:** viết `Report/GO_WEEK6_COMPLETION.md` (thiếu, phá vỡ khuôn báo cáo
  Tuần 1-5) + thêm dòng "Trạng thái thực thi ngày 22/07/2026: HOÀN TẤT" vào
  `Plan/GO_BACKEND_REWRITE_PLAN.md` mục Tuần 6.
- **⚠️ RỦI RO LỚN NHẤT — chưa commit:** TOÀN BỘ Go rewrite (`apps/api-go/` từ Tuần 1 đến nay, ~34
  file Go + 3 migration + queries + Dockerfile, cộng hạ tầng parity-test root: `docs/API_CONTRACT_
  CURRENT.md`, `docs/GO_API_PARITY_MATRIX.md`, `packages/contracts/{golden,openapi/current.yaml}`,
  `scripts/{run-go-api-acceptance,differential-nest-go,run-go-playwright,run-go-race}.mjs`,
  `compose.race.yaml`, `apps/api/test/go-api-harness.ts`, 12 file `apps/api/test/*.test.ts` đã port,
  `Report/GO_WEEK{1..6}_COMPLETION.md`, `Plan/GO_BACKEND_REWRITE_PLAN.md`) **đang 100% nằm ngoài git**
  (`git status` → toàn bộ `??` untracked). Tương đương nhiều tuần công sức đã kiểm chứng chỉ nằm trên
  đĩa. **Việc đầu tiên phiên sau nếu chưa commit: hỏi Anh Quang và commit+push ngay** trước khi làm
  gì khác — đây là action có thể mất trắng nếu máy hỏng/mất file.
- **File/biến quan trọng:** cấu trúc `apps/api-go/{cmd,internal,db,integration}/`; harness
  `apps/api/test/go-api-harness.ts`; script gốc `scripts/run-go-*.mjs` + `differential-nest-go.mjs`;
  `DATABASE_URL` port `5433`; Go API mặc định port **3001** (đã đổi từ 3002 — Nest lùi làm oracle
  phụ, không có port cố định trong luồng dev thường); lệnh tổng `corepack pnpm run verify`.
- **Đầu phiên sau (sau khi xử lý rủi ro commit ở trên):** Tuần 7 — Google Cloud staging (Cloud Run,
  Cloud SQL, Secret Manager, migration/reclaim job qua Cloud Run Job, Cloud Scheduler, deploy frontend
  trỏ Go staging, smoke/E2E trên staging). Việc này cần thông tin/quyền truy cập GCP thật từ Anh
  Quang (project id, billing, service account) — chưa có trong phiên nào trước đó.

---

## Current State & Hand-off (cập nhật 2026-07-22 — sau Go rewrite: kiểm kê + bảo mật, MỚI NHẤT)

**1. Vừa xong / trạng thái:**
- Go backend rewrite (Tuần 1-6) đã **commit + push** (`7313720`, xem hand-off ngay phía trên). Sau
  đó Anh Quang xác nhận **Tuần 7-8 = thuần deploy hạ tầng (GCP)**, tạm dừng — chờ quyền truy cập
  GCP thật (project id/billing/service account) mới làm tiếp, không tự bắt đầu.
- **Sửa lỗi runtime `/portal`**: stale webpack chunk (`Cannot find module './169.js'`) do `.next`
  cache lệch sau thay đổi lớn — đã kill process cũ, xoá `apps/web/.next`, restart `dev:web` sạch.
  Không phải bug code.
- **Kiểm kê toàn repo** (agent Explore, background) tìm file thừa/lỗi thời — kết quả:
  - **Chắc chắn lỗi thời** (CHƯA SỬA — Anh Quang bảo dừng để compact): `docs/ARCHITECTURE.md` (mô
    tả NestJS/Prisma, không nhắc Go — sai lệch nghiêm trọng nhất); `docs/HARD_PROBLEMS.md` +
    `Report/MENTOR_QA.md` (bằng chứng "file:dòng" vẫn trỏ `apps/api/prisma/schema.prisma` thay vì
    Go tương ứng); `Report/Affiliate_GLOBAL_Prototype_Review.pptx` (dựng 21/07, TRƯỚC Go rewrite
    22/07 — không phản ánh backend Go/105 test/25 E2E).
  - `Plan/KE_HOACH_V2.md`: phần N11-N20 giả định NestJS xuyên suốt, không còn khớp thực tế (rẽ
    sang Go giữa chừng) — nên có dòng ghi chú trỏ sang `GO_BACKEND_REWRITE_PLAN.md`, chưa làm.
  - `prisma.config.ts` (root): xác nhận orphan (không script nào gọi) → **ĐÃ XOÁ** (`git rm`,
    chưa commit).
  - Không cần làm gì thêm: `requirements/Book1.xlsx` (bản chính hợp lệ), `Plan/`/`Report/GO_WEEK*`/
    `scripts/`/`.gitignore` đều ổn, không rác.
- **Đánh giá bảo mật toàn dự án** (tự làm, không delegate — đã có ngữ cảnh sâu sẵn): KHÔNG có lỗ
  hổng nghiêm trọng trong logic nghiệp vụ/luồng tiền. Tốt: token session 32-byte `crypto/rand` +
  SHA-256 hash lưu DB (không lưu thô); sqlc parameterized 100% (không SQLi); CORS đúng 1 origin;
  panic recovery không lộ stack trace; access log không ghi token/OTP/PII; không
  `dangerouslySetInnerHTML`; không SSRF (backend không tự fetch URL người dùng). Khoảng hở (chưa
  sửa, mức trung bình/thấp): (a) không có rate-limit ở login/OTP/payout — cần trước production
  thật; (b) token lưu `localStorage` không phải httpOnly cookie — thiếu lớp phòng thủ sâu nếu có
  XSS; (c) OTP mock trả thẳng mã trong response (đã công bố, chỉ cần bỏ khi nối OTP thật); (d)
  Go API chưa có security header (CSP/HSTS/X-Frame-Options) — chuẩn hoá ở Tuần 7 Cloud Run; (e)
  `pnpm audit`: 2 high + 3 moderate, nhưng 4/5 nằm trong dev-tooling chain Prisma CLI (không chạy
  runtime), 1 (`sharp`) là dependency không dùng tới (repo không dùng `next/image` ở đâu) → rủi ro
  thực tế thấp, nên `pnpm audit fix` cho sạch khi có dịp.

**2. File/biến quan trọng đang thao tác:**
- `prisma.config.ts` — đã `git rm`, **CHƯA commit** (chờ quyết định gộp commit lần tới).
- Chưa file nào khác bị sửa trong phiên "dọn dẹp" này — 4 việc "chắc chắn lỗi thời" ở mục 1 vẫn
  NGUYÊN VẸN, chưa đụng tới.

**3. NHIỆM VỤ ĐẦU PHIÊN SAU** (theo đúng thứ tự Anh Quang đã đồng ý — "tiến hành luôn cả 4 việc"):
1. Viết lại `docs/ARCHITECTURE.md` phản ánh đúng Go backend (`apps/api-go`) là hệ thống thật; giữ
   phần NestJS như "lịch sử/oracle" (không xoá, chỉ đổi vai trò mô tả).
2. Sửa tham chiếu "file:dòng" lỗi thời trong `docs/HARD_PROBLEMS.md` + `Report/MENTOR_QA.md` sang
   code Go tương ứng (không viết lại toàn bộ, chỉ cập nhật bằng chứng).
3. Dựng lại `Report/Affiliate_GLOBAL_Prototype_Review.pptx` phản ánh Go rewrite + `/portal` UI mới
   nhất.
4. Thêm dòng ghi chú đầu `Plan/KE_HOACH_V2.md` trỏ sang `GO_BACKEND_REWRITE_PLAN.md` cho giai đoạn
   hậu N10.
- **Sau đó**: brainstorm hướng **UI sáng tạo mới cho `/portal`** — Anh Quang yêu cầu rõ "không được
  tạo cảm giác AI chung chung". Đây là việc CREATIVE, bắt buộc dùng skill `superpowers:brainstorming`
  (hard gate: không code/scaffold trước khi trình bày thiết kế và được duyệt) — hỏi từng câu một,
  không dồn nhiều câu hỏi 1 lúc. CHƯA bắt đầu brainstorm trong phiên này.
- Việc phụ (khi rảnh, không khẩn): `pnpm audit fix` dọn 5 vulnerability npm; cân nhắc thêm
  rate-limit + chuyển session token sang httpOnly cookie nếu tiến gần production thật hơn.

**Môi trường:** Postgres Docker port 5433; Go API `dev:api` port 3001; web `dev:web` port 3000
(vừa restart sạch, `.next` mới). `git status`: `prisma.config.ts` đã stage xoá, chưa commit.

---

## Current State & Hand-off (cập nhật 22/07/2026 — 4 việc dọn tài liệu xong, MỚI NHẤT)

**1. Vừa xong — cả 4 việc tài liệu theo đúng thứ tự đã chốt:**
1. **`docs/ARCHITECTURE.md` viết lại toàn bộ**: Go (`apps/api-go`) là hệ thống thật (module,
   sơ đồ request, auth/session, quyết định kỹ thuật đều mô tả Go/chi/pgx/sqlc); thêm mục 2 giải
   thích "vì sao port từ NestJS sang Go" + bằng chứng port đúng (105/105 + 13/13 differential +
   25/25 E2E); NestJS đổi vai thành "oracle lịch sử", không xoá.
2. **`docs/HARD_PROBLEMS.md`**: toàn bộ 8 mục "Chứng minh trong code" đã đổi từ
   `apps/api/src/*.ts` + `schema.prisma` sang `apps/api-go/internal/*` + `db/queries/*.sql` +
   `db/migrations/*.sql` — lấy file:dòng thật bằng cách đọc trực tiếp code Go (dùng Explore agent
   xác minh từng dòng, không đoán), không đổi phần lý luận/bài toán (vẫn đúng nguyên văn).
3. **`Report/MENTOR_QA.md`**: sửa Q13/Q14 (kiến trúc/luồng request) từ Prisma/SessionAuthGuard
   sang Go/chi middleware; Q27/Q28 (bằng chứng test) từ số cũ "44/44, E2E 12/12" sang số thật
   hiện tại (105/105 parity + 13/13 differential + 25/25 E2E + race); Q32-34 (hướng phát triển)
   từ "money spine chưa làm, N11-N20 kế hoạch" sang đúng thực tế: money spine + Go rewrite ĐÃ
   xong, còn lại thuần deploy GCP (Tuần 7-8, đang tạm dừng). Nhóm 0-8 (5 điểm cấn, DB, bảo mật…)
   giữ nguyên vì đó là quyết định sản phẩm/dữ liệu, không đổi khi đổi backend.
4. **`Report/Affiliate_GLOBAL_Prototype_Review.pptx`**: sửa bằng `python-pptx` (edit text run tại
   chỗ, không dựng lại từ đầu — giữ nguyên thiết kế/màu/layout đã có): sơ đồ luồng request slide 5
   "Prisma / DB" → "Go · pgx / sqlc"; số liệu E2E "17/17" → "25/25" ở cả 2 chỗ (slide 6 + 7); mô
   tả bằng chứng slide 6 cập nhật "105 legacy + 13 differential Nest↔Go, RACE 4 điểm bắt buộc";
   slide 8 sửa link tài liệu chết (`Report/REQUIREMENT_TRACEABILITY_MATRIX.md` đã bị xoá ở phiên
   trước) → trỏ sang `Plan/GO_BACKEND_REWRITE_PLAN.md`; và dòng "hiện tại" ghi rõ chạy trên
   backend Go. **Không thay ảnh chụp màn hình** trong slide (1/3/6/7 có ảnh cũ) — máy không có
   LibreOffice/công cụ render pptx để xem lại kết quả sau khi chèn ảnh mới, chèn mù có rủi ro lệch
   khung/vỡ tỉ lệ ảnh mà không kiểm chứng được, nên ưu tiên an toàn: chỉ sửa text (đã verify lại
   bằng cách đọc ngược nội dung pptx sau khi lưu, không phải đoán). Nếu muốn ảnh /portal mới nhất
   trong slide, cần làm ở máy có PowerPoint/LibreOffice để xem trước khi chốt.
5. **`Plan/KE_HOACH_V2.md`**: thêm đoạn ghi chú ngay đầu file nói rõ N1-N10 chạy trên NestJS/
   Prisma đúng như mô tả, hậu N10 backend viết lại sang Go theo yêu cầu mentor, quyết định sản
   phẩm/dữ liệu N11-N20 vẫn đúng nguyên văn, trỏ sang `Plan/GO_BACKEND_REWRITE_PLAN.md` cho giai
   đoạn Go.

**2. Chưa commit** — toàn bộ sửa đổi trên (`docs/ARCHITECTURE.md`, `docs/HARD_PROBLEMS.md`,
`Report/MENTOR_QA.md`, `Report/Affiliate_GLOBAL_Prototype_Review.pptx`, `Plan/KE_HOACH_V2.md`)
cộng `prisma.config.ts` (đã `git rm` từ phiên trước) đều đang là working-tree change, **chưa ai
yêu cầu commit** trong phiên này — theo git safety protocol, chỉ commit khi Anh Quang yêu cầu rõ.

**3. NHIỆM VỤ ĐẦU PHIÊN SAU (nếu chưa làm trong phiên này):**
- Hỏi Anh Quang có muốn commit+push đợt dọn tài liệu này không.
- Bắt đầu **brainstorm UI sáng tạo mới cho `/portal`** — yêu cầu rõ "không được tạo cảm giác AI
  chung chung". Dùng skill `superpowers:brainstorming` (hard gate: không code/scaffold trước khi
  trình bày thiết kế và được duyệt), hỏi từng câu một. Nếu phiên này đã bắt đầu brainstorm, xem
  tiếp phần hội thoại/thiết kế đã chốt tới đâu thay vì hỏi lại từ đầu.

**Môi trường:** không đổi — Postgres Docker 5433, Go API `dev:api` 3001, web `dev:web` 3000 (đã
xác nhận cả hai đang chạy 200 OK trong phiên này).

---

## Current State & Hand-off (cập nhật 22/07/2026 — brainstorm UI Creator xong, plan sẵn sàng, MỚI NHẤT)

**1. Vừa xong — brainstorm UI sáng tạo `/portal` (dùng skill `superpowers:brainstorming` rồi
`superpowers:writing-plans`, đã qua visual companion để Anh Quang chọn trực tiếp bằng mắt):**
- Concept đã chốt: **"Trạm điều hành biên giới" — Con dấu hộ chiếu** (navy `#121B3A` + vàng đồng
  `#D9A441`, tên/section dùng serif, số tiền dùng monospace). Ẩn dụ khớp đúng bất biến kỹ thuật
  thật: audit append-only = "mọi quyết định đều có dấu". Anh Quang chọn hướng này sau khi xem 3
  bảng màu trực quan (loại "Tháp kiểm soát ban đêm" và "Trạm hải quan song ngữ").
- Bố cục đã chốt: **kết hợp** header kiểu "trang bìa hộ chiếu" (tên/quốc gia/tem trạng thái KYC)
  + tab ngang kiểu dấu mộc (thay sidebar) + rail icon dọc thu nhỏ cho control phụ (đổi nước/theme/
  thông báo/đăng xuất). Đã xem mockup gần đúng trang thật (đúng nội dung KYC/chiến dịch/thu nhập/
  ví hiện có) trước khi chốt.
- **Phạm vi đã chốt: chỉ Creator dashboard trước** (không đụng Ops/Admin/Finance/Global Admin ở
  phiên này) — làm mẫu, duyệt xong mới nhân ra 4 dashboard còn lại ở phiên sau.
- Design doc: `docs/superpowers/specs/2026-07-22-portal-creator-passport-theme-design.md` (đã tự
  rà soát placeholder/mơ hồ, đã được Anh Quang duyệt).
- Kế hoạch code: `docs/superpowers/plans/2026-07-22-portal-creator-passport-theme.md` — **4 task**,
  mỗi task có bước chạy Playwright regression cụ thể + commit riêng:
  1. Thêm CSS token passport (`.app[data-shell-variant="passport"]`) vào `portal.module.css` —
     thuần cộng thêm, chưa ai gọi tới nên không ảnh hưởng gì.
  2. Thêm prop tùy chọn `variant="passport"` + `kycOk` vào `Shell` (`ui.tsx:97-190`) — nhánh
     render mới hoàn toàn tách biệt, nhánh mặc định (không truyền `variant`) giữ y hệt code hiện
     tại → 4 dashboard còn lại KHÔNG bị ảnh hưởng (bằng chứng: chạy lại đúng spec Playwright của
     chúng, phải xanh y như trước).
  3. Thêm prop tùy chọn `stamp` vào `Kpi` (`ui.tsx:225-236`) — tem trạng thái xoay nghiêng ở góc
     card, mặc định không truyền thì không đổi gì.
  4. Nối `creator/page.tsx` dùng `variant="passport"` + gắn `stamp` cho đúng 2 KPI ("Trạng thái
     KYC", "Thu nhập chờ đối soát") theo đúng quy tắc trong spec.
- **Ràng buộc bắt buộc xuyên suốt cả 4 task**: không đổi bất kỳ `data-testid` nào (toàn bộ E2E
  dựa vào đó), không đổi logic/fetch/state trong `creator/page.tsx`, dark/light toggle phải tiếp
  tục hoạt động, 4 dashboard còn lại phải render y hệt (có specs riêng để verify).
- Anh Quang chọn cách thực thi: **tự code trực tiếp trong phiên (không qua subagent-driven-
  development)** vì phạm vi nhỏ.

**2. Chưa bắt đầu code** — plan đã duyệt nhưng **0/4 task đã thực thi**. Anh Quang yêu cầu dừng ở
đây để `/compact` trước khi làm tiếp.

**3. Việc khác còn treo từ phiên trước (chưa quyết định, KHÔNG liên quan việc trên):**
- Chưa commit: `docs/ARCHITECTURE.md`, `docs/HARD_PROBLEMS.md`, `Report/MENTOR_QA.md`,
  `Report/Affiliate_GLOBAL_Prototype_Review.pptx`, `Plan/KE_HOACH_V2.md` (đợt dọn tài liệu Go
  rewrite) + `prisma.config.ts` (đã `git rm`). Cộng thêm phiên này: `.gitignore` (+`.superpowers/`),
  2 file spec/plan mới trong `docs/superpowers/`. Tất cả đang là working-tree change, **chưa ai
  yêu cầu commit**.

**4. NHIỆM VỤ ĐẦU PHIÊN SAU:**
1. Đọc `docs/superpowers/plans/2026-07-22-portal-creator-passport-theme.md` — bắt đầu thực thi
   **Task 1** (CSS token), theo đúng thứ tự Step 1→4 trong file (baseline test trước, thêm CSS,
   test lại, commit). Không cần hỏi lại Anh Quang về hướng thiết kế — đã chốt xong, chỉ còn code.
2. Sau khi xong cả 4 task của Creator: hỏi Anh Quang có muốn nhân rộng sang Ops/Admin/Finance/
   Global Admin luôn không, hay dừng lại để duyệt Creator trước.
3. Tiện thể hỏi Anh Quang có muốn commit đợt dọn tài liệu Go rewrite (mục 3 ở trên) trước khi bắt
   đầu code UI mới, để tránh gộp 2 việc không liên quan vào chung lịch sử git.

**Môi trường:** không đổi — Postgres Docker 5433, Go API `dev:api` 3001, web `dev:web` 3000. Visual
companion server (brainstorming) đã dừng sạch (`stop-server.sh`), mockup còn lưu ở
`.superpowers/brainstorm/1425-1784736190/content/` nếu cần xem lại (đã thêm `.superpowers/` vào
`.gitignore`).

---

## Current State & Hand-off (cập nhật 23/07/2026 — 4 task passport theme Creator XONG, MỚI NHẤT)

**1. Đã thực thi trọn 4 task của `docs/superpowers/plans/2026-07-22-portal-creator-passport-theme.md`,
mỗi task 1 commit riêng, tất cả regression xanh:**
- Task 1 (`1c5cd8e`) — CSS token passport-theme, gated `data-shell-variant="passport"`.
- Task 2 (`7a6a68a`) — `Shell` nhận `variant="passport"`/`kycOk`, nhánh mặc định byte-identical.
- Task 3 (`428f331`) — `Kpi` nhận `stamp` tuỳ chọn (tem xoay nghiêng).
- Task 4 (`065096f`) — Nối Creator dashboard vào variant, + 2 sửa phát sinh ngoài kế hoạch gốc
  (phát hiện lúc kiểm tra thủ công bằng Playwright MCP):
  - Nút "Đổi quốc gia" trong rail thiếu `onClick` trong bản kế hoạch gốc → mất chức năng đổi VN/PH
    so với bản cũ. Đã nối `onClick={() => setMarket(market === "VN" ? "PH" : "VN")}`.
  - Tab nav passport dùng thẻ `<nav>` làm `portal-cross-link.spec.ts` fail (spec dùng
    `page.locator("aside").getByRole("button", {name})` để tránh nhầm "Chiến dịch" với "Join chiến
    dịch" trong lưới campaign). Đã đổi thẻ bao tab nav từ `<nav>` sang `<aside>` (giống cách sidebar
    gốc vốn không lồng `<nav>` bên trong).

**2. Verify cuối cùng:** 17/17 Playwright spec xanh (9 spec Creator-touching + cross-link +
4 dashboard còn lại + role-entry). Đã kiểm tra thủ công bằng Playwright MCP: dark theme, light
theme, đổi VN/PH (cả 2 theme), modal "Nộp nội dung" ở cả dark/light — tất cả đúng palette navy/
brass, không còn xanh-tím cũ, không có "nền trắng sót lại".

**3. Lưu ý môi trường phát hiện được (không phải bug code):** có 1 tiến trình lạ đang lắng nghe
port 3001 từ trước phiên này (không phải do phiên này khởi động) — nếu cần dev thủ công `apps/web`
độc lập, nhớ set `NEXT_PUBLIC_API_BASE_URL`/`API_BASE_URL` trỏ đúng Go API (mặc định fallback trong
code là `:3001`), và xoá `.next/` nếu đổi biến môi trường mà đổi không thấy hiệu lực (webpack cache
có thể giữ giá trị inline cũ).

**4. Đã hỏi Anh Quang 2 việc tồn đọng, quyết định:**
- Rollout theme sang Ops/Admin/Finance/Global Admin: **CHƯA làm** — Anh Quang muốn tự xem Creator
  trước khi bàn tiếp. Đừng tự động rollout ở phiên sau nếu chưa được hỏi lại.
- Đợt dọn tài liệu Go rewrite (mục 3 ở phiên trước — `docs/ARCHITECTURE.md`,
  `docs/HARD_PROBLEMS.md`, `Report/MENTOR_QA.md`, pptx, `Plan/KE_HOACH_V2.md`, xoá
  `prisma.config.ts`): **vẫn để đó, chưa commit** theo yêu cầu — đừng tự ý commit đợt này ở phiên
  sau nếu chưa được hỏi lại.

**5. NHIỆM VỤ ĐẦU PHIÊN SAU:** không có việc mặc định — chờ Anh Quang chỉ đạo (có thể là duyệt
Creator xong rồi bảo rollout, hoặc bảo commit đợt dọn tài liệu, hoặc việc khác hẳn).

---

## Current State & Hand-off (cập nhật 23/07/2026 — ĐÃ ROLLOUT passport sang 4 dashboard, MỚI NHẤT)

**1. Anh Quang duyệt Creator + yêu cầu rollout → đã áp passport theme cho cả 4 dashboard còn lại**
(Ops/Admin/Finance/Global). 1 commit `4a4ba10`. Cách làm:
- Generalize `Shell` (ui.tsx): thêm prop tuỳ chọn `headerStamp?: { text; ok? }`. Creator vẫn dùng
  đường KYC cũ (`kycOk`) → render **byte-identical**, không đổi hành vi. 4 vai kia truyền
  `headerStamp` riêng: 3 vai staff khoá-nước (Ops/Admin/Finance) đóng dấu **"CÔNG VỤ"** (xanh),
  Global Admin đóng dấu **"TOÀN CẦU"** (xanh). Mỗi dashboard chỉ thêm `variant="passport"` +
  `headerStamp` vào call `<Shell>` — không đụng logic/fetch/state.
- Global: bộ chuyển scope 3 trạng thái (ALL/VN/PH) nằm trong nội dung, **không đụng**; nút globe
  rail chỉ toggle VN↔PH (vô hại vì control thật là strip trong content).
- **KHÔNG thêm tem KPI** cho 4 vai này (tem KPI là accent riêng của Creator gắn trạng thái nhị phân
  KYC/chờ-đối-soát; YAGNI cho vai khác).

**2. Sửa 1 lỗi thật lộ ra khi rollout:** font serif **Georgia render sai dấu tiếng Việt chồng**
(ầ/ằ/ẵ — dấu huyền tách rời lơ lửng, thấy rõ ở tên "Trần Vận Hành"). Đã đổi `.passportName` sang
stack `Cambria, Georgia, "Times New Roman", serif` — Cambria là font hệ thống Windows (không phải
webfont mới, đúng ràng buộc), render đúng; Georgia làm fallback. Đã cập nhật ghi chú trong file
spec thiết kế. Kiểm chứng bằng Playwright MCP: Cambria render "Trần/Quản/Vũ/Hà" đúng dấu.

**3. Verify:** 17/17 spec xanh sau rollout; chạy lại 7 spec dashboard sau khi đổi font → vẫn xanh.
Typecheck `tsc --noEmit` sạch. Kiểm tra trực quan cả 4 dashboard bằng Playwright MCP (header/tab/
rail/dấu đúng palette navy-brass, tên tiếng Việt đúng dấu). Đã dừng server dev + dọn screenshot.

**4. Trạng thái theme:** giờ **cả 5 dashboard** (creator + ops + admin + finance + global) đều dùng
passport theme. Cập nhật lại memory `project_portal_ui` cho khớp (trước ghi "chỉ Creator").

**5. VẪN CHƯA COMMIT (không đổi từ phiên trước):**
- Đợt dọn tài liệu Go rewrite (ARCHITECTURE.md, HARD_PROBLEMS.md, MENTOR_QA.md, pptx,
  KE_HOACH_V2.md, xoá prisma.config.ts) — vẫn treo, chưa được yêu cầu commit.
- 2 file `docs/superpowers/{specs,plans}/2026-07-22-portal-creator-passport-theme*` vẫn untracked
  (gồm ghi chú font vừa thêm). Chưa commit tài liệu thiết kế theo nếp phiên trước.

**6. NHIỆM VỤ ĐẦU PHIÊN SAU:** không có việc mặc định — chờ Anh Quang chỉ đạo.

---

## Current State & Hand-off (cập nhật 23/07/2026 — landing /portal đổi passport console)

**1. Redesign trang landing `/portal`** (trang chọn vai) cho khớp passport + gọn 1 khung không
scroll. 1 commit `6407de3`. Anh Quang chọn bố cục **"hàng 5 quầy ngang"**. Cách làm:
- `portal/page.tsx`: thêm `data-shell-variant="passport"` lên gốc `.app` → palette navy/brass. Hero
  thu gọn: bỏ tiêu đề 42px gradient cầu vồng → **tiêu đề serif "Trạm điều hành biên giới"**, 1 dòng
  phụ ngắn, 4 số liệu thành dải mảnh ngang. Bỏ dòng `roleGridTitle`. **Rút gọn desc 5 vai còn 1
  dòng** (đổi copy, đã được Anh Quang đồng ý khi chọn bố cục).
- `portal.module.css`: `.roleGrid` → `repeat(5,1fr)`; nén `.roleCard`/hero/khung; `.heroTitle`
  dùng serif Cambria; responsive 5→3 (≤1080) →2 (≤560). Đã xoá CSS `.roleGridTitle` (hết dùng).
- `role-buttons.tsx`: nhãn nút "Mở dashboard" → "Mở →" cho vừa thẻ hẹp. **Không đụng** `enterAs`.
- Spec: `docs/superpowers/specs/2026-07-23-portal-landing-passport-console-design.md` (untracked).

**2. Verify:** typecheck sạch; `portal-role-entry` + `portal-cross-link` + `creator-login` (6/6)
xanh (mọi `data-testid` giữ nguyên). Kiểm tra Playwright MCP ở 1440×900: `scrollHeight == innerHeight`
(900=900) → **thấy đủ 5 quầy KHÔNG scroll**; dark + light đều đúng palette, tên serif đúng dấu. Đã
dừng server + dọn screenshot.

**3. TRẠNG THÁI PASSPORT THEME:** giờ **cả khu /portal** (landing + 5 dashboard) đều passport. Xong
mạch redesign UI /portal.

**4. VẪN CHƯA COMMIT (giữ nguyên, chưa được yêu cầu):**
- Đợt dọn tài liệu Go rewrite (ARCHITECTURE.md, HARD_PROBLEMS.md, MENTOR_QA.md, pptx, KE_HOACH_V2.md,
  xoá prisma.config.ts).
- 3 file tài liệu thiết kế trong `docs/superpowers/{specs,plans}/` (2 file passport theme + 1 file
  landing console vừa tạo) — vẫn untracked theo nếp chưa commit tài liệu thiết kế.

**5. NHIỆM VỤ ĐẦU PHIÊN SAU:** không có việc mặc định — chờ Anh Quang chỉ đạo.

---

## Current State & Hand-off (cập nhật 23/07/2026 — cập nhật README/PRODUCT/pptx theo Go+UI mới, MỚI NHẤT)

**1. Cập nhật 3 tài liệu Anh Quang yêu cầu (CHƯA COMMIT):**
- `README.md`: lệnh chạy đối chiếu `package.json` thật — vốn ĐÃ đúng (Go `dev:api` 3001, `dev:web`
  3000). Lệch thật: README trước chỉ dẫn mở `/mockup` `/vn` `/ph`, **thiếu hẳn `/portal`** (UI thật +
  money spine). Đã thêm `/portal` làm màn chính, sửa bảng tài khoản demo + kịch bản demo sang
  `/portal/{creator,ops,admin,finance,global}`, sửa dòng "Cấu trúc", thêm intro về Trung tâm điều
  hành `/portal` + backend Go.
- `docs/PRODUCT.md`: neo personas vào dashboard `/portal` thật + mô-típ "Trạm điều hành biên giới";
  thêm subsection **"Trạng thái hiện thực hoá (build state)"** đối chiếu Go code: QĐ-1/2/3 + QĐ-4
  (reclaim/strike — migration 000003, cmd/reclaim) + QĐ-5 (waitlist) ĐÃ build; QĐ-6/7/8 (apply-duyệt,
  platform fee, escrow) mới thiết kế + chừa schema, CHƯA build runtime.
- `Report/Affiliate_GLOBAL_Prototype_Review.pptx`: **thay 6 ảnh screenshot UI cũ (xanh-tím) → passport
  dark** (Creator s1, Ops s3, Finance s6, Landing+Admin+Global s7). Chụp Playwright MCP dark theme,
  đúng tỉ lệ box (không méo), thay bằng python-pptx giữ nguyên toạ độ/kích thước. Backup:
  scratchpad `pptx_backup.pptx`.
- Ngoài 3 file: sửa `docs/HARD_PROBLEMS.md` kịch bản demo 15' từ mockup (V01–V13) → `/portal` theo vai.

**2. Data pptx đã verify khớp thực tế:** 25 E2E test ✓, 7 spec /portal ✓, 6 route /portal ✓,
105/105 + 13 differential ✓, Go ✓. Màu chrome deck giữ nguyên (navy + accent màu-vai TRÙNG portal).

**3. Số bảng schema — Anh Quang CHỐT: sửa thành 20.**
- ✅ `docs/DATA_MODEL.md`: đã sửa 3 chỗ 18→20 (dòng "Nguyên tắc lean", "→ 20 bảng...", và mục 6
  "Tình trạng hiện thực hoá" viết lại theo Go: 20 bảng = init_lean_schema + sessions + reward_rules
  + reconciliation_lines, migration `000001_init_lean_schema` + `000003_join_slots_waitlist`).
- ⏳ **pptx CHƯA sửa được 18→20** — file đang **MỞ TRONG POWERPOINT** (có lock `~$...pptx`), python-pptx
  ghi bị `PermissionError`. Script sẵn ở `/tmp/fix18.py` (đổi run "18 bảng"→"20 bảng", value "18"→"20",
  "còn 18 lean"→"còn 20 lean"). **VIỆC CÒN LẠI DUY NHẤT: Anh Quang đóng PowerPoint (đừng lưu đè kẻo mất
  6 ảnh vừa thay) → chạy lại `python /tmp/fix18.py` (hoặc viết lại script) là xong.** 3 chỗ cần đổi:
  slide 2 (TextBox "18 bảng lean..."), slide 5 (title "18 bảng lean" + "còn 18 lean"), slide 7 (value "18").

**4. LƯU Ý pptx:** máy KHÔNG có LibreOffice → không render kiểm tra file cuối bằng mắt được; 6 ảnh là
screenshot thật đã xem qua Playwright, đặt đúng hình học ảnh cũ (tỉ lệ khớp box, không méo). Ảnh có
badge "N" (Next dev) nhỏ góc trái-dưới, rất nhỏ ở cỡ slide. Backup pptx gốc: scratchpad `pptx_backup.pptx`.

**5. COMMIT — Anh Quang CHỐT: ĐỂ ĐÓ, CHƯA COMMIT.** TẤT CẢ thay đổi tài liệu (đợt này: README, PRODUCT,
pptx, DATA_MODEL, HARD_PROBLEMS + đợt dọn Go rewrite trước + 3 file tài liệu thiết kế passport trong
`docs/superpowers/`) VẪN CHƯA COMMIT — giữ nguyên working tree, chờ Anh Quang quyết sau.

**6. NHIỆM VỤ ĐẦU PHIÊN SAU:** chỉ còn 1 việc treo — chạy `/tmp/fix18.py` để đổi 18→20 trong pptx sau
khi Anh Quang đóng PowerPoint. Ngoài ra không có việc mặc định, chờ Anh Quang chỉ đạo.

---

## Current State & Hand-off (cập nhật 23/07/2026 — mở ngrok cho mentor xem UI, MỚI NHẤT)

**1. YÊU CẦU:** "dùng ngrok chọt vô localhost để mentor check UI".

**2. ĐÃ LÀM (CHƯA COMMIT):**
- Cài ngrok qua winget (`Ngrok.Ngrok`) → bản 3.3.1 **bị server từ chối** (`ERR_NGROK_121`, tài khoản
  yêu cầu tối thiểu 3.20.0) → chạy `ngrok update` lên **3.39.10**. Authtoken của Anh Quang **đã lưu**
  ở `C:\Users\dangq\AppData\Local\ngrok\ngrok.yml` (một lần, không phải làm lại).
  ngrok.exe **không có trong PATH**, đường dẫn thật:
  `%LOCALAPPDATA%\Microsoft\WinGet\Packages\Ngrok.Ngrok_Microsoft.Winget.Source_8wekyb3d8bbwe\ngrok.exe`
  (script tự dò nên không cần PATH).
- `scripts/share.mjs` (MỚI) + script `share` trong `package.json`: dùng lại `dev:api` (3001) và
  `dev:web` (3000) đang chạy — thiếu cái nào thì tự bật — rồi mở tunnel, in sẵn link.
  Chạy: `corepack pnpm share`.
- `apps/web/next.config.mjs`: rewrite `/api-proxy/:path*` → API Go (`API_BASE_URL`, mặc định
  `http://localhost:3001`) + `allowedDevOrigins` cho domain ngrok.
- `apps/web/src/lib/api-base.ts` (MỚI): gom 9 chỗ khai báo trùng `const API_BASE = ...` về một chỗ.
  **Trình duyệt LUÔN gọi đường tương đối `/api-proxy`**; đích thật do server quyết lúc khởi động.
- 9 file `*-client.ts` (auth/kyc/campaign/content/country/earnings/payout/reconciliation/audit) đổi
  sang `import { API_BASE } from "./api-base"`.
- `playwright.config.ts` + `scripts/run-go-playwright.mjs`: **bỏ `NEXT_PUBLIC_API_BASE_URL`**, chỉ giữ
  `API_BASE_URL` phía server.
- `README.md`: thêm mục "Chia sẻ UI ra ngoài cho mentor xem (ngrok)".

**3. LINK CHO MENTOR (domain CỐ ĐỊNH của tài khoản, không đổi giữa các lần chạy):**
`https://triumph-entree-statue.ngrok-free.dev/portal`
Chỉ sống khi máy bật + `corepack pnpm share` đang chạy. ngrok free hiện trang cảnh báo ở lần mở đầu
→ mentor bấm **"Visit Site"** (không tắt được ở gói free; đây KHÔNG phải lỗi app).

**4. HAI BUG ĐÃ ĐÀO RA & SỬA TẬN GỐC (bài học, đừng lặp lại):**
- **Bug 1 — bundle nhúng cứng `localhost:3001`:** `NEXT_PUBLIC_*` bị inline lúc biên dịch, nên trình
  duyệt mentor gọi localhost của **máy mentor** → Chrome hiện popup "Local Network Access" + banner
  đỏ "Không kết nối được API auth". Sửa: đường tương đối `/api-proxy` + rewrite (cùng origin, hết CORS).
- **Bug 2 — hai tiến trình Next ghi chung `apps/web/.next`:** chạy `test:web` trong lúc `dev:web` mở
  làm bundle bị nhúng cổng test `localhost:3101`, server 3000 phục vụ đúng bundle hỏng đó ra tunnel
  (mentor thấy lại banner sau khi đã "sửa xong"). Sửa: không nhúng gì vào bundle nữa + bỏ
  `NEXT_PUBLIC_API_BASE_URL` khỏi cấu hình E2E. **Vẫn còn rủi ro lỗi biên dịch tạm thời nếu chạy
  `test:web` khi `dev:web` đang mở — đang demo thì đừng chạy test.**
- Đã thử hướng "server thứ hai + `distDir=.next-share`" rồi **BỎ**: Next tự ghi đè `tsconfig.json` +
  `next-env.d.ts` trỏ vào distDir lạ → bẩn repo, hỏng typecheck. Đã revert 2 file đó về sạch.

**5. VERIFY (đã chạy thật, không suy đoán):** bundle phục vụ ra tunnel không còn `localhost:3001/3101`;
xoá sạch localStorage → mở link → bấm Creator → đăng nhập mới thành công, KHÔNG banner, dashboard 8
chiến dịch + dấu ĐÃ DUYỆT; `/api-proxy/health` qua link trả `{"db":"up","status":"ok"}`;
**E2E 25/25 passed** (giờ test chạy đúng đường `/api-proxy` mà mentor dùng); lint + typecheck sạch.

**6. LƯU Ý MÔI TRƯỜNG:** trong lúc sửa đã **kill server `dev:web` 3000 cũ** của Anh Quang và **xoá
`apps/web/.next`** (bắt buộc, để build lại sạch). Terminal `dev:web` cũ là tiến trình chết, đóng đi.
Lần sau chạy lại bình thường: `dev:api` + `dev:web`, rồi `corepack pnpm share`.

**7. CHƯA COMMIT — toàn bộ vẫn treo** (đợt ngrok này: `api-base.ts`, 9 file `*-client.ts`,
`next.config.mjs`, `playwright.config.ts`, `scripts/share.mjs`, `scripts/run-go-playwright.mjs`,
`package.json`, `README.md` + tất cả đợt tài liệu Go/passport trước đó).

**8. NHIỆM VỤ ĐẦU PHIÊN SAU:** (a) vẫn treo việc pptx 18→20 — chạy `/tmp/fix18.py` sau khi Anh Quang
đóng PowerPoint; (b) Anh Quang chưa quyết commit. Ngoài ra không có việc mặc định.

---

## Current State & Hand-off (cập nhật 23/07/2026 — TUẦN 7 Go rewrite: Google Cloud staging, MỚI NHẤT)

**1. YÊU CẦU:** "đọc log.md và GO_BACKEND_REWRITE_PLAN, triển khai week7". Tuần 1–6 đã HOÀN TẤT từ
trước (36/36 route, 105/105, 25/25 E2E). Tuần 7 = **Google Cloud staging**.

**2. QUYẾT ĐỊNH PHẠM VI — Anh Quang CHỐT: "Chuẩn bị đủ, chưa tốn tiền".** Lý do phải hỏi: gcloud trên
máy **chưa đăng nhập tài khoản nào**, và Cloud SQL là dịch vụ tính tiền thật (~10–25 USD/tháng).
Nên làm trọn phần code/hạ-tầng-as-code + **diễn tập thật bằng Docker local**, chưa bấm deploy GCP.

**3. ĐÃ LÀM (CHƯA COMMIT):**
- `scripts/smoke.mjs` (MỚI): smoke money-spine **26 bước** qua HTTP thuần, chạy với **bất kỳ base
  URL** (container local hoặc Cloud Run). Gồm cả khẳng định âm tính: 401/403/409, join lặp không nhân
  đôi suất, lock lần hai 409, settle lần hai 409. Lệnh: `corepack pnpm smoke <url>`.
- `compose.staging.yaml` + `scripts/staging-rehearsal.mjs` (MỚI): diễn tập trọn trình tự release
  bằng **đúng image production**, DB riêng `affiliate_staging` (không đụng DB dev), tự dọn.
  Lệnh: `corepack pnpm staging:rehearsal` (thêm `--keep` để giữ stack xem tay).
- `deploy/gcp/` (MỚI, 9 file): `env.example.sh`, `00-bootstrap`, `10-build-push` (image theo commit
  SHA, không dùng `latest`), `20-database` (Cloud SQL + Secret Manager, mật khẩu sinh ngẫu nhiên
  không lọt vào repo), `30-migrate` (backup → job → version), `40-deploy-api` (revision `--no-traffic`
  → smoke → mới chuyển traffic), `50-reclaim` (job + Scheduler OIDC), `60-monitoring` (4 alert
  policy), `90-rollback`, `README.md`. Đã kiểm `bash -n` cả 9 file.
- `docs/RUNBOOK_STAGING.md` (MỚI): kiến trúc, trình tự release, cách deploy frontend trỏ API staging
  (chỉ cần `API_BASE_URL` vì web đã đi qua `/api-proxy`), **bảng xử lý sự cố**, rollback + restore.
- Sửa code: `internal/config` nhận DSN Cloud SQL unix socket; `Dockerfile` thêm `ENV PORT=8080`;
  `internal/httpapi/middleware/middleware_test.go` (MỚI) chống lộ token/OTP/KYC trong log.
- `package.json`: thêm script `smoke` + `staging:rehearsal`. `.gitignore`: bỏ qua `deploy/gcp/env.sh`
  và `.last-image`.
- `Report/GO_WEEK7_COMPLETION.md` (MỚI) + cập nhật trạng thái Tuần 7 trong `Plan/GO_BACKEND_REWRITE_PLAN.md`.

**4. HAI KHIẾM KHUYẾT THẬT ĐÃ TÌM RA NHỜ DIỄN TẬP (sẽ làm hỏng lần deploy đầu):**
- `normalizeDatabaseURL` **từ chối** DSN Cloud SQL unix socket (`postgres://u:p@/db?host=/cloudsql/...`
  có `Host == ""`) → API sẽ chết ngay ở `config_invalid` trên revision đầu tiên. Đã sửa + 2 test.
- `Dockerfile` `EXPOSE 8080` nhưng không đặt `PORT`, code mặc định `3001` → container nghe sai cổng.
  Đã thêm `ENV PORT=8080`.
- Lưu ý vận hành: `Dockerfile` production phải build với **context `apps/api-go`** (không phải gốc
  repo); build sai context chỉ "qua" khi còn cache lần build đúng trước đó.

**5. BẰNG CHỨNG (chạy thật trong phiên, không trích báo cáo cũ):** `staging-rehearsal` → **PASS 7/7**
(image non-root · migration job trên DB rỗng `version=3 dirty=false` · container healthy PORT=8080 ·
**smoke 26 bước xanh** · reclaim job chạy 2 lần không side effect · log 0/7 mẫu cấm khớp trên 31 dòng
`http_request` · graceful shutdown `api_stopped`). Thêm: `gofmt` sạch, `pnpm lint` PASS,
`pnpm test:api` PASS, `bash -n` 9 script PASS.

**6. GATE TUẦN 7: 1/4 ĐẠT TRỌN (log không lộ bí mật), 3/4 ĐẠT PHẦN kiểm chứng được.** Phần chưa làm
được vì cần cloud thật: migration trên **bản restore**, **Web** staging, và **Scheduler OIDC** tạo
thật. Không có emulator cho Cloud Run/SQL/Scheduler nên không giả lập được — đã ghi rõ ranh giới ở
mục 0 và mục 5 của `Report/GO_WEEK7_COMPLETION.md`.

**7. ĐỂ ĐÓNG TUẦN 7 TRÊN GCP:** Anh Quang `gcloud auth login` + bật billing, rồi chạy tuần tự
`00 → 20 → 10 → 30 → 40 → 50 → 60` trong `deploy/gcp/` (xem `deploy/gcp/README.md`). Xoá Cloud SQL
sau khi demo mentor thì chi phí gần bằng không.

**8. CHƯA COMMIT — toàn bộ vẫn treo** (đợt Tuần 7 này + đợt ngrok + đợt tài liệu Go/passport trước).

**9. NHIỆM VỤ ĐẦU PHIÊN SAU:** (a) Tuần 8 (soak, rollback rehearsal, bàn giao) — nhưng phụ thuộc có
staging thật; (b) pptx 18→20 vẫn treo (chờ đóng PowerPoint); (c) Anh Quang chưa quyết commit.

---

## Current State & Hand-off (cập nhật 23/07/2026 — THỬ DEPLOY GCP: chặn ở billing, MỚI NHẤT)

**1. YÊU CẦU:** "đọc log.md để tiếp tục deploy — tao đã tạo folder sẵn" (Cloud Shell,
`~/Affiliate_Global`).

**2. ĐÃ COMMIT + PUSH (Anh Quang chốt, lần đầu sau nhiều phiên treo).** Toàn bộ 47 file tồn đọng gom
thành 3 commit có nghĩa, đẩy lên `origin/main`:
- `d8fc899 fix(web)` — trình duyệt gọi `/api-proxy` tương đối, bỏ hẳn việc nhúng origin API lúc build.
- `080e350 feat(deploy)` — trình tự release Cloud Run + smoke + diễn tập local.
- `ef7315c docs` — tài liệu theo stack Go, xoá `prisma.config.ts` và nhóm file audit day-15..20.

Lý do phải push (không phải upload zip): `10-build-push.sh` gắn image theo **commit SHA**; code chưa
commit thì image mang SHA của commit cũ → rollback mất dấu, không biết revision nào ứng với code nào.

**3. KHIẾM KHUYẾT THẬT THỨ BA (tìm ra khi rà lại trước lúc bấm deploy):** trình tự release **thiếu
hẳn bước seed**. `30-migrate` chỉ tạo schema rỗng, mà `40-deploy-api` lại chặn cutover bằng smoke →
không có country VN/PH thì 404, không có `role_assignment` thì Ops duyệt KYC 403. Lần deploy đầu sẽ
dừng ở bước 40 **sau khi** Cloud SQL đã tạo và bắt đầu tính tiền. Đã thêm `deploy/gcp/35-seed.sh`
(Cloud Run Job, `/app/seed` chạy `reference.sql` rồi `demo.sql`, idempotent, `SEED_DEMO=0` cho môi
trường thật) + cập nhật README deploy và `docs/RUNBOOK_STAGING.md`. **Trình tự đúng giờ là
`00 → 20 → 10 → 30 → 35 → 40 → 50 → 60`.**

**4. ĐIỂM CHẶN — BILLING ĐÓNG.** Cloud Shell clone code OK (`ef7315c`), nhưng:
`gcloud billing accounts list` → `019086-F34489-C22C7E · OPEN: False`. Billing account duy nhất đang
đóng nên không gắn được vào project nào. Không có đường vòng: Artifact Registry, Cloud SQL và **cả
Cloud Run** đều đòi project bật billing (đổi DB sang nhà cung cấp free bên ngoài cũng không cứu).

**5. QUYẾT ĐỊNH CỦA ANH QUANG: KHÔNG gắn thẻ.** Dừng nhánh deploy GCP. Mentor tiếp tục xem hệ thống
qua **ngrok** — `corepack pnpm share`, một link duy nhất phục vụ cả UI lẫn API vì web đi qua
`/api-proxy`. Ranh giới Tuần 7 giữ nguyên như đã báo cáo: script + diễn tập đầy đủ, chưa deploy cloud
thật — đã ghi rõ vào `Report/GO_WEEK7_COMPLETION.md` mục 6 kèm output billing làm bằng chứng.

**6. NHIỆM VỤ ĐẦU PHIÊN SAU:** (a) Tuần 8 vẫn treo vì phụ thuộc staging thật; (b) pptx 18→20 vẫn
treo (chờ đóng PowerPoint); (c) nếu sau này có billing account mở → chạy đúng 8 lệnh ở mục 6 của báo
cáo Tuần 7. Cloud Shell còn bản clone ở `~/Affiliate_Global/app` (miễn phí, xoá lúc nào cũng được).
