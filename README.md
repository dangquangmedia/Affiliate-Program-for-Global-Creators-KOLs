# Affiliate GLOBAL

Nền tảng affiliate marketing **đa quốc gia** (Việt Nam + Philippines), MVP chạy local: một luồng
tiền **chạy thật end-to-end** trên 2 nước có tiền tệ / thuế / mức rút tối thiểu khác nhau, cộng bộ
**prototype nhiều màn** để trình bày tư duy product.

UI vận hành thật là **Trung tâm điều hành `/portal`** — trang chọn vai + 5 dashboard theo vai
(giao diện "Trạm điều hành biên giới": navy/brass, header hộ chiếu, tab dấu mộc). Backend là **Go
modular monolith** (`apps/api-go`); NestJS cũ chỉ còn làm oracle đối chiếu, không nằm trên runtime.

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

- **Go `1.26.5`** (backend, migration, seed, reclaim)
- **Node.js `24.11.1`** (chỉ frontend và test tooling; xem `.nvmrc`)
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
3. Go migration → reference seed → demo seed (VN/PH + tài khoản 4 vai + campaign demo).

> Docker Desktop phải đang chạy trước khi gọi `bootstrap`.

## Chạy app

Hai terminal (Go API tự nạp `.env`; không cần source env thủ công):

```powershell
corepack pnpm dev:api    # Go API  → http://localhost:3001
corepack pnpm dev:web    # Next.js → http://localhost:3000
```

Mở trình duyệt:

- `http://localhost:3000/portal` — **Trung tâm điều hành (UI thật)**: trang chọn vai + **5 dashboard
  theo vai** (Creator · Local Ops · Local Admin · Local Finance · Global Admin). **Toàn bộ luồng tiền
  end-to-end chạy ở đây**, gọi API Go thật. Đây là màn chính để demo.
- `http://localhost:3000/mockup` — **13 màn prototype tĩnh** (V01–V13) + 2 kịch bản click xuyên màn —
  dùng trình bày tư duy product, KHÔNG phải luồng chạy thật.
- `http://localhost:3000/vn` · `/ph` — ngữ cảnh nước (nạp từ Postgres qua API) — kiểm chứng cách ly
  country-context ở tầng route.
- `http://localhost:3001/health` — `{"status":"ok","db":"up"}` khi Postgres sống.

Trong `/portal`: nút **sáng/tối** và **$USD** ở rail/topbar; đổi **VN/PH** để thấy dữ liệu + tiền tệ
re-scope theo nước.

## Tài khoản demo (mock SSO — đăng nhập bằng email)

"SSO" là mock: mỗi màn có nút "đăng nhập vai …" gọi `POST /auth/mock-login` với email tương ứng →
tạo user + session thật trong DB. Domain: `@demo.affiliate.gl`.

| Vai | Email | Dashboard `/portal` |
|---|---|---|
| **Creator** | `creator.vn@` · `creator.ph@` (hoặc email mới bất kỳ) | `/portal/creator` — KYC · join · nộp content · earnings · rút tiền |
| **Local Ops** | `ops.vn@` · `ops.ph@` | `/portal/ops` — duyệt KYC + content theo nước |
| **Local Admin** | `admin.vn@` · `admin.ph@` | `/portal/admin` — tạo & quản campaign (builder) |
| **Local Finance** | `finance.vn@` · `finance.ph@` | `/portal/finance` — đối soát + bàn payout |
| **Global Admin** | `global.admin@` | `/portal/global` — audit toàn cục (vai duy nhất vượt biên giới) |

Kịch bản demo gợi ý (chạy hẳn trong `/portal`, không phải mockup): vào `/portal` → chọn **Creator** →
chọn VN → KYC → (đổi vai **Local Ops** duyệt) → join campaign → nộp content → (Ops duyệt) → xem thu
nhập → (**Local Finance** đối soát + khoá batch) → rút tiền OTP → (Finance settle SUCCESS/FAIL/UNKNOWN)
→ (**Global Admin** xem nhật ký audit). Nút **"Đổi vai"** ở cuối rail đưa về trang chọn vai `/portal`.

## Chia sẻ UI ra ngoài cho mentor xem (ngrok)

Mở một tunnel công khai trỏ vào máy đang chạy dev — mentor chỉ cần một link, không cần cài gì.

```powershell
# Lần đầu: cài ngrok + nạp authtoken (miễn phí, lấy ở dashboard.ngrok.com)
winget install --id Ngrok.Ngrok -e
ngrok config add-authtoken <TOKEN>

corepack pnpm share      # Ctrl+C để đóng tunnel
```

`share` (script `scripts/share.mjs`) dùng lại API `:3001` và web `:3000` đang chạy (thiếu cái nào thì
tự bật) rồi mở tunnel, in ra link `https://<tên>.ngrok-free.dev/portal` để gửi mentor. Không cần dừng
`dev:api` / `dev:web`.

**Vì sao cần proxy:** trình duyệt của mentor không thấy `localhost:3001`. Nên trình duyệt luôn gọi
đường tương đối `/api-proxy/*` (`src/lib/api-base.ts`), và `next.config.mjs` rewrite đường đó về API
Go — đích lấy từ `API_BASE_URL` lúc server khởi động, **không nhúng vào bundle**. Một tunnel phục vụ
cả UI lẫn API, cùng origin nên không dính CORS.

Lưu ý: ngrok free hiện trang cảnh báo ở lần mở đầu — mentor bấm **"Visit Site"** là vào. Bảng theo dõi
request cục bộ: `http://127.0.0.1:4040`. Nếu ngrok báo `ERR_NGROK_121` (agent quá cũ) thì chạy
`ngrok update`.

## Kiểm thử

```powershell
corepack pnpm lint                  # go vet + ESLint frontend
corepack pnpm typecheck             # compile toàn bộ Go + tsc frontend
corepack pnpm test:api              # Go unit/integration + PostgreSQL
corepack pnpm run test:api:parity   # 105/105 legacy acceptance case trên Go
corepack pnpm run test:api:differential # Nest oracle ↔ Go normalized probes
corepack pnpm run test:api:race     # Linux CGO race detector + DB synthetic cô lập
corepack pnpm run test:web          # 25/25 Playwright; runner tự dựng Go API
corepack pnpm build                 # Go build + Next build

corepack pnpm verify                # lint + typecheck + API/parity/differential/E2E + build
```

`pnpm test` cần PostgreSQL local đã migrate/seed. Hai runner parity/E2E build binary Go tạm và tự
dọn; E2E dùng port `3101/3200` để không đụng phiên dev ở `3001/3000`. Race suite dùng Docker DB
synthetic riêng và không truyền credential DB local vào container.

## Reset DB sạch

```powershell
docker compose down -v     # xoá volume Postgres local (dữ liệu synthetic)
corepack pnpm bootstrap    # dựng lại từ đầu
```

## Cấu trúc

```text
apps/api-go   Go modular monolith — HTTP/RBAC/sqlc/pgx; 36/36 operation; PostgreSQL 17
apps/api      NestJS/Prisma oracle lịch sử — chỉ dùng differential/fallback, không nằm trên runtime path
apps/web      Next.js App Router — /portal (UI điều hành THẬT: landing + 5 dashboard theo vai) · /mockup (13 màn prototype tĩnh) · /vn /ph (ngữ cảnh nước)
apps/api-go/db  migration + reference/demo seed + typed SQL source
docs/         PRODUCT / DATA_MODEL / ARCHITECTURE / HARD_PROBLEMS (nguồn sự thật về phạm vi + vì sao)
Plan/         KE_HOACH_V2.md (kế hoạch) + LOG.md (đọc trước để nắm trạng thái)
apps/worker, packages/*   scaffolding dành sẵn — CHƯA dùng trong bản V2
```

## Xử lý sự cố

- **`/health` trả 503 / E2E timeout "webServer"**: Docker Desktop tắt → Postgres mất. Kiểm
  `docker info`, chạy `docker compose up -d postgres`, đợi healthy rồi thử lại (API tự reconnect).
- **Authentication failed khi migrate/seed**: volume Postgres được tạo bằng mật khẩu khác `.env`.
  Với dữ liệu local synthetic, reset bằng `docker compose down -v` rồi chạy lại `bootstrap`.
- **`DATABASE_URL is required`**: tạo `.env` từ `.env.example`; Go tự tìm file này từ thư mục hiện
  tại đi ngược lên repository root.
- **Port bận**: đổi `AFFILIATE_DB_PORT` (Postgres), hoặc giải phóng `3000`/`3001` trước khi chạy.
- **`corepack pnpm setup` chạy nhầm PATH-setup của pnpm**: dùng đúng tên script `bootstrap`
  (`setup` là lệnh built-in của pnpm).
