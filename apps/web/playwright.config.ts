import { defineConfig, devices } from "@playwright/test";

/** PLAN.md §10, §12 step 9. Runs the web and socket (memory repo) servers for E2E tests. */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 30000,
  use: {
    baseURL: "http://localhost:3100",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "node ../socket/dist/index.js",
      port: 4100,
      env: { USE_MEMORY_REPO: "true", PORT: "4100", CORS_ORIGINS: "http://localhost:3100" },
      reuseExistingServer: !process.env.CI,
      timeout: 30000,
    },
    {
      // next dev (not build+start): NEXT_PUBLIC_* vars are inlined at compile time, and this
      // lets the test run point the client at the ephemeral test socket port without a
      // separate production build step.
      command: "pnpm exec next dev -p 3100",
      port: 3100,
      env: { NEXT_PUBLIC_SOCKET_URL: "http://localhost:4100" },
      reuseExistingServer: !process.env.CI,
      timeout: 60000,
    },
  ],
});
