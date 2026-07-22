import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawn, spawnSync } from "node:child_process";

const root = resolve(import.meta.dirname, "..");
const apiDir = resolve(root, "apps/api-go");
const scratch = mkdtempSync(join(tmpdir(), "affiliate-go-acceptance-"));
const binary = join(scratch, process.platform === "win32" ? "affiliate-api.exe" : "affiliate-api");
const port = process.env.GO_ACCEPTANCE_PORT ?? "3101";
const baseUrl = `http://127.0.0.1:${port}`;
const childEnv = { ...process.env, GOCACHE: process.env.GOCACHE ?? resolve(apiDir, ".cache/go-build") };

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

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
  env: { ...childEnv, PORT: port },
  stdio: "ignore",
});

async function waitUntilHealthy() {
  for (let attempt = 0; attempt < 60; attempt++) {
    if (api.exitCode !== null) throw new Error(`Go API exited early (${api.exitCode}).`);
    try {
      const response = await fetch(`${baseUrl}/health`);
      if (response.ok) return;
    } catch {
      // Cold start: retry below.
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 500));
  }
  throw new Error(`Go API did not become healthy at ${baseUrl}.`);
}

try {
  await waitUntilHealthy();
  const acceptanceCommand = process.platform === "win32" ? (process.env.ComSpec ?? "cmd.exe") : "corepack";
  const acceptanceArgs = process.platform === "win32"
    ? ["/d", "/s", "/c", "corepack pnpm --filter @affiliate-global/api run test"]
    : ["pnpm", "--filter", "@affiliate-global/api", "run", "test"];
  const acceptance = spawnSync(
    acceptanceCommand,
    acceptanceArgs,
    {
      cwd: root,
      stdio: "inherit",
      env: { ...childEnv, GO_API_BASE_URL: baseUrl },
    },
  );
  if (acceptance.error) fail(`Cannot start Go API acceptance: ${acceptance.error.message}`);
  else if (acceptance.status !== 0) fail(`Go API acceptance failed with exit code ${acceptance.status}.`);
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
} finally {
  if (api.exitCode === null) {
    api.kill();
    await Promise.race([
      new Promise((resolveExit) => api.once("exit", resolveExit)),
      new Promise((resolveTimeout) => setTimeout(resolveTimeout, 5_000)),
    ]);
  }
  rmSync(scratch, { recursive: true, force: true });
}
