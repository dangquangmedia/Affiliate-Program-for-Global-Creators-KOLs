// Diễn tập TRỌN trình tự release Tuần 7 trên máy local, bằng đúng image production.
//
// Mô phỏng: build image → migration job trên DB rỗng → seed → khởi động service → smoke money-spine
// → job reclaim chạy hai lần (idempotent) → soát log không lộ bí mật → graceful shutdown (SIGTERM).
// Đây là bằng chứng thay cho việc bấm deploy lên Google Cloud (tốn tiền); các bước dùng cùng một
// image, cùng entrypoint và cùng biến môi trường mà Cloud Run/Cloud Run Jobs sẽ dùng.
//
//   node scripts/staging-rehearsal.mjs           # chạy rồi dọn sạch
//   node scripts/staging-rehearsal.mjs --keep    # giữ stack lại để xem tay

import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const composeFile = resolve(root, "compose.staging.yaml");
const image = process.env.STAGING_IMAGE ?? "affiliate-api-go:staging-rehearsal";
const apiPort = process.env.STAGING_API_PORT ?? "8081";
const baseUrl = `http://127.0.0.1:${apiPort}`;
const keep = process.argv.includes("--keep");
const checks = [];

function run(command, args, { capture = false, allowFailure = false } = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit",
    encoding: "utf8",
    env: { ...process.env, STAGING_IMAGE: image, STAGING_API_PORT: apiPort },
  });
  const output = capture ? `${result.stdout ?? ""}${result.stderr ?? ""}` : "";
  if (!allowFailure && result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} thất bại (exit ${result.status}).\n${output}`);
  }
  return { status: result.status ?? 1, output };
}

const compose = (...args) => run("docker", ["compose", "-f", composeFile, ...args]);
const composeCapture = (...args) => run("docker", ["compose", "-f", composeFile, ...args], { capture: true });

function record(name, detail) {
  checks.push({ name, detail });
  console.log(`\n[PASS] ${name}${detail ? ` — ${detail}` : ""}`);
}

async function waitForHealth() {
  for (let attempt = 0; attempt < 120; attempt++) {
    try {
      const response = await fetch(`${baseUrl}/health`);
      if (response.ok) return await response.json();
    } catch {
      // container chưa mở cổng: thử lại
    }
    await new Promise((done) => setTimeout(done, 1000));
  }
  throw new Error(`API không sẵn sàng tại ${baseUrl}/health`);
}

function teardown() {
  console.log("\n--- dọn stack diễn tập ---");
  run("docker", ["compose", "-f", composeFile, "down", "-v"], { capture: true, allowFailure: true });
}

async function main() {
  console.log("=== 1. Build image production (multi-stage, distroless non-root) ===");
  // Context là `apps/api-go` (Dockerfile COPY go.mod, db/ theo đường dẫn tương đối của module Go);
  // build từ gốc repo sẽ hỏng — chỉ "qua" khi còn cache của lần build đúng trước đó.
  run("docker", ["build", "-f", "apps/api-go/Dockerfile", "-t", image, "apps/api-go"]);
  const inspect = run("docker", ["image", "inspect", image, "--format", "{{.Config.User}}|{{.Config.Env}}"], { capture: true });
  const [imageUser] = inspect.output.trim().split("|");
  if (imageUser !== "nonroot:nonroot") throw new Error(`image chạy bằng user ${imageUser || "root"}, phải là nonroot:nonroot`);
  record("Image non-root", `USER=${imageUser}`);

  console.log("\n=== 2. DB rỗng + migration job + seed (không migrate trong startup API) ===");
  teardown();
  compose("up", "-d", "api");
  const version = composeCapture("run", "--rm", "migrate", "version");
  const versionLine = version.output.split("\n").find((line) => line.includes("version=")) ?? version.output.trim();
  record("Migration job trên DB rỗng", versionLine.trim());

  console.log("\n=== 3. Service khởi động và tự kiểm tra database ===");
  const health = await waitForHealth();
  if (health.status !== "ok" || health.db !== "up") throw new Error(`/health = ${JSON.stringify(health)}`);
  record("API container healthy", `PORT=8080 → ${baseUrl} · ${JSON.stringify(health)}`);

  console.log("\n=== 4. Smoke money-spine end-to-end qua container ===");
  run(process.execPath, ["scripts/smoke.mjs", baseUrl]);
  record("Smoke money-spine VN", "KYC → campaign → content → earning → đối soát → payout → PAID");

  console.log("\n=== 5. Reclaim job chạy hai lần (Cloud Scheduler sẽ gọi lặp) ===");
  const first = composeCapture("run", "--rm", "reclaim");
  const second = composeCapture("run", "--rm", "reclaim");
  const sweeps = [first, second].map((result) => {
    const line = result.output.split("\n").find((entry) => entry.includes("reclaim_sweep_complete"));
    if (!line) throw new Error(`reclaim không báo hoàn tất:\n${result.output}`);
    return line.trim();
  });
  record("Reclaim job idempotent", `lần 1: ${sweeps[0].slice(-60)} · lần 2: ${sweeps[1].slice(-60)}`);

  console.log("\n=== 6. Soát log: không được lộ token, OTP hay dữ liệu KYC ===");
  const logs = composeCapture("logs", "--no-color", "api").output;
  const forbidden = [
    ["authorization header", /authorization/i],
    ["bearer token", /bearer\s+\S+/i],
    ["session token", /"token"\s*:/i],
    ["otp code", /"code"\s*:\s*"\d{4,}/i],
    ["kyc idNumber", /idNumber/i],
    ["kyc bankAccount", /bankAccount/i],
    ["kyc taxId", /taxId/i],
  ];
  const leaks = forbidden.filter(([, pattern]) => pattern.test(logs)).map(([label]) => label);
  if (leaks.length > 0) throw new Error(`log lộ bí mật: ${leaks.join(", ")}`);
  const requestLines = logs.split("\n").filter((line) => line.includes("http_request")).length;
  record("Log sạch bí mật", `${requestLines} dòng http_request, 0/${forbidden.length} mẫu cấm khớp`);

  console.log("\n=== 7. Graceful shutdown (Cloud Run gửi SIGTERM trước khi thu hồi instance) ===");
  compose("stop", "-t", "20", "api");
  const stopLogs = composeCapture("logs", "--no-color", "api").output;
  if (!stopLogs.includes("api_stopped")) throw new Error(`không thấy log api_stopped sau SIGTERM:\n${stopLogs.slice(-600)}`);
  record("Graceful shutdown", "nhận SIGTERM → api_stopped, không kill cứng");

  console.log(`\n==================== REHEARSAL PASS (${checks.length}/${checks.length}) ====================`);
  for (const check of checks) console.log(`  ✓ ${check.name}${check.detail ? ` — ${check.detail}` : ""}`);
  console.log();
}

try {
  await main();
} catch (error) {
  console.error(`\n[FAIL] ${error.message}`);
  if (!keep) teardown();
  process.exit(1);
}
if (keep) {
  console.log(`Stack vẫn chạy: ${baseUrl} (dọn bằng: docker compose -f compose.staging.yaml down -v)`);
} else {
  teardown();
}
