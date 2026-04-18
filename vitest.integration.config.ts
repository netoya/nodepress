import { defineConfig } from "vitest/config";

/**
 * Standalone Vitest config for real-DB integration tests.
 * Sets workspace: false to bypass vitest.workspace.ts.
 * Run via: npm run test:integration
 * Requires Docker.
 */
export default defineConfig({
  test: {
    workspace: undefined,
    include: ["packages/server/src/routes/posts/__tests__/*.real-db.test.ts"],
    exclude: ["**/node_modules/**", "**/dist/**"],
    testTimeout: 120_000,
    hookTimeout: 120_000,
    reporters: ["verbose"],
  },
});
