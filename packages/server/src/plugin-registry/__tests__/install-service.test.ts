import { describe, it, expect, beforeEach } from "vitest";
import type {
  PluginRegistryService,
  PluginRegistryEntry,
} from "../plugin-registry.service.js";
import { installPluginWithDependencies } from "../install-service.js";
import {
  DependencyCycleDetectedError,
  DependencyDepthExceededError,
} from "../dependency-resolver.js";

/**
 * Mock implementation of PluginRegistryService for testing.
 */
class MockPluginRegistry implements PluginRegistryService {
  private plugins: Map<string, PluginRegistryEntry> = new Map();
  private registered: PluginRegistryEntry[] = [];

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

  async register(data: any) {
    const entry: PluginRegistryEntry = {
      slug: data.slug,
      name: data.name,
      version: data.version,
      status: "installed",
      author: data.author || null,
      registryUrl: data.registryUrl || null,
      tarballUrl: data.tarballUrl || null,
      publishedAt: data.publishedAt || null,
      activatedAt: null,
      errorLog: null,
      meta: data.meta || {},
    };
    this.plugins.set(entry.slug, entry);
    this.registered.push(entry);
    return entry;
  }

  async unregister() {
    throw new Error("Not implemented in mock");
  }

  getRegistered() {
    return this.registered;
  }

  clearRegistered() {
    this.registered = [];
  }
}

describe("install-service", () => {
  let registry: MockPluginRegistry;

  beforeEach(() => {
    registry = new MockPluginRegistry();
  });

  describe("installPluginWithDependencies", () => {
    it("should install a plugin with no dependencies", async () => {
      registry.add({
        slug: "seo-basic",
        name: "SEO Basic",
        version: "1.0.0",
        meta: {},
      });

      const result = await installPluginWithDependencies(
        registry,
        "seo-basic",
        "1.0.0",
        {
          name: "SEO Basic",
          meta: {},
        },
      );

      expect(result.slug).toBe("seo-basic");
      expect(result.version).toBe("1.0.0");
      expect(result.status).toBe("installed");
      expect(result.installedDependencies).toEqual(["seo-basic"]);
      expect(result.warnings).toHaveLength(0);

      const registered = registry.getRegistered();
      expect(registered).toHaveLength(1);
      expect(registered[0].slug).toBe("seo-basic");
    });

    it("should install a plugin with one dependency", async () => {
      registry.add({
        slug: "meta-utils",
        name: "Meta Utils",
        version: "1.0.0",
        meta: {},
      });
      registry.add({
        slug: "seo-basic",
        name: "SEO Basic",
        version: "1.0.0",
        meta: {
          dependencies: [{ slug: "meta-utils" }],
        },
      });

      const result = await installPluginWithDependencies(
        registry,
        "seo-basic",
        "1.0.0",
        {
          name: "SEO Basic",
          meta: {
            dependencies: [{ slug: "meta-utils" }],
          },
        },
      );

      expect(result.slug).toBe("seo-basic");
      expect(result.installedDependencies).toEqual(["meta-utils", "seo-basic"]);
      expect(result.warnings).toHaveLength(0);

      const registered = registry.getRegistered();
      expect(registered.map((p) => p.slug)).toEqual([
        "meta-utils",
        "seo-basic",
      ]);
    });

    it("should skip already-installed dependencies", async () => {
      registry.add({
        slug: "meta-utils",
        name: "Meta Utils",
        version: "1.0.0",
        status: "active",
        meta: {},
      });
      registry.add({
        slug: "seo-basic",
        name: "SEO Basic",
        version: "1.0.0",
        meta: {
          dependencies: [{ slug: "meta-utils" }],
        },
      });

      registry.clearRegistered();

      const result = await installPluginWithDependencies(
        registry,
        "seo-basic",
        "1.0.0",
        {
          name: "SEO Basic",
          meta: {
            dependencies: [{ slug: "meta-utils" }],
          },
        },
      );

      expect(result.installedDependencies).toEqual(["seo-basic"]);
      expect(result.warnings).toHaveLength(0);

      const registered = registry.getRegistered();
      expect(registered.map((p) => p.slug)).toEqual(["seo-basic"]);
    });

    it("should install multiple dependencies in order", async () => {
      registry.add({
        slug: "dep-a",
        name: "Dep A",
        version: "1.0.0",
        meta: {},
      });
      registry.add({
        slug: "dep-b",
        name: "Dep B",
        version: "1.0.0",
        meta: {},
      });
      registry.add({
        slug: "main",
        name: "Main",
        version: "1.0.0",
        meta: {
          dependencies: [{ slug: "dep-a" }, { slug: "dep-b" }],
        },
      });

      const result = await installPluginWithDependencies(
        registry,
        "main",
        "1.0.0",
        {
          name: "Main",
          meta: {
            dependencies: [{ slug: "dep-a" }, { slug: "dep-b" }],
          },
        },
      );

      expect(result.installedDependencies).toEqual(["dep-a", "dep-b", "main"]);

      const registered = registry.getRegistered();
      expect(registered.map((p) => p.slug)).toEqual(["dep-a", "dep-b", "main"]);
    });

    it("should detect cycle and throw", async () => {
      registry.add({
        slug: "a",
        name: "A",
        version: "1.0.0",
        meta: { dependencies: [{ slug: "b" }] },
      });
      registry.add({
        slug: "b",
        name: "B",
        version: "1.0.0",
        meta: { dependencies: [{ slug: "a" }] },
      });

      await expect(
        installPluginWithDependencies(registry, "a", "1.0.0", { name: "A" }),
      ).rejects.toThrow(DependencyCycleDetectedError);
    });

    it("should detect depth exceeded and throw", async () => {
      registry.add({ slug: "level-4", name: "L4", version: "1.0.0", meta: {} });
      registry.add({
        slug: "level-3",
        name: "L3",
        version: "1.0.0",
        meta: { dependencies: [{ slug: "level-4" }] },
      });
      registry.add({
        slug: "level-2",
        name: "L2",
        version: "1.0.0",
        meta: { dependencies: [{ slug: "level-3" }] },
      });
      registry.add({
        slug: "level-1",
        name: "L1",
        version: "1.0.0",
        meta: { dependencies: [{ slug: "level-2" }] },
      });
      registry.add({
        slug: "main",
        name: "Main",
        version: "1.0.0",
        meta: { dependencies: [{ slug: "level-1" }] },
      });

      await expect(
        installPluginWithDependencies(registry, "main", "1.0.0", {
          name: "Main",
        }),
      ).rejects.toThrow(DependencyDepthExceededError);
    });

    it("should warn about missing dependencies", async () => {
      registry.add({
        slug: "main",
        name: "Main",
        version: "1.0.0",
        meta: {
          dependencies: [{ slug: "missing-dep" }],
        },
      });

      const result = await installPluginWithDependencies(
        registry,
        "main",
        "1.0.0",
        {
          name: "Main",
          meta: {
            dependencies: [{ slug: "missing-dep" }],
          },
        },
      );

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain("missing-dep");
    });

    it("should handle deeply nested dependencies (depth 3)", async () => {
      registry.add({ slug: "level-3", name: "L3", version: "1.0.0", meta: {} });
      registry.add({
        slug: "level-2",
        name: "L2",
        version: "1.0.0",
        meta: { dependencies: [{ slug: "level-3" }] },
      });
      registry.add({
        slug: "level-1",
        name: "L1",
        version: "1.0.0",
        meta: { dependencies: [{ slug: "level-2" }] },
      });
      registry.add({
        slug: "main",
        name: "Main",
        version: "1.0.0",
        meta: { dependencies: [{ slug: "level-1" }] },
      });

      const result = await installPluginWithDependencies(
        registry,
        "main",
        "1.0.0",
        {
          name: "Main",
          meta: { dependencies: [{ slug: "level-1" }] },
        },
      );

      expect(result.installedDependencies).toEqual([
        "level-3",
        "level-2",
        "level-1",
        "main",
      ]);

      const registered = registry.getRegistered();
      expect(registered.map((p) => p.slug)).toEqual([
        "level-3",
        "level-2",
        "level-1",
        "main",
      ]);
    });

    it("should preserve metadata during installation", async () => {
      registry.add({
        slug: "main",
        name: "Main Plugin",
        version: "2.1.0",
        author: "Test Author",
        meta: {
          description: "A test plugin",
        },
      });

      await installPluginWithDependencies(registry, "main", "2.1.0", {
        name: "Main Plugin",
        author: "Test Author",
        meta: {
          description: "A test plugin",
        },
      });

      const registered = registry.getRegistered();
      expect(registered[0].name).toBe("Main Plugin");
      expect(registered[0].version).toBe("2.1.0");
      expect(registered[0].author).toBe("Test Author");
      expect(registered[0].meta.description).toBe("A test plugin");
    });
  });
});
