import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Real-DB integration tests require Docker and are excluded from the
    // default test run. Execute them via: npm run test:integration
    exclude: ["**/node_modules/**", "**/dist/**", "**/*.real-db.test.ts"],
  },
});
