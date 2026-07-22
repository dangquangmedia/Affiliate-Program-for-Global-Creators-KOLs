// One-command bootstrap: ensure .env → Postgres (Docker) → Go migrate → Go seed.
// Chạy: `corepack pnpm bootstrap`. An toàn chạy lại nhiều lần (mọi bước idempotent).
// Chỉ dùng cho LOCAL/DEV — mật khẩu trong .env.example là synthetic, không phải bí mật thật.
import { spawnSync } from "node:child_process";
import { existsSync, copyFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const log = (m) => console.log(`\n\x1b[36m▸ ${m}\x1b[0m`);
const die = (m) => {
  console.error(`\n\x1b[31m✖ ${m}\x1b[0m`);
  process.exit(1);
};

// Chạy 1 lệnh, kế thừa stdio + env hiện tại; shell:true để `docker`/`corepack` resolve trên Windows.
function run(cmd, { optional = false } = {}) {
  const r = spawnSync(cmd, { stdio: "inherit", shell: true, cwd: root, env: process.env });
  if (r.status !== 0 && !optional) die(`Lệnh thất bại: ${cmd}`);
  return r.status === 0;
}

// 1) .env — copy từ .env.example nếu chưa có (mật khẩu placeholder khớp cả DB lẫn DATABASE_URL).
const envPath = resolve(root, ".env");
if (!existsSync(envPath)) {
  log(".env chưa có → copy từ .env.example (local/synthetic, đổi mật khẩu nếu cần bảo mật)");
  copyFileSync(resolve(root, ".env.example"), envPath);
}
// Nạp .env để Docker Compose thấy password; Go commands cũng tự nạp file này.
process.loadEnvFile(envPath);
if (!process.env.DATABASE_URL) die("DATABASE_URL không có trong .env");

// 2) Postgres qua Docker.
log("Khởi động Postgres (Docker)…");
if (!run("docker compose up -d postgres", { optional: true })) {
  die("Không chạy được `docker compose up -d postgres`. Docker Desktop đã bật chưa?");
}

// 3) Chờ Postgres nhận kết nối (healthcheck có thể chậm lúc cold start).
log("Chờ Postgres sẵn sàng…");
const user = process.env.AFFILIATE_DB_USER ?? "affiliate_app";
const db = process.env.AFFILIATE_DB_NAME ?? "affiliate_global";
let ready = false;
for (let i = 0; i < 40; i++) {
  // Lệnh dạng chuỗi (không phải args array) để tránh DEP0190 khi shell:true.
  const r = spawnSync(`docker compose exec -T postgres pg_isready -U ${user} -d ${db}`, {
    stdio: "ignore",
    shell: true,
    cwd: root,
  });
  if (r.status === 0) {
    ready = true;
    break;
  }
  spawnSync(process.execPath, ["-e", "setTimeout(() => {}, 2000)"]); // sleep ~2s, cross-platform
}
if (!ready) die("Postgres không sẵn sàng sau ~80s. Kiểm tra `docker compose ps`.");
console.log("  Postgres ready.");

// 4) Go migration + reference/demo seed (tất cả idempotent).
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
