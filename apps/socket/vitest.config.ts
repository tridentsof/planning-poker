import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
    testTimeout: 10000,
    // Tests always use the in-memory repository (PLAN.md §3): no Postgres required.
    env: { USE_MEMORY_REPO: "true" },
  },
});
