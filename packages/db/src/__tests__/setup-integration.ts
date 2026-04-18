/**
 * Vitest setup file for packages/db real-DB integration tests.
 * Sets a dummy DATABASE_URL so client.ts does not throw at module import time.
 * The real URL is overwritten by the inline setupTestDb() inside the test suite.
 */
process.env["DATABASE_URL"] =
  "postgresql://placeholder:placeholder@localhost:5432/placeholder";
