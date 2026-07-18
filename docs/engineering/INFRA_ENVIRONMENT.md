# Local infrastructure and environment contract

> Day 3 bootstrap PostgreSQL; Day 4 added Prisma schema/migrations only after G4 Phase A design review passed.

## Contract

| Variable | Required | Meaning | Secret |
|---|---:|---|---:|
| `AFFILIATE_DB_NAME` | no | local database name, default `affiliate_global` | no |
| `AFFILIATE_DB_USER` | no | local role, default `affiliate_app` | no |
| `AFFILIATE_DB_PASSWORD` | yes | local-only PostgreSQL password | **yes** |
| `AFFILIATE_DB_PORT` | no | host port, default `54329` | no |
| `DATABASE_URL` | app phase | Prisma/runtime connection string | **yes** |

- `.env` và `.env.*` bị ignore; repo chỉ giữ `.env.example` với placeholder.
- Compose không có password mặc định. Thiếu `AFFILIATE_DB_PASSWORD` phải fail-fast.
- Database chỉ bind port cho local development; production dùng managed secret/network policy riêng.
- Schema nằm tại `apps/api/prisma/schema.prisma`; migration chỉ được tạo sau G4 Phase A và chạy bằng `prisma migrate deploy`, không dùng `db push`.

## Start và verify

```powershell
Copy-Item .env.example .env
# Thay AFFILIATE_DB_PASSWORD và DATABASE_URL trong .env bằng giá trị local.
docker compose up -d postgres
docker compose ps
docker compose exec postgres pg_isready -U affiliate_app -d affiliate_global
```

Expected: service `postgres` có trạng thái `healthy`; `pg_isready` trả `accepting connections`.

Stop service nhưng giữ volume local:

```powershell
docker compose stop postgres
```

Không dùng `docker compose down -v` nếu chưa chủ động xác nhận xóa dữ liệu local.

## Failure handling

- Port busy: đặt `AFFILIATE_DB_PORT` khác trong `.env`, cập nhật `DATABASE_URL` cùng port.
- Image pull/daemon unavailable: lưu output làm blocker evidence; không giả định database healthy.
- Authentication failure: xác nhận `.env`/volume cũ; không đưa password vào log/chat.
- Health timeout: xem `docker compose ps` và log đã redact; không thêm retry vô hạn.
