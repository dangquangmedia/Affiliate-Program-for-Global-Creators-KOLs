// Tiền đề để chạy API/bootstrap ở local: Docker daemon sống → container Postgres chạy → Postgres
// nhận kết nối. Gom vào một chỗ vì trước đây `bootstrap` có logic này còn `dev:api` thì không —
// nên sau mỗi lần khởi động lại máy, `dev:api` đâm thẳng vào cổng 5433 chưa ai nghe và chỉ trả về
// "dial tcp 127.0.0.1:5433: connectex: No connection could be made", không nói được phải làm gì.
import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..", "..");

const log = (m) => console.log(`\x1b[36m▸ ${m}\x1b[0m`);
const ok = (m) => console.log(`\x1b[32m  ✔ ${m}\x1b[0m`);

export class DevStackError extends Error {}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Lệnh dạng chuỗi + shell:true để `docker`/`corepack` resolve được trên Windows.
function quiet(command) {
  return spawnSync(command, { stdio: "ignore", shell: true, cwd: root }).status === 0;
}

export function loadEnv() {
  const envPath = resolve(root, ".env");
  if (!existsSync(envPath)) {
    throw new DevStackError(
      ".env chưa có. Chạy `corepack pnpm bootstrap` một lần để tạo .env và dựng database.",
    );
  }
  process.loadEnvFile(envPath);
  if (!process.env.DATABASE_URL) {
    throw new DevStackError("DATABASE_URL không có trong .env — kiểm tra lại file .env.");
  }
  return envPath;
}

// Docker Desktop trên Windows KHÔNG tự chạy lại sau khi khởi động máy, mà container Postgres lại
// khai báo `restart: unless-stopped` — nghĩa là nó chỉ sống lại khi daemon sống. Đây chính là lý do
// lỗi lặp lại đúng vào lần chạy đầu tiên sau mỗi lần bật máy.
async function startDockerDesktop() {
  if (process.platform !== "win32") {
    throw new DevStackError("Docker daemon chưa chạy. Khởi động Docker rồi chạy lại lệnh này.");
  }

  const candidates = [
    process.env.ProgramFiles && `${process.env.ProgramFiles}\\Docker\\Docker\\Docker Desktop.exe`,
    process.env.ProgramW6432 && `${process.env.ProgramW6432}\\Docker\\Docker\\Docker Desktop.exe`,
    process.env.LOCALAPPDATA && `${process.env.LOCALAPPDATA}\\Docker\\Docker Desktop.exe`,
  ].filter(Boolean);
  const exe = candidates.find((path) => existsSync(path));
  if (!exe) {
    throw new DevStackError(
      "Không tìm thấy Docker Desktop. Cài Docker Desktop, hoặc tự bật rồi chạy lại lệnh này.",
    );
  }

  log("Docker Desktop chưa chạy → đang bật (lần đầu sau khi khởi động máy thường mất 1–2 phút)…");
  // detached + unref: Docker Desktop sống độc lập, không chết theo tiến trình script này.
  spawn(exe, [], { detached: true, stdio: "ignore" }).unref();

  for (let i = 0; i < 90; i++) {
    await sleep(2000);
    if (quiet("docker info")) {
      ok("Docker daemon sẵn sàng.");
      return;
    }
  }
  throw new DevStackError(
    "Docker Desktop không sẵn sàng sau ~3 phút. Mở Docker Desktop xem nó báo lỗi gì rồi chạy lại.",
  );
}

export async function ensureDockerDaemon() {
  if (quiet("docker info")) return;
  await startDockerDesktop();
}

// Sau khi có daemon: dựng container và chờ Postgres THỰC SỰ nhận kết nối. Container "đang chạy"
// chưa đủ — lúc cold start Postgres còn khởi tạo, connect vào vẫn bị từ chối.
export async function ensurePostgres() {
  loadEnv();
  await ensureDockerDaemon();

  log("Kiểm tra Postgres…");
  if (!quiet("docker compose up -d postgres")) {
    throw new DevStackError(
      "Không chạy được `docker compose up -d postgres`. Xem chi tiết bằng chính lệnh đó.",
    );
  }

  const user = process.env.AFFILIATE_DB_USER ?? "affiliate_app";
  const db = process.env.AFFILIATE_DB_NAME ?? "affiliate_global";
  for (let i = 0; i < 40; i++) {
    if (quiet(`docker compose exec -T postgres pg_isready -U ${user} -d ${db}`)) {
      ok("Postgres nhận kết nối.");
      return;
    }
    await sleep(2000);
  }
  throw new DevStackError(
    "Postgres không sẵn sàng sau ~80s. Xem log bằng `docker compose logs postgres`.",
  );
}

export { root };
