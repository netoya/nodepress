import { describe, it, expect, beforeEach } from "vitest";
import type {
  PluginRegistryService,
  PluginRegistryEntry,
} from "../plugin-registry.service.js";
import {
  resolveDependencies,
  resolveDependenciesToInstall,
  DependencyCycleDetectedError,
  DependencyDepthExceededError,
} from "../dependency-resolver.js";

/**
 * Mock implementation of PluginRegistryService for testing.
 */
class MockPluginRegistry implements PluginRegistryService {
  private plugins: Map<string, PluginRegistryEntry> = new Map();

  add(entry: Partial<PluginRegistryEntry>) {
    const full: PluginRegistryEntry = {
      slug: entry.slug || "test",
      name: entry.name || "Test",
      version: entry.version || "1.0.0",
      status: entry.status || "uninstalled",
      author: entry.author || null,
      registryUrl: entry.registryUrl || null,
      tarballUrl: entry.tarballUrl || null,
      publishedAt: entry.publishedAt || null,
      activatedAt: entry.activatedAt || null,
      errorLog: entry.errorLog || null,
      meta: entry.meta || {},
    };
    this.plugins.set(full.slug, full);
  }

  async get(slug: string) {
    return this.plugins.get(slug) || null;
  }

  async list() {
    return Array.from(this.plugins.values());
  }

  async register() {
    throw new Error("Not implemented in mock");
  }

  async unregister() {
    throw new Error("Not implemented in mock");
  }
}

describe("dependency-resolver", () => {
  let registry: MockPluginRegistry;

  beforeEach(() => {
    registry = new MockPluginRegistry();
  });

  describe("resolveDependencies", () => {
    it("should resolve a plugin with no dependencies", async () => {
      registry.add({
        slug: "seo-basic",
        name: "SEO Basic",
        meta: {},
      });

      const result = await resolveDependencies(registry, "seo-basic");
      expect(result).toEqual(["seo-basic"]);
    });

    it("should resolve a plugin with one dependency", async () => {
      registry.add({
        slug: "meta-utils",
        name: "Meta Utils",
        meta: {},
      });
      registry.add({
        slug: "seo-basic",
        name: "SEO Basic",
        meta: {
          dependencies: [{ slug: "meta-utils" }],
        },
      });

      const result = await resolveDependencies(registry, "seo-basic");
      expect(result).toEqual(["meta-utils", "seo-basic"]);
    });

    it("should resolve a plugin with multiple dependencies", async () => {
      registry.add({ slug: "dep-a", name: "Dep A", meta: {} });
      registry.add({ slug: "dep-b", name: "Dep B", meta: {} });
      registry.add({
        slug: "main",
        name: "Main",
        meta: {
          dependencies: [{ slug: "dep-a" }, { slug: "dep-b" }],
        },
      });

      const result = await resolveDependencies(registry, "main");
      expect(result).toEqual(["dep-a", "dep-b", "main"]);
    });

    it("should resolve nested dependencies (depth 2)", async () => {
      registry.add({ slug: "dep-c", name: "Dep C", meta: {} });
      registry.add({
        slug: "dep-b",
        name: "Dep B",
        meta: {
          dependencies: [{ slug: "dep-c" }],
        },
      });
      registry.add({
        slug: "dep-a",
        name: "Dep A",
        meta: {
          dependencies: [{ slug: "dep-b" }],
        },
      });

      const result = await resolveDependencies(registry, "dep-a");
      expect(result).toEqual(["dep-c", "dep-b", "dep-a"]);
    });

    it("should resolve deeply nested dependencies (depth 3)", async () => {
      registry.add({ slug: "level-3", name: "L3", meta: {} });
      registry.add({
        slug: "level-2",
        name: "L2",
        meta: { dependencies: [{ slug: "level-3" }] },
      });
      registry.add({
        slug: "level-1",
        name: "L1",
        meta: { dependencies: [{ slug: "level-2" }] },
      });
      registry.add({
        slug: "main",
        name: "Main",
        meta: { dependencies: [{ slug: "level-1" }] },
      });

      const result = await resolveDependencies(registry, "main");
      expect(result).toEqual(["level-3", "level-2", "level-1", "main"]);
    });

    it("should detect a cycle (A → B → A)", async () => {
      registry.add({
        slug: "a",
        name: "A",
        meta: { dependencies: [{ slug: "b" }] },
      });
      registry.add({
        slug: "b",
        name: "B",
        meta: { dependencies: [{ slug: "a" }] },
      });

      await expect(resolveDependencies(registry, "a")).rejects.toThrow(
        DependencyCycleDetectedError,
      );
    });

    it("should detect a cycle (A → B → C → A)", async () => {
      registry.add({
        slug: "a",
        name: "A",
        meta: { dependencies: [{ slug: "b" }] },
      });
      registry.add({
        slug: "b",
        name: "B",
        meta: { dependencies: [{ slug: "c" }] },
      });
      registry.add({
        slug: "c",
        name: "C",
        meta: { dependencies: [{ slug: "a" }] },
      });

      await expect(resolveDependencies(registry, "a")).rejects.toThrow(
        DependencyCycleDetectedError,
      );
    });

    it("should reject depth > 3 (default max)", async () => {
      registry.add({ slug: "level-4", name: "L4", meta: {} });
      registry.add({
        slug: "level-3",
        name: "L3",
        meta: { dependencies: [{ slug: "level-4" }] },
      });
      registry.add({
        slug: "level-2",
        name: "L2",
        meta: { dependencies: [{ slug: "level-3" }] },
      });
      registry.add({
        slug: "level-1",
        name: "L1",
        meta: { dependencies: [{ slug: "level-2" }] },
      });
      registry.add({
        slug: "main",
        name: "Main",
        meta: { dependencies: [{ slug: "level-1" }] },
      });

      await expect(resolveDependencies(registry, "main")).rejects.toThrow(
        DependencyDepthExceededError,
      );
    });

    it("should allow custom maxDepth", async () => {
      registry.add({ slug: "level-5", name: "L5", meta: {} });
      registry.add({
        slug: "level-4",
        name: "L4",
        meta: { dependencies: [{ slug: "level-5" }] },
      });
      registry.add({
        slug: "level-3",
        name: "L3",
        meta: { dependencies: [{ slug: "level-4" }] },
      });
      registry.add({
        slug: "level-2",
        name: "L2",
        meta: { dependencies: [{ slug: "level-3" }] },
      });
      registry.add({
        slug: "level-1",
        name: "L1",
        meta: { dependencies: [{ slug: "level-2" }] },
      });
      registry.add({
        slug: "main",
        name: "Main",
        meta: { dependencies: [{ slug: "level-1" }] },
      });

      const result = await resolveDependencies(
        registry,
        "main",
        new Set(),
        0,
        5,
      );
      expect(result).toEqual([
        "level-5",
        "level-4",
        "level-3",
        "level-2",
        "level-1",
        "main",
      ]);
    });

    it("should deduplicate shared dependencies", async () => {
      registry.add({ slug: "shared", name: "Shared", meta: {} });
      registry.add({
        slug: "dep-a",
        name: "Dep A",
        meta: { dependencies: [{ slug: "shared" }] },
      });
      registry.add({
        slug: "dep-b",
        name: "Dep B",
        meta: { dependencies: [{ slug: "shared" }] },
      });
      registry.add({
        slug: "main",
        name: "Main",
        meta: {
          dependencies: [{ slug: "dep-a" }, { slug: "dep-b" }],
        },
      });

      const result = await resolveDependencies(registry, "main");
      expect(result).toEqual(["shared", "dep-a", "dep-b", "main"]);
      // shared should appear only once
      expect(result.filter((s) => s === "shared").length).toBe(1);
    });

    it("should handle missing dependency (not in registry)", async () => {
      registry.add({
        slug: "main",
        name: "Main",
        meta: {
          dependencies: [{ slug: "missing-dep" }],
        },
      });

      const result = await resolveDependencies(registry, "main");
      // Missing dependency is still included in result (will error during install)
      expect(result).toContain("missing-dep");
      expect(result).toContain("main");
    });

    it("should handle empty dependencies array", async () => {
      registry.add({
        slug: "main",
        name: "Main",
        meta: {
          dependencies: [],
        },
      });

      const result = await resolveDependencies(registry, "main");
      expect(result).toEqual(["main"]);
    });

    it("should handle undefined meta.dependencies", async () => {
      registry.add({
        slug: "main",
        name: "Main",
        meta: {},
      });

      const result = await resolveDependencies(registry, "main");
      expect(result).toEqual(["main"]);
    });
  });

  describe("resolveDependenciesToInstall", () => {
    it("should filter out already-installed dependencies", async () => {
      registry.add({
        slug: "dep-a",
        name: "Dep A",
        status: "active",
        meta: {},
      });
      registry.add({
        slug: "dep-b",
        name: "Dep B",
        status: "uninstalled",
        meta: {},
      });
      registry.add({
        slug: "main",
        name: "Main",
        status: "uninstalled",
        meta: {
          dependencies: [{ slug: "dep-a" }, { slug: "dep-b" }],
        },
      });

      const result = await resolveDependenciesToInstall(registry, "main");
      expect(result).toEqual(["dep-b", "main"]);
      expect(result).not.toContain("dep-a");
    });

    it("should return empty list if all deps and main already installed", async () => {
      registry.add({
        slug: "dep-a",
        name: "Dep A",
        status: "installed",
        meta: {},
      });
      registry.add({
        slug: "main",
        name: "Main",
        status: "installed",
        meta: {
          dependencies: [{ slug: "dep-a" }],
        },
      });

      const result = await resolveDependenciesToInstall(registry, "main");
      expect(result).toEqual([]);
    });

    it("should return main plugin even if already exists (caller will handle)", async () => {
      registry.add({
        slug: "main",
        name: "Main",
        status: "uninstalled",
        meta: {},
      });

      const result = await resolveDependenciesToInstall(registry, "main");
      expect(result).toEqual(["main"]);
    });

    it("should include plugin even if status is error", async () => {
      registry.add({
        slug: "main",
        name: "Main",
        status: "error",
        meta: {},
      });

      const result = await resolveDependenciesToInstall(registry, "main");
      expect(result).toEqual(["main"]);
    });

    it("should skip plugin if status is installed", async () => {
      registry.add({
        slug: "main",
        name: "Main",
        status: "installed",
        meta: {},
      });

      const result = await resolveDependenciesToInstall(registry, "main");
      expect(result).toEqual([]);
    });

    it("should skip plugin if status is active", async () => {
      registry.add({
        slug: "main",
        name: "Main",
        status: "active",
        meta: {},
      });

      const result = await resolveDependenciesToInstall(registry, "main");
      expect(result).toEqual([]);
    });

    it("should handle complex scenario: mixed statuses", async () => {
      registry.add({ slug: "dep-1", name: "D1", status: "active", meta: {} });
      registry.add({
        slug: "dep-2",
        name: "D2",
        status: "installed",
        meta: {},
      });
      registry.add({
        slug: "dep-3",
        name: "D3",
        status: "uninstalled",
        meta: {},
      });
      registry.add({
        slug: "main",
        name: "Main",
        status: "uninstalled",
        meta: {
          dependencies: [
            { slug: "dep-1" },
            { slug: "dep-2" },
            { slug: "dep-3" },
          ],
        },
      });

      const result = await resolveDependenciesToInstall(registry, "main");
      // Only dep-3 and main should be returned
      expect(result).toEqual(["dep-3", "main"]);
    });
  });

  describe("Error messages", () => {
    it("should include cycle chain in error message", async () => {
      registry.add({
        slug: "a",
        name: "A",
        meta: { dependencies: [{ slug: "b" }] },
      });
      registry.add({
        slug: "b",
        name: "B",
        meta: { dependencies: [{ slug: "c" }] },
      });
      registry.add({
        slug: "c",
        name: "C",
        meta: { dependencies: [{ slug: "a" }] },
      });

      try {
        await resolveDependencies(registry, "a");
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(DependencyCycleDetectedError);
        expect(String(err)).toContain("a → b → c");
      }
    });

    it("should include depth chain in error message", async () => {
      registry.add({ slug: "level-4", name: "L4", meta: {} });
      registry.add({
        slug: "level-3",
        name: "L3",
        meta: { dependencies: [{ slug: "level-4" }] },
      });
      registry.add({
        slug: "level-2",
        name: "L2",
        meta: { dependencies: [{ slug: "level-3" }] },
      });
      registry.add({
        slug: "level-1",
        name: "L1",
        meta: { dependencies: [{ slug: "level-2" }] },
      });
      registry.add({
        slug: "main",
        name: "Main",
        meta: { dependencies: [{ slug: "level-1" }] },
      });

      try {
        await resolveDependencies(registry, "main");
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(DependencyDepthExceededError);
        expect(String(err)).toContain("max depth (3)");
        expect(String(err)).toContain("main → level-1 → level-2 → level-3");
      }
    });
  });
});
