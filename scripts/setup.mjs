// One-command bootstrap: ensure .env → Postgres (Docker) → Go migrate → Go seed.
// Chạy: `corepack pnpm bootstrap`. An toàn chạy lại nhiều lần (mọi bước idempotent).
// Chỉ dùng cho LOCAL/DEV — mật khẩu trong .env.example là synthetic, không phải bí mật thật.
import { spawnSync } from "node:child_process";
import { existsSync, copyFileSync } from "node:fs";
import { resolve } from "node:path";
import { DevStackError, ensurePostgres, root } from "./lib/dev-stack.mjs";

const log = (m) => console.log(`\n\x1b[36m▸ ${m}\x1b[0m`);
const die = (m) => {
  console.error(`\n\x1b[31m✖ ${m}\x1b[0m`);
  process.exit(1);
};

// Chạy 1 lệnh, kế thừa stdio + env hiện tại; shell:true để `docker`/`corepack` resolve trên Windows.
function run(cmd) {
  const r = spawnSync(cmd, { stdio: "inherit", shell: true, cwd: root, env: process.env });
  if (r.status !== 0) die(`Lệnh thất bại: ${cmd}`);
}

// 1) .env — copy từ .env.example nếu chưa có (mật khẩu placeholder khớp cả DB lẫn DATABASE_URL).
//    Bước này phải nằm ở đây, không nằm trong dev-stack: bootstrap là lệnh DUY NHẤT được phép tạo
//    .env; các lệnh khác thiếu .env thì phải dừng và bảo người dùng chạy bootstrap.
const envPath = resolve(root, ".env");
if (!existsSync(envPath)) {
  log(".env chưa có → copy từ .env.example (local/synthetic, đổi mật khẩu nếu cần bảo mật)");
  copyFileSync(resolve(root, ".env.example"), envPath);
}

// 2) Docker daemon + Postgres sẵn sàng nhận kết nối (dùng chung với `dev:api`).
try {
  await ensurePostgres();
} catch (error) {
  if (error instanceof DevStackError) die(error.message);
  throw error;
}

// 3) Go migration + reference/demo seed (tất cả idempotent).
log("Áp migrations bằng Go…");
run("corepack pnpm run db:migrate:deploy");
log("Seed reference + demo bằng Go (VN/PH + tài khoản 4 vai + campaign)…");
run("corepack pnpm run db:seed");

console.log(`
\x1b[32m✔ Xong! Môi trường sẵn sàng.\x1b[0m

Chạy app (2 terminal):
  corepack pnpm dev:api    # Go API  → http://localhost:3001
  corepack pnpm dev:web    # Next.js → http://localhost:3000

Prototype 13 màn: http://localhost:3000/mockup
`);
