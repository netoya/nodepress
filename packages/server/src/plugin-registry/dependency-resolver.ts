import type { PluginRegistryService } from "./plugin-registry.service.js";

/**
 * Error classes for dependency resolution.
 */
export class DependencyCycleDetectedError extends Error {
  constructor(chain: string[]) {
    super(
      `Dependency cycle detected: ${chain.join(" → ")}. Cycle: ${chain[chain.length - 1]} → ${chain[0]}`,
    );
    this.name = "DependencyCycleDetectedError";
  }
}

export class DependencyDepthExceededError extends Error {
  constructor(chain: string[], maxDepth: number) {
    super(
      `Dependency resolution exceeded max depth (${maxDepth}). Chain: ${chain.join(" → ")}`,
    );
    this.name = "DependencyDepthExceededError";
  }
}

/**
 * Dependency object from plugin manifest.
 * Only slug is required (unversioned for Sprint 7).
 * Version is parsed but not used for resolution yet (ADR-024 § 5.2).
 */
export interface PluginDependency {
  slug: string;
  version?: string;
}

/**
 * Resolve plugin dependencies recursively with depth cap and cycle detection.
 *
 * @param registryService - PluginRegistryService instance for lookups
 * @param slug - Plugin slug to resolve dependencies for
 * @param visited - Set of slugs already in the current resolution chain (cycle detection)
 * @param depth - Current recursion depth (0 = top-level plugin)
 * @param maxDepth - Maximum allowed recursion depth (ADR-024 default = 3)
 * @param chain - Breadcrumb trail of slugs for error messages
 * @returns Array of slugs in dependency-first order: all deps before the main plugin
 *
 * Example:
 *   A depends on [B, C]
 *   B depends on [D]
 *   C has no deps
 *   Result: [D, B, C, A]
 */
export async function resolveDependencies(
  registryService: PluginRegistryService,
  slug: string,
  visited: Set<string> = new Set(),
  depth: number = 0,
  maxDepth: number = 3,
  chain: string[] = [],
): Promise<string[]> {
  // Cycle detection: if this slug is already in visited, it's a cycle
  if (visited.has(slug)) {
    throw new DependencyCycleDetectedError([...chain, slug]);
  }

  // Depth check: if we're already at maxDepth and trying to go deeper, error
  if (depth > maxDepth) {
    throw new DependencyDepthExceededError([...chain, slug], maxDepth);
  }

  // Fetch the plugin manifest
  const plugin = await registryService.get(slug);
  if (!plugin) {
    // Plugin not found in registry — treat as a missing dependency
    // The caller will handle the error (e.g., fail the install)
    return [slug];
  }

  // Parse dependencies from meta.dependencies (array of PluginDependency objects)
  const dependencies: PluginDependency[] = [];
  if (plugin.meta && Array.isArray(plugin.meta.dependencies)) {
    dependencies.push(...(plugin.meta.dependencies as PluginDependency[]));
  }

  // Mark this slug as visited
  const newVisited = new Set(visited);
  newVisited.add(slug);
  const newChain = [...chain, slug];

  // Recursively resolve each dependency
  const result: string[] = [];
  for (const dep of dependencies) {
    const depChain = await resolveDependencies(
      registryService,
      dep.slug,
      newVisited,
      depth + 1,
      maxDepth,
      newChain,
    );
    // Flatten and deduplicate: append only deps not already in result
    for (const item of depChain) {
      if (!result.includes(item)) {
        result.push(item);
      }
    }
  }

  // Append the current plugin at the end (dependencies first, main plugin last)
  result.push(slug);

  return result;
}

/**
 * Resolve dependencies for a plugin, filtering out already-installed plugins.
 *
 * @param registryService - PluginRegistryService instance
 * @param slug - Plugin slug to resolve
 * @param maxDepth - Max recursion depth (default 3)
 * @returns Array of slugs to install (excluding already installed/active ones), in order
 *
 * The returned list is ready to be iterated for installation in order.
 */
export async function resolveDependenciesToInstall(
  registryService: PluginRegistryService,
  slug: string,
  maxDepth: number = 3,
): Promise<string[]> {
  // Resolve the full dependency graph
  const allDeps = await resolveDependencies(
    registryService,
    slug,
    new Set(),
    0,
    maxDepth,
  );

  // Filter: keep only slugs that are NOT already installed or active
  const toInstall: string[] = [];
  for (const depSlug of allDeps) {
    const existing = await registryService.get(depSlug);
    if (
      !existing ||
      (existing.status !== "installed" && existing.status !== "active")
    ) {
      toInstall.push(depSlug);
    }
  }

  return toInstall;
}
