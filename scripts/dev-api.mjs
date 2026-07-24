// `corepack pnpm dev:api` — đảm bảo Postgres sẵn sàng RỒI mới chạy Go API.
//
// Trước đây script này gọi thẳng `go run ./cmd/api`. Sau mỗi lần khởi động lại máy, Docker Desktop
// không tự chạy → container Postgres không sống lại → Go dial cổng 5433 và chết với
// `api_init_failed ... connectex: No connection could be made`. Thông báo đó không nói được phải
// làm gì, nên lỗi lặp lại hoài. Giờ tiền đề được xử lý trước, không còn phải nhớ `infra:up`.
import { spawn, spawnSync } from "node:child_process";
import { DevStackError, ensurePostgres, root } from "./lib/dev-stack.mjs";

try {
  await ensurePostgres();
} catch (error) {
  if (error instanceof DevStackError) {
    console.error(`\n\x1b[31m✖ ${error.message}\x1b[0m\n`);
    process.exit(1);
  }
  throw error;
}

console.log("\x1b[36m▸ Go API → http://localhost:3001\x1b[0m\n");

// Lệnh dạng chuỗi (không phải args array) để tránh cảnh báo DEP0190 khi shell:true — cùng quy ước
// với scripts/lib/dev-stack.mjs. shell:true để `go` resolve được qua PATHEXT trên Windows.
const api = spawn("go -C apps/api-go run ./cmd/api", {
  cwd: root,
  stdio: "inherit",
  shell: true,
});

// Ctrl+C phải dừng cả CÂY tiến trình. Trên Windows `shell:true` bọc lệnh trong cmd.exe, và `go run`
// còn sinh thêm một binary con; giết mỗi tiến trình cha để lại binary mồ côi vẫn giữ cổng 3001 —
// lần chạy sau sẽ báo "port bận" mà không thấy tiến trình nào rõ ràng để tắt. `/T` giết cả cây.
function stopApi(signal) {
  if (api.exitCode !== null) return;
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/PID", String(api.pid), "/T", "/F"], { stdio: "ignore" });
  } else {
    api.kill(signal);
  }
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => stopApi(signal));
}
api.on("exit", (code, signal) => {
  process.exit(signal ? 1 : (code ?? 1));
});
