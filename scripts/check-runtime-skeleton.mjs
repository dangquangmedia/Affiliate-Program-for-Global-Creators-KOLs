import { access, readFile } from "node:fs/promises";

const required = [
  "apps/api/src/main.ts",
  "apps/api/src/app.module.ts",
  "apps/api/src/health.controller.ts",
  "apps/api/src/markets.controller.ts",
  "apps/api/src/markets.service.ts",
  "apps/api/src/prisma.service.ts",
  "apps/api/test/market-context.smoke.test.ts",
  "apps/web/src/app/page.tsx",
  "apps/web/src/app/[market]/page.tsx",
  "apps/web/src/lib/market-context.ts",
  "apps/web/e2e/market-round-trip.spec.ts",
  "apps/web/playwright.config.ts",
  "README.md",
  "docs/product/G5_WEEK1_GATE.md",
];

await Promise.all(required.map((path) => access(path)));

const gate = await readFile("docs/product/G5_WEEK1_GATE.md", "utf8");
if (!gate.includes("GO") && !gate.includes("CONDITIONAL GO")) {
  throw new Error("G5 gate file must record a GO or CONDITIONAL GO decision");
}

console.log(
  `runtime skeleton OK: ${required.length} Day 5 artifacts present, Week 1 gate decision recorded`,
);
