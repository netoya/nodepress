import { describe, it, expect } from "vitest";
import { deriveSlug, findAvailableSlug } from "../slug.js";

describe("slug.ts", () => {
  describe("deriveSlug()", () => {
    it("converts title to lowercase kebab-case", () => {
      expect(deriveSlug("Hello World")).toBe("hello-world");
    });

    it("handles multiple spaces", () => {
      expect(deriveSlug("Hello   World")).toBe("hello-world");
    });

    it("removes non-alphanumeric characters except hyphens", () => {
      expect(deriveSlug("[DEMO] Hello from demo")).toBe("demo-hello-from-demo");
    });

    it("handles unicode characters by stripping them", () => {
      expect(deriveSlug("Título con Ñ y acentos")).toBe("ttulo-con--y-acentos");
    });

    it("handles empty title", () => {
      expect(deriveSlug("")).toBe("");
    });

    it("handles title with only symbols", () => {
      expect(deriveSlug("@#$%")).toBe("untitled");
    });

    it("respects max 200 char limit", () => {
      const longTitle = "a".repeat(250);
      expect(deriveSlug(longTitle).length).toBe(200);
    });
  });

  describe("findAvailableSlug()", () => {
    it("returns base slug if no collision", async () => {
      const exists = async () => false;
      const result = await findAvailableSlug("hello-world", exists);
      expect(result).toBe("hello-world");
    });

    it("returns slug-2 on first collision", async () => {
      const existingSlug = "hello-world";
      const exists = async (slug: string) => slug === existingSlug;
      const result = await findAvailableSlug(existingSlug, exists);
      expect(result).toBe("hello-world-2");
    });

    it("finds slug-3 if both base and -2 exist", async () => {
      const existingSlugs = new Set(["hello-world", "hello-world-2"]);
      const exists = async (slug: string) => existingSlugs.has(slug);
      const result = await findAvailableSlug("hello-world", exists);
      expect(result).toBe("hello-world-3");
    });

    it("handles multiple collisions up to -50", async () => {
      const existingSlugs = new Set([
        "hello-world",
        ...Array.from({ length: 49 }, (_, i) => `hello-world-${i + 2}`),
      ]);
      const exists = async (slug: string) => existingSlugs.has(slug);
      const result = await findAvailableSlug("hello-world", exists);
      expect(result).toBe("hello-world-51");
    });

    it("throws error after 100 collision attempts", async () => {
      const exists = async () => true; // Everything exists
      await expect(findAvailableSlug("hello-world", exists)).rejects.toThrow(
        "Unable to find available slug after 100 attempts",
      );
    });

    it("handles empty base slug", async () => {
      const exists = async () => false;
      const result = await findAvailableSlug("", exists);
      expect(result).toBe("");
    });
  });
});
