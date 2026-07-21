# Affiliate GLOBAL

Nền tảng affiliate marketing **đa quốc gia** (Việt Nam + Philippines), MVP chạy local: một luồng
tiền **chạy thật end-to-end** trên 2 nước có tiền tệ / thuế / mức rút tối thiểu khác nhau, cộng bộ
**prototype nhiều màn** để trình bày tư duy product.

## Nó làm được gì

- **Cách ly theo nước**: VN (VND, thuế 10%, rút tối thiểu 200.000) và PH (PHP, thuế 8%, rút tối
  thiểu 50.000). Server không tin `country` từ client — mọi truy vấn scope theo nước của phiên.
- **Luồng tiền trọn vẹn**: login SSO (mock) → chọn nước → KYC (duyệt theo từng field) → join
  campaign (**snapshot điều khoản**) → nộp content → Ops duyệt (**earning exactly-once**) → sổ cái
  **append-only** → Finance đối soát khoá batch → `AVAILABLE` → rút tiền (OTP + reserve) → provider
  mock **3 kết cục**: `PAID` · `FAIL`→hoàn tiền 1 lần · `UNKNOWN`→giữ chờ đối soát tay.
- **Audit trail (AD-02)**: mọi quyết định staff để lại vết append-only, ghi trong cùng transaction
  với hành động (không có quyết định thiếu dấu, không có dấu cho quyết định đã rollback).
- **RBAC 4 vai** + cách ly nước: cross-country → 404, sai vai → 403, transition sai → 409.

Chi tiết "vì sao" xem `docs/PRODUCT.md`, `docs/DATA_MODEL.md`, `docs/ARCHITECTURE.md`; 7 bài toán khó
xem `docs/HARD_PROBLEMS.md`.

## Yêu cầu

- **Node.js `24.11.1`** (xem `.nvmrc`)
- **pnpm `10.15.1`** qua Corepack: `corepack enable && corepack prepare pnpm@10.15.1 --activate`
- **Docker Desktop** (chỉ để chạy PostgreSQL local — API và Web chạy native, không trong container)

## Cài đặt từ máy sạch — 1 lệnh

```powershell
git clone <repo-url>
cd affiliate-global
corepack pnpm install

corepack pnpm bootstrap
```

`bootstrap` (script `scripts/setup.mjs`) làm tất cả và **an toàn chạy lại nhiều lần**:

1. Tạo `.env` từ `.env.example` nếu chưa có (mật khẩu local/synthetic — đổi nếu cần bảo mật).
2. `docker compose up -d postgres` rồi chờ Postgres nhận kết nối.
3. `prisma generate` → `prisma migrate deploy` (áp mọi migration lên DB rỗng) → `prisma db seed`
   (VN/PH + tài khoản 4 vai + campaign demo).

> Docker Desktop phải đang chạy trước khi gọi `bootstrap`.

## Chạy app

Hai terminal (API tự nạp `.env` khi khởi động — không cần source env thủ công cho `dev:*`/`test`):

```powershell
corepack pnpm dev:api    # NestJS  → http://localhost:3001
corepack pnpm dev:web    # Next.js → http://localhost:3000
```

Mở trình duyệt:

- `http://localhost:3000/mockup` — **13 màn prototype** (V01–V13) + 2 kịch bản click xuyên màn
- `http://localhost:3000/vn` · `/ph` — ngữ cảnh nước (nạp từ Postgres qua API)
- `http://localhost:3001/health` — `{"status":"ok","db":"up"}` khi Postgres sống

Công tắc **VI/EN** và **$USD** ở góc phải mỗi màn prototype; đổi **VN/PH** để thấy cách ly dữ liệu +
tiền tệ.

## Tài khoản demo (mock SSO — đăng nhập bằng email)

"SSO" là mock: mỗi màn có nút "đăng nhập vai …" gọi `POST /auth/mock-login` với email tương ứng →
tạo user + session thật trong DB. Domain: `@demo.affiliate.gl`.

| Vai | Email | Dùng cho |
|---|---|---|
| **Creator** | *email mới bất kỳ* | Tự tạo khi đăng nhập lần đầu (mỗi email = 1 creator) |
| **Local Ops** | `ops.vn@` · `ops.ph@` | Duyệt KYC + content (V10) |
| **Local Admin** | `admin.vn@` · `admin.ph@` | Tạo campaign / builder (V11) |
| **Local Finance** | `finance.vn@` · `finance.ph@` | Đối soát + chi trả (V12) |
| **Global Admin** | `global.admin@` | Xem nhật ký audit toàn cục (V13) — vai duy nhất vượt biên giới |

Kịch bản demo gợi ý: đăng nhập creator mới → chọn VN → KYC → (Ops duyệt) → join campaign → nộp
content → (Ops duyệt) → xem thu nhập → (Finance đối soát + khoá) → rút tiền OTP → (Finance settle) →
(Global Admin xem audit).

## Kiểm thử

```powershell
corepack pnpm lint        # eslint (apps/api + apps/web)
corepack pnpm typecheck   # tsc --noEmit cho api + web
corepack pnpm test        # API: node:test (105 test, DB-backed) · Web: Playwright E2E (17 test)
corepack pnpm build       # tsc build (api) + next build (web)

corepack pnpm verify      # cả 4 bước trên
```

`pnpm test` cần Postgres đang chạy + đã seed (xem phần cài đặt). Playwright tự khởi động API + Web
nếu chưa chạy.

## Reset DB sạch

```powershell
docker compose down -v     # xoá volume Postgres local (dữ liệu synthetic)
corepack pnpm bootstrap    # dựng lại từ đầu
```

## Cấu trúc

```text
apps/api      NestJS modular monolith — auth/country/kyc/campaign/content/ledger/
              reconciliation/payout/audit; Prisma 7 + PostgreSQL 17
apps/web      Next.js App Router — 13 màn prototype (/mockup) + route ngữ cảnh nước (/vn /ph)
apps/api/prisma  schema lean 18 bảng + migrations + seed.sql
docs/         PRODUCT / DATA_MODEL / ARCHITECTURE / HARD_PROBLEMS (nguồn sự thật về phạm vi + vì sao)
Plan/         KE_HOACH_V2.md (kế hoạch) + LOG.md (đọc trước để nắm trạng thái)
apps/worker, packages/*   scaffolding dành sẵn — CHƯA dùng trong bản V2
```

## Xử lý sự cố

- **`/health` trả 503 / E2E timeout "webServer"**: Docker Desktop tắt → Postgres mất. Kiểm
  `docker info`, chạy `docker compose up -d postgres`, đợi healthy rồi thử lại (API tự reconnect).
- **`P1000: Authentication failed`** khi migrate/seed: volume Postgres tạo bằng mật khẩu khác `.env`
  hiện tại. Reset: `docker compose down -v` rồi `corepack pnpm bootstrap` (dữ liệu chỉ là synthetic).
- **`DATABASE_URL` not resolved** khi chạy `db:*` trực tiếp: các lệnh `prisma` CLI không tự nạp
  `.env`. `bootstrap` đã nạp giúp; nếu chạy tay, nạp env trước (PowerShell:
  `Get-Content .env | ForEach-Object { if ($_ -match '^(\w+)=(.*)$') { [Environment]::SetEnvironmentVariable($matches[1], $matches[2]) } }`).
- **Port bận**: đổi `AFFILIATE_DB_PORT` (Postgres), hoặc giải phóng `3000`/`3001` trước khi chạy.
- **`corepack pnpm setup` chạy nhầm PATH-setup của pnpm**: dùng đúng tên script `bootstrap`
  (`setup` là lệnh built-in của pnpm).
