import { access, readFile } from "node:fs/promises";

const required = [
  "package.json",
  "pnpm-workspace.yaml",
  "apps/web/package.json",
  "apps/api/package.json",
  "apps/worker/package.json",
  "packages/contracts/package.json",
  "packages/ui/package.json",
  "docs/product/mockup/creator-prototype.html",
  "docs/product/ADMIN_FINANCE_IA.md",
  "docs/product/STATE_MACHINES.md",
  "docs/product/PERMISSION_MATRIX.md",
  "docs/product/PROVIDER_FAILURE_MATRIX.md",
  "docs/engineering/INFRA_ENVIRONMENT.md",
  "compose.yaml",
  ".env.example",
  "docs/product/G4_ARCHITECTURE_GATE.md",
  "apps/api/prisma/schema.prisma",
];

await Promise.all(required.map((path) => access(path)));

const prototype = await readFile(
  "docs/product/mockup/creator-prototype.html",
  "utf8",
);

const expectedViews = Array.from({ length: 12 }, (_, index) =>
  `V${String(index + 1).padStart(2, "0")}`,
);

const missingViews = expectedViews.filter(
  (view) => !prototype.includes(`data-view-id="${view}"`),
);

const actualViews = [
  ...prototype.matchAll(/data-view-id="(V\d{2})"/g),
].map((match) => match[1]);

if (new Set(actualViews).size !== 12 || actualViews.length !== 12) {
  throw new Error(`Expected 12 unique core view frames, got ${actualViews.join(", ")}`);
}

for (const scenario of ["S01", "S02", "S03", "S04"]) {
  if (!prototype.includes(`data-scenario="${scenario}"`)) {
    throw new Error(`Missing clickable scenario ${scenario}`);
  }
}

if (missingViews.length > 0) {
  throw new Error(`Missing Creator views: ${missingViews.join(", ")}`);
}

for (const state of [
  "happy",
  "loading",
  "empty",
  "validation",
  "provider",
  "permission",
  "session",
  "conflict",
]) {
  if (!prototype.includes(`${state}:[`)) {
    throw new Error(`Missing recovery state variant: ${state}`);
  }
}

const scripts = [...prototype.matchAll(/<script>([\s\S]*?)<\/script>/g)];
if (scripts.length !== 1) throw new Error("Expected one inline prototype script");
new Function(scripts[0][1]);

const stateMachines = await readFile("docs/product/STATE_MACHINES.md", "utf8");
for (const aggregate of ["SM-01", "SM-02", "SM-03", "SM-04", "SM-05", "SM-06", "SM-07"]) {
  if (!stateMachines.includes(aggregate)) throw new Error(`Missing state machine ${aggregate}`);
}

const permissionMatrix = await readFile("docs/product/PERMISSION_MATRIX.md", "utf8");
for (const requiredCase of ["VN Ops opens PH", "Local Finance tries approve", "Locked batch", "Global Admin crosses"]) {
  if (!permissionMatrix.includes(requiredCase)) throw new Error(`Missing permission case: ${requiredCase}`);
}

const providerMatrix = await readFile("docs/product/PROVIDER_FAILURE_MATRIX.md", "utf8");
for (const rule of ["confirmed pre-payment failure", "UNKNOWN", "Duplicate callback", "Post-success refund"]) {
  if (!providerMatrix.includes(rule)) throw new Error(`Missing provider rule: ${rule}`);
}

const g4 = await readFile("docs/product/G4_ARCHITECTURE_GATE.md", "utf8");
if (!g4.includes("GREEN / PASS")) {
  throw new Error("Business schema exists without a Green G4 architecture gate");
}

console.log(
  `workspace OK: ${required.length} required files, ${expectedViews.length} shared views, S01-S04 clickable, 7 state machines, G4-authorized DB scaffold`,
);
