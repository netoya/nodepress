import { defineConfig } from "vitest/config";

// Coverage thresholds for packages/db.
//
// Status: WARN-ONLY (Sprint 1).
// Enforcement mode: thresholds are defined but the CI job runs this package
// with `continue-on-error: true` until Sprint 2 retro decides full enforcement.
//
// Sprint 2 action: remove the CI `continue-on-error` flag to activate hard enforcement.
//
// Why warn-only now: packages/db has no unit tests yet (only a placeholder).
// Threshold: 75/75/70/75 (stmts/branches/funcs/lines) — conservative baseline.
export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["**/*.test.ts", "**/__tests__/**", "dist/**"],
      // WARN-ONLY: these thresholds will cause coverage failure locally and in CI.
      // CI enforces this with `continue-on-error: true` until Sprint 2.
      // To skip locally: VITEST_COVERAGE_THRESHOLD_SKIP=1 vitest run (or remove temporarily)
      thresholds: {
        statements: 75,
        branches: 75,
        functions: 70,
        lines: 75,
      },
    },
  },
});
