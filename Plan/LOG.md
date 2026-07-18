# LOG — đọc file này trước, đừng đọc lại toàn bộ project

> Mục đích: giúp một phiên Claude Code mới nắm được trạng thái dự án trong vài giây, không
> phải quét lại `Plan/`, `docs/`, và toàn bộ codebase mỗi lần mở lại. Cập nhật file này ngay
> sau khi hoàn tất một mốc việc lớn (xong 1 ngày kế hoạch, xong 1 gate, sửa lỗi hệ thống lớn).
> Nếu thông tin ở đây mâu thuẫn với code/docs thực tế, tin vào thực tế và sửa lại file này.

## Trạng thái ngay bây giờ (2026-07-18)

- Tuần 1 (5 ngày kế hoạch) đã xong. Gate gần nhất: **G5 GO**.
- Có một walking skeleton chạy thật: `Next.js (apps/web) → NestJS (apps/api) → PostgreSQL`,
  route `/vn` và `/ph` render context thật từ DB. Xem chi tiết + evidence:
  `docs/product/G5_WEEK1_GATE.md`.
- **Chưa có business feature nào** (không Auth, không KYC, không Campaign, không Money/Ledger,
  không Payout). Đừng giả định các module đó tồn tại chỉ vì tài liệu thiết kế đã khóa.
- Việc tiếp theo: Ngày 6 — Auth/session adapter + `User` + `CreatorCountryProfile`. Chi tiết ở
  `docs/product/G5_WEEK1_GATE.md` mục cuối, và `Plan/KE_HOACH_CHI_TIET_TUAN_1.md` mục 15.
- Git: đã commit đến hết Ngày 4 (`aaa7b88`). Ngày 5 (walking skeleton) đã làm xong nhưng
  **có thể chưa commit** — kiểm tra `git log`/`git status` trước khi giả định.

## Đọc gì khi cần, đừng đọc mọi thứ

| Cần biết gì | Đọc file nào (đừng đọc file khác trừ khi thật sự cần) |
|---|---|
| Trạng thái tổng quan, việc tiếp theo | File này + `Plan/00_PROJECT_EXECUTION_LOG.md` |
| Đề bài gốc (22 Must, tiêu chí chấm điểm) | `Plan/docs/Book1.xlsx` (file binary — xem cách đọc bên dưới) |
| Roadmap 5 tuần, gate G0-G25 | `Plan/KE_HOACH_TRIEN_KHAI_5_TUAN.md` |
| Kế hoạch chi tiết theo ngày của tuần đang chạy | `Plan/KE_HOACH_CHI_TIET_TUAN_<n>.md` |
| Requirement traceability, status từng Must | `docs/product/RTM.md` |
| Quyết định nghiệp vụ đã khóa + lý do | `docs/product/DECISION_LOG.md` |
| Data model | `docs/architecture/ERD.md`, `apps/api/prisma/schema.prisma` |
| API convention/endpoint | `docs/architecture/API_CONTRACT.md` |
| Cách chạy dự án | `README.md` |
| Evidence + known-issues kỹ thuật của gate gần nhất | `docs/product/G<n>_*.md` mới nhất |

Đừng mở tất cả file trên trong cùng một phiên trừ khi câu hỏi thật sự cần — phần lớn task
chỉ cần file này + 1-2 file liên quan trực tiếp.

## Book1.xlsx — cách đọc không cần Excel/Python

`.xlsx` là file zip. Không có Excel/Python trong môi trường này; cách đã dùng và hoạt động:

```bash
unzip -o "Plan/docs/Book1.xlsx" -d <thư mục scratch>
# strings nằm trong xl/sharedStrings.xml, cell reference nằm trong xl/worksheets/sheet1.xml
# dùng node để parse XML thủ công (regex đơn giản là đủ, xem lịch sử phiên trước để lấy script mẫu)
```

## Gotcha kỹ thuật đã tốn thời gian debug — đừng lặp lại

1. **Prisma 7 (`prisma-client` generator, moduleFormat esm) không tự đọc `DATABASE_URL`.**
   Bắt buộc `new PrismaClient({ adapter: new PrismaPg({ connectionString }) })` — xem
   `apps/api/src/prisma.service.ts`.
2. **Generated Prisma client là ESM `.ts` chưa compile**, không phải `.js`. API phải chạy qua
   `tsx` (`pnpm dev`/`pnpm start` trong `apps/api`), không chạy trực tiếp `node dist/main.js`.
   `pnpm build` (tsc) chỉ để chứng minh code tự viết compile sạch, không phải entrypoint thật.
3. **NestJS dependency injection theo type bị vỡ khi chạy qua tsx/esbuild** (esbuild không emit
   `design:paramtypes`). Mọi constructor injection phải dùng `@Inject(Token)` tường minh — xem
   `health.controller.ts`, `markets.controller.ts`, `markets.service.ts` làm mẫu.
4. **`pnpm` không có sẵn trên PATH trong môi trường này** (chỉ `corepack pnpm` hoạt động).
   Mọi lệnh `pnpm ...` lồng bên trong script của `package.json` phải viết là
   `corepack pnpm ...`, kể cả trong `playwright.config.ts` (`webServer.command`).
5. **`pnpm --filter <pkg> ...` in ra dòng cảnh báo "No projects matched the filters ..." kèm
   đường dẫn có dấu ngoặc** (tên thư mục project chứa `(GLOBAL)`) — đây là noise vô hại, lệnh
   vẫn chạy đúng target sau dòng cảnh báo đó. Đừng nhầm là lỗi thật.
6. **Volume Postgres local mất password giữa các phiên** nếu `.env` không được giữ lại (file bị
   gitignore, không nằm trong repo). Nếu gặp `P1000: Authentication failed`, đó là dấu hiệu
   volume cũ + `.env` mới lệch nhau — hỏi user trước khi `docker compose down -v` (data local
   chỉ là synthetic theo policy, nhưng vẫn phải hỏi trước khi xoá).
7. **`apps/api` tự nạp `.env` từ repo root** qua `apps/api/src/load-env.ts` (import đầu tiên
   trong `main.ts` và trong test) — dùng `process.loadEnvFile()` built-in của Node, không cần
   dependency. Vì vậy `pnpm dev:api`/`dev:web`/`pnpm test` **không** cần source `.env` thủ công
   nữa. Chỉ các lệnh `db:*` (gọi thẳng `prisma` CLI) mới còn cần source `.env` thủ công. Nếu
   thêm app/service Node mới, cân nhắc áp dụng cùng pattern để tránh lặp lại bug "chạy trực
   tiếp thì DATABASE_URL undefined, /health trả 503" đã xảy ra sau G5.

## Cách cập nhật file này

Sau khi hoàn tất một mốc việc (xong N ngày kế hoạch, xong 1 gate, sửa 1 lỗi hệ thống tốn thời
gian debug), sửa 3 phần: "Trạng thái ngay bây giờ", thêm gotcha mới nếu có, và đảm bảo bảng
"Đọc gì khi cần" vẫn trỏ đúng file mới nhất. Không cần giữ lịch sử ở đây — lịch sử chi tiết đã
có trong `Plan/00_PROJECT_EXECUTION_LOG.md` và các file gate `docs/product/G<n>_*.md`.
