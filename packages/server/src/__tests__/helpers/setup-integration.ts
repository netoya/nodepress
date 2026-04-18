/**
 * Vitest setup file for integration tests.
 * Sets a dummy DATABASE_URL so @nodepress/db/client.ts does not throw
 * at module import time. The real URL is overwritten by setupTestDb()
 * inside the test's beforeAll.
 */
process.env["DATABASE_URL"] =
  "postgresql://placeholder:placeholder@localhost:5432/placeholder";
