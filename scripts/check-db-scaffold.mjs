import { access, readFile, readdir } from "node:fs/promises";

const schemaPath = "apps/api/prisma/schema.prisma";
const seedPath = "apps/api/prisma/seed.sql";
const migrationsPath = "apps/api/prisma/migrations";

await Promise.all([
  access("prisma.config.ts"),
  access(schemaPath),
  access(seedPath),
  access("apps/api/src/generated/prisma/client.ts"),
]);

const schema = await readFile(schemaPath, "utf8");
const modelCount = [...schema.matchAll(/^model\s+\w+\s+\{/gm)].length;
if (modelCount < 25) throw new Error(`Expected at least 25 domain models, got ${modelCount}`);
if (/\bFloat\b/.test(schema)) throw new Error("Float is forbidden in money/domain schema");
for (const token of ["BigInt", "Decimal", "Product", "Offer", "Campaign", "CreatorCountryProfile", "ParticipationSnapshot", "LedgerEntry", "PayoutAttempt", "IdempotencyRecord", "ExternalEvent"]) {
  if (!schema.includes(token)) throw new Error(`Schema missing ${token}`);
}

const migrationDirs = (await readdir(migrationsPath, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();
if (migrationDirs.length !== 3) throw new Error(`Expected 3 migrations, got ${migrationDirs.length}`);

const migrations = (
  await Promise.all(
    migrationDirs.map((dir) => readFile(`${migrationsPath}/${dir}/migration.sql`, "utf8")),
  )
).join("\n");
for (const rule of ["FORCE ROW LEVEL SECURITY", "deny_append_only_mutation", "affiliate_runtime", "earning_net_formula"]) {
  if (!migrations.includes(rule)) throw new Error(`Migration hardening missing ${rule}`);
}

const seed = await readFile(seedPath, "utf8");
for (const market of ["'VN'", "'PH'", "'VND'", "'PHP'", "ON CONFLICT"]) {
  if (!seed.includes(market)) throw new Error(`Seed missing ${market}`);
}

console.log(`db scaffold OK: ${modelCount} models, ${migrationDirs.length} migrations, deterministic VN/PH seed, RLS/immutability hardening`);

