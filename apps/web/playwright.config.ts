import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3000",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "corepack pnpm start",
      cwd: "../api",
      url: "http://localhost:3001/health",
      reuseExistingServer: true,
      timeout: 30_000,
    },
    {
      command: "corepack pnpm dev",
      cwd: ".",
      url: "http://localhost:3000",
      reuseExistingServer: true,
      timeout: 30_000,
      env: { API_BASE_URL: "http://localhost:3001" },
    },
  ],
});
