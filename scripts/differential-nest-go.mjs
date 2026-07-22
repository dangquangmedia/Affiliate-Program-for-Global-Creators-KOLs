import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawn, spawnSync } from "node:child_process";

const root = resolve(import.meta.dirname, "..");
const goDir = resolve(root, "apps/api-go");
const nestDir = resolve(root, "apps/api");
const scratch = mkdtempSync(join(tmpdir(), "affiliate-differential-"));
const binary = join(scratch, process.platform === "win32" ? "affiliate-api.exe" : "affiliate-api");
const childEnv = { ...process.env, GOCACHE: process.env.GOCACHE ?? resolve(goDir, ".cache/go-build") };
const goBase = "http://127.0.0.1:3102";
const nestBase = "http://127.0.0.1:3103";

const build = spawnSync("go", ["build", "-o", binary, "./cmd/api"], {
  cwd: goDir,
  stdio: "inherit",
  env: childEnv,
});
if (build.status !== 0) {
  rmSync(scratch, { recursive: true, force: true });
  process.exit(build.status ?? 1);
}

const goApi = spawn(binary, [], { cwd: goDir, stdio: "ignore", env: { ...childEnv, PORT: "3102" } });
const nestApi = spawn(process.execPath, ["--import", "tsx", "src/main.ts"], {
  cwd: nestDir,
  stdio: "ignore",
  env: { ...childEnv, API_PORT: "3103" },
});

async function waitFor(baseUrl, child, label) {
  for (let attempt = 0; attempt < 120; attempt++) {
    if (child.exitCode !== null) throw new Error(`${label} exited early (${child.exitCode}).`);
    try {
      const response = await fetch(`${baseUrl}/health`);
      if (response.ok) return;
    } catch {
      // Cold start: retry below.
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 500));
  }
  throw new Error(`${label} did not become healthy.`);
}

function normalize(value) {
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, nested]) => [key, normalize(nested)]));
  }
  if (typeof value !== "string") return value;
  if (/^[0-9a-f]{64}$/i.test(value)) return "<token>";
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) return "<uuid>";
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(value)) return "<iso-date>";
  return value;
}

async function call(baseUrl, path, init = {}) {
  const response = await fetch(baseUrl + path, init);
  return { status: response.status, body: normalize(await response.json()) };
}

async function compare(label, path, init = {}) {
  const [goResult, nestResult] = await Promise.all([call(goBase, path, init), call(nestBase, path, init)]);
  assert.deepEqual(goResult, nestResult, label);
}

let exitCode = 1;
try {
  await Promise.all([waitFor(goBase, goApi, "Go API"), waitFor(nestBase, nestApi, "Nest oracle")]);
  await compare("root", "/");
  await compare("health", "/health");
  await compare("VN context", "/markets/vn/context");
  await compare("PH context", "/markets/ph/context");
  await compare("unknown market", "/markets/xx/context");
  await compare("missing session", "/auth/me");
  await compare("invalid login", "/auth/mock-login", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: "not-an-email" }),
  });

  const email = `differential-${Date.now()}@example.com`;
  const loginInit = {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, displayName: "Differential User" }),
  };
  const [goLoginRaw, nestLoginRaw] = await Promise.all([
    fetch(`${goBase}/auth/mock-login`, loginInit), fetch(`${nestBase}/auth/mock-login`, loginInit),
  ]);
  const goLogin = await goLoginRaw.json();
  const nestLogin = await nestLoginRaw.json();
  assert.equal(goLoginRaw.status, nestLoginRaw.status, "login status");
  assert.deepEqual(normalize(goLogin), normalize(nestLogin), "login body");
  const goAuth = { authorization: `Bearer ${goLogin.token}` };
  const nestAuth = { authorization: `Bearer ${nestLogin.token}` };

  const authenticated = async (label, path, init = {}) => {
    const [goResult, nestResult] = await Promise.all([
      call(goBase, path, { ...init, headers: { ...init.headers, ...goAuth } }),
      call(nestBase, path, { ...init, headers: { ...init.headers, ...nestAuth } }),
    ]);
    assert.deepEqual(goResult, nestResult, label);
  };
  await authenticated("auth me", "/auth/me");
  await authenticated("country select", "/me/country/vn", { method: "POST" });
  await authenticated("country list", "/me/countries");
  await authenticated("campaign list", "/markets/vn/campaigns");
  await authenticated("logout", "/auth/logout", { method: "POST" });

  console.log("Differential Nest ↔ Go: 13/13 normalized probes passed.");
  exitCode = 0;
} catch (error) {
  console.error(error instanceof Error ? error.stack : String(error));
} finally {
  for (const child of [nestApi, goApi]) if (child.exitCode === null) child.kill();
  await new Promise((resolveWait) => setTimeout(resolveWait, 500));
  rmSync(scratch, { recursive: true, force: true });
}

process.exit(exitCode);
