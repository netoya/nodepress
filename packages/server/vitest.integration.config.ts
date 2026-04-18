import { defineConfig } from "vitest/config";

/**
 * Standalone Vitest config for real-DB integration tests.
 * Run via: npm run test:integration (from repo root).
 * Requires Docker.
 */
export default defineConfig({
  test: {
    include: ["src/routes/posts/__tests__/*.real-db.test.ts"],
    exclude: ["**/node_modules/**", "**/dist/**"],
    testTimeout: 120_000,
    hookTimeout: 120_000,
    reporters: ["verbose"],
    // Set a dummy DATABASE_URL so @nodepress/db/client.ts does not throw at
    // module import time. setupTestDb() overwrites it with the real container URL.
    globalSetup: [],
    setupFiles: ["src/__tests__/helpers/setup-integration.ts"],
  },
});
