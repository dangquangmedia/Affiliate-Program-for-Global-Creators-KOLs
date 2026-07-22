import { defineConfig, devices } from "@playwright/test";

const goApiCommand = process.env.GO_E2E_BINARY
  ? `"${process.env.GO_E2E_BINARY}"`
  : "go run ./cmd/api";

export default defineConfig({
  testDir: "./e2e",
  // Các flow tiền dùng chung PostgreSQL và có chủ ý lock/gom earning. Chạy song song khiến test
  // này tiêu thụ fixture của test khác, tạo failure không xác định dù từng flow đều đúng.
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3200",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: process.env.E2E_EXTERNAL_SERVERS ? undefined : [
    {
      command: goApiCommand,
      cwd: "../api-go",
      url: "http://localhost:3101/health",
      // Parity gate must never pass by accidentally reusing the legacy Nest process.
      reuseExistingServer: false,
      timeout: 30_000,
      env: { PORT: "3101", WEB_ORIGIN: "http://localhost:3200" },
    },
    {
      command: "corepack pnpm exec next dev -p 3200",
      cwd: ".",
      url: "http://localhost:3200",
      reuseExistingServer: false,
      timeout: 30_000,
      env: {
        API_BASE_URL: "http://localhost:3101",
        NEXT_PUBLIC_API_BASE_URL: "http://localhost:3101",
      },
    },
  ],
});
