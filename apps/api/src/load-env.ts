import { resolve } from "node:path";

// Auto-load the repo-root .env so `pnpm dev`/`pnpm start`/`pnpm test` work without the
// caller having to manually source it first (this app's cwd is always apps/api).
if (!process.env.DATABASE_URL) {
  try {
    process.loadEnvFile(resolve(__dirname, "..", "..", "..", ".env"));
  } catch {
    // no .env on disk (e.g. env vars injected by the platform instead) — ignore
  }
}
