// Mở một tunnel ngrok để người ngoài (mentor) xem được UI đang chạy trên máy này.
//
// Không cần bật thêm server nào: `src/lib/api-base.ts` tự nhận biết trang đang mở qua tunnel
// (hostname khác localhost) và gọi API qua `/api-proxy/*` — đường này được `next.config.mjs`
// chuyển tiếp về API Go. Nhờ vậy CÙNG một server dev phục vụ được cả mình lẫn mentor.
//
// Dùng: corepack pnpm share      (Ctrl+C để đóng tunnel)

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const webPort = Number(process.env.WEB_PORT ?? 3000);
const apiPort = Number(process.env.API_PORT ?? 3001);
const apiOrigin = `http://localhost:${apiPort}`;
const webOrigin = `http://localhost:${webPort}`;
const children = [];

function findNgrok() {
  if (process.platform !== "win32") return "ngrok";
  const candidates = [
    resolve(process.env.LOCALAPPDATA ?? "", "Microsoft/WinGet/Links/ngrok.exe"),
    resolve(
      process.env.LOCALAPPDATA ?? "",
      "Microsoft/WinGet/Packages/Ngrok.Ngrok_Microsoft.Winget.Source_8wekyb3d8bbwe/ngrok.exe",
    ),
  ];
  return candidates.find((candidate) => existsSync(candidate)) ?? "ngrok";
}

async function isUp(url) {
  try {
    const response = await fetch(url);
    return response.ok;
  } catch {
    return false;
  }
}

async function waitFor(url, label, child) {
  for (let attempt = 0; attempt < 180; attempt++) {
    if (child && child.exitCode !== null) throw new Error(`${label} thoát sớm (${child.exitCode}).`);
    if (await isUp(url)) return;
    await new Promise((done) => setTimeout(done, 500));
  }
  throw new Error(`${label} không sẵn sàng tại ${url}.`);
}

async function readPublicUrl() {
  // ngrok mở API cục bộ ở 4040; tunnel xuất hiện ở đó sau khi kết nối xong.
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      const response = await fetch("http://127.0.0.1:4040/api/tunnels");
      if (response.ok) {
        const body = await response.json();
        const tunnel = body.tunnels?.find((item) => item.proto === "https") ?? body.tunnels?.[0];
        if (tunnel?.public_url) return tunnel.public_url;
      }
    } catch {
      // ngrok chưa kịp mở API cục bộ: thử lại.
    }
    await new Promise((done) => setTimeout(done, 500));
  }
  return null;
}

function shutdown() {
  for (const child of children) {
    if (child.exitCode === null) child.kill();
  }
}

process.on("SIGINT", () => {
  shutdown();
  process.exit(0);
});

// --- 1. API Go: dùng lại tiến trình đang chạy, chưa có thì tự bật ---
if (await isUp(`${apiOrigin}/health`)) {
  console.log(`[share] Dùng lại API Go đang chạy tại ${apiOrigin}`);
} else {
  console.log(`[share] Chưa thấy API tại ${apiOrigin} — đang bật \`go run ./cmd/api\`...`);
  const api = spawn("go", ["run", "./cmd/api"], {
    cwd: resolve(root, "apps/api-go"),
    stdio: "inherit",
    shell: process.platform === "win32",
    env: { ...process.env, PORT: String(apiPort), WEB_ORIGIN: webOrigin },
  });
  children.push(api);
  await waitFor(`${apiOrigin}/health`, "API Go", api);
}

// --- 2. Next.js: dùng lại `dev:web` đang mở, chưa có thì tự bật ---
if (await isUp(webOrigin)) {
  console.log(`[share] Dùng lại Next.js đang chạy tại ${webOrigin}`);
} else {
  console.log(`[share] Chưa thấy web tại ${webOrigin} — đang bật Next.js...`);
  const nextBin = resolve(root, "apps/web/node_modules/next/dist/bin/next");
  const web = spawn(process.execPath, [nextBin, "dev", "-p", String(webPort)], {
    cwd: resolve(root, "apps/web"),
    stdio: "inherit",
    env: { ...process.env, API_BASE_URL: apiOrigin },
  });
  children.push(web);
  await waitFor(webOrigin, "Next.js", web);
}

// --- 3. ngrok ---
const ngrokBin = findNgrok();
console.log(`[share] Mở tunnel ngrok (${ngrokBin})...`);
const ngrok = spawn(ngrokBin, ["http", String(webPort), "--host-header=rewrite", "--log=stdout"], {
  cwd: root,
  stdio: ["ignore", "pipe", "pipe"],
  // Chỉ cần shell khi phải nhờ PATH phân giải `ngrok`; có đường dẫn .exe tuyệt đối thì gọi thẳng.
  shell: process.platform === "win32" && ngrokBin === "ngrok",
  env: process.env,
});
children.push(ngrok);

let ngrokLog = "";
for (const stream of [ngrok.stdout, ngrok.stderr]) {
  stream.on("data", (chunk) => {
    ngrokLog += chunk.toString();
  });
}

const publicUrl = await readPublicUrl();
if (!publicUrl) {
  console.error("\n[share] Không lấy được link ngrok. Log ngrok:\n" + ngrokLog.slice(-2000));
  if (ngrokLog.includes("ERR_NGROK_4018")) {
    console.error(
      "\n[share] ngrok cần authtoken (miễn phí). Lấy tại https://dashboard.ngrok.com/get-started/your-authtoken rồi chạy:\n" +
        `  ${ngrokBin} config add-authtoken <TOKEN>\n`,
    );
  }
  if (ngrokLog.includes("ERR_NGROK_121")) {
    console.error(`\n[share] Bản ngrok quá cũ so với yêu cầu của tài khoản. Chạy: ${ngrokBin} update\n`);
  }
  shutdown();
  process.exit(1);
}

console.log(`
============================================================
  LINK GỬI MENTOR:  ${publicUrl}/portal
  Bảng điều khiển ngrok: http://127.0.0.1:4040
  (Lần đầu mở, ngrok free hiện trang cảnh báo → bấm "Visit Site")
  Ctrl+C để đóng tunnel.
============================================================
`);
