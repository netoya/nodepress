import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
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
