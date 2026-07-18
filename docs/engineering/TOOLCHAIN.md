# Toolchain baseline — W1-D1

> Status: `FROZEN_FOR_SCAFFOLD`  
> Ngày khóa: 2026-07-17

## Quyết định

| Hạng mục | Quyết định | Chính sách |
|---|---|---|
| Repository | Git, default branch `main` | Không commit trực tiếp secret/evidence private |
| Runtime | Node.js `24.11.1` | Exact version trong `.nvmrc`; CI/dev phải cùng major và ưu tiên exact |
| Package manager | pnpm workspace, target `pnpm 10.15.1` | Ngày 2 tạo root `package.json`, `pnpm-workspace.yaml` và lockfile; không trộn npm/yarn |
| Frontend | Next.js + TypeScript | Một web app responsive, route market `/vn` và `/ph`, role-based shell |
| Backend | NestJS + TypeScript | Modular monolith; REST + OpenAPI |
| ORM/migration | Prisma Migrate `7.8.0` | CLI/Client pin cùng version; một schema/migration history; không dùng `db push` như evidence release |
| Database | PostgreSQL | Country isolation được enforce ở application context và RLS theo kế hoạch |
| Object storage | MinIO local | Chỉ thêm khi KYC/content upload được triển khai |
| Background job | Worker trong monorepo | Redis chỉ thêm khi có queue/retry requirement thật |
| Local infra | Docker Compose | Pin image tag, không dùng `latest` trong release candidate |
| OAuth | Provider adapter | Google thật nếu credential sẵn; local/mock adapter luôn tồn tại và phải disclose |
| OTP/MFA | Mock provider có expiry/attempt limit/audit | Không dùng OTP cố định trong production path |
| Mockup | Figma low-fi | Fallback HTML wireframe nếu Figma không sẵn sàng trước Ngày 2 |

## Topology đã khóa

```text
apps/web      Next.js: Creator + Ops + Finance + Admin shells
apps/api      NestJS modular monolith
apps/worker   background execution khi cần
packages/contracts
packages/ui
infra
docs
```

## Điều kiện đổi tool

Chỉ đổi quyết định sau ADR có: blocker tái lập được, impact migration, owner duyệt và rollback plan. Không đổi ORM, package manager hoặc app topology giữa sprint vì sở thích cá nhân.

## Evidence môi trường ngày 1

- Git `2.51.2.windows.1`.
- Node `v24.11.1`.
- Corepack `0.34.2`.
- Docker `29.4.0`, Compose `v5.1.1`; PostgreSQL 17.5 container đã health-check Ngày 3.
- pnpm `10.15.1` đã provision và workspace checks chạy được.
- Prisma CLI/Client `7.8.0` đã pin Ngày 4; schema validate/generate và 3 migrations từ DB rỗng đã pass.
