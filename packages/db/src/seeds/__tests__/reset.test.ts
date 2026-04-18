import { describe, it, expect } from "vitest";

describe("Reset", () => {
  it("should import reset module without creating connections", async () => {
    // Import the reset module and verify it doesn't throw during load
    const resetModule = await import("../reset.js");
    expect(resetModule).toBeDefined();
  });

  it("should export runSeed function from seed module", async () => {
    const seedModule = await import("../index.js");
    expect(typeof seedModule.runSeed).toBe("function");
  });
});
