import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Exclude real-DB integration tests from the default test run.
    // These require Docker and are run via: npm run test:integration
    exclude: ["**/node_modules/**", "**/dist/**", "**/*.real-db.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json-summary"],
      include: [
        "packages/*/src/**/*.ts",
        "admin/src/**/*.ts",
        "admin/src/**/*.tsx",
      ],
      exclude: [
        "packages/spike-phpwasm/**",
        "**/*.test.ts",
        "**/*.test.tsx",
        "**/__tests__/**",
        "**/dist/**",
        "**/node_modules/**",
      ],
      thresholds: {
        // packages/core aspirational thresholds — warnings, not errors
        // Applied per-file via the workspace config; global threshold here is informative
      },
    },
  },
});
