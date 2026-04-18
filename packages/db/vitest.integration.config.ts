import { defineConfig } from "vitest/config";

/**
 * Vitest config for real-DB integration tests in packages/db.
 * Run via: npm run test:integration (from repo root).
 * Requires Docker (Testcontainers).
 */
export default defineConfig({
  test: {
    include: ["src/__tests__/*.real-db.test.ts"],
    exclude: ["**/node_modules/**", "**/dist/**"],
    testTimeout: 120_000,
    hookTimeout: 120_000,
    reporters: ["verbose"],
    setupFiles: ["src/__tests__/setup-integration.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["**/*.test.ts", "**/__tests__/**", "dist/**"],
    },
  },
});
