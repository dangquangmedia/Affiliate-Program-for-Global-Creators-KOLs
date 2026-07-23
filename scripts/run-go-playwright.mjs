import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawn, spawnSync } from "node:child_process";

const root = resolve(import.meta.dirname, "..");
const apiDir = resolve(root, "apps/api-go");
const scratch = mkdtempSync(join(tmpdir(), "affiliate-go-playwright-"));
const binary = join(scratch, process.platform === "win32" ? "affiliate-api.exe" : "affiliate-api");
const childEnv = { ...process.env, GOCACHE: process.env.GOCACHE ?? resolve(apiDir, ".cache/go-build") };
const apiBaseUrl = "http://127.0.0.1:3101";
const webBaseUrl = "http://127.0.0.1:3200";

const build = spawnSync("go", ["build", "-o", binary, "./cmd/api"], {
  cwd: apiDir,
  stdio: "inherit",
  env: childEnv,
});
if (build.status !== 0) {
  rmSync(scratch, { recursive: true, force: true });
  process.exit(build.status ?? 1);
}

const api = spawn(binary, [], {
  cwd: apiDir,
  stdio: "ignore",
  env: { ...childEnv, PORT: "3101", WEB_ORIGIN: "http://localhost:3200" },
});
const nextBin = resolve(root, "apps/web/node_modules/next/dist/bin/next");
const web = spawn(process.execPath, [nextBin, "dev", "-p", "3200"], {
  cwd: resolve(root, "apps/web"),
  stdio: "ignore",
  // Chỉ biến phía server: trình duyệt gọi `/api-proxy`, Next rewrite về API test. Đặt
  // `NEXT_PUBLIC_*` sẽ nhúng cổng test vào bundle dùng chung `.next` với `dev:web`.
  env: { ...childEnv, API_BASE_URL: "http://localhost:3101" },
});

async function waitFor(url, child, label) {
  for (let attempt = 0; attempt < 120; attempt++) {
    if (child.exitCode !== null) throw new Error(`${label} exited early (${child.exitCode}).`);
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // Cold start: retry below.
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 500));
  }
  throw new Error(`${label} did not become ready at ${url}.`);
}

function waitForExit(child) {
  return new Promise((resolveExit) => child.once("exit", (code) => resolveExit(code ?? 1)));
}

let exitCode = 1;
try {
  await Promise.all([
    waitFor(`${apiBaseUrl}/health`, api, "Go API"),
    waitFor(webBaseUrl, web, "Next.js"),
  ]);
  const command = process.platform === "win32" ? (process.env.ComSpec ?? "cmd.exe") : "corepack";
  const args = process.platform === "win32"
    ? ["/d", "/s", "/c", "corepack pnpm --dir apps/web exec playwright test"]
    : ["pnpm", "--dir", "apps/web", "exec", "playwright", "test"];
  const tests = spawn(command, args, {
    cwd: root,
    stdio: "inherit",
    env: { ...childEnv, E2E_EXTERNAL_SERVERS: "1", GO_E2E_BINARY: binary },
  });
  exitCode = await waitForExit(tests);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
} finally {
  for (const child of [web, api]) {
    if (child.exitCode === null) child.kill();
  }
  await Promise.race([
    Promise.all([waitForExit(web), waitForExit(api)]),
    new Promise((resolveTimeout) => setTimeout(resolveTimeout, 5_000)),
  ]);
}

rmSync(scratch, { recursive: true, force: true });
process.exit(exitCode);
