import type { PluginRegistryService } from "./plugin-registry.service.js";
import {
  resolveDependenciesToInstall,
  DependencyCycleDetectedError,
  DependencyDepthExceededError,
} from "./dependency-resolver.js";

/**
 * Result of a successful plugin installation.
 */
export interface InstallResult {
  slug: string;
  version: string;
  status: string;
  installedDependencies: string[];
  warnings: string[];
}

/**
 * Install a plugin and its dependencies into the registry.
 *
 * This is a thin wrapper that:
 * 1. Resolves dependencies using resolveDependenciesToInstall
 * 2. Installs each dependency in order via registryService.register()
 * 3. Returns installation result with dependency list and any warnings
 *
 * @param registryService - PluginRegistryService instance
 * @param slug - Plugin slug to install
 * @param version - Plugin version (required)
 * @param metadata - Optional metadata (name, author, registryUrl, tarballUrl, publishedAt, meta)
 * @returns InstallResult with slug, version, status, installedDependencies, warnings
 *
 * Throws:
 * - DependencyCycleDetectedError if a cycle is detected
 * - DependencyDepthExceededError if depth > 3
 * - Any error from registryService.register() (DB errors, etc.)
 */
export async function installPluginWithDependencies(
  registryService: PluginRegistryService,
  slug: string,
  version: string,
  metadata: {
    name: string;
    author?: string;
    registryUrl?: string;
    tarballUrl?: string;
    publishedAt?: Date;
    meta?: Record<string, unknown>;
  },
): Promise<InstallResult> {
  const warnings: string[] = [];
  const installedDependencies: string[] = [];

  // Resolve dependencies to install (excludes already installed/active ones)
  let dependenciesToInstall: string[];
  try {
    dependenciesToInstall = await resolveDependenciesToInstall(
      registryService,
      slug,
    );
  } catch (err) {
    // Re-throw dependency resolution errors
    if (
      err instanceof DependencyCycleDetectedError ||
      err instanceof DependencyDepthExceededError
    ) {
      throw err;
    }
    // Any other error from registry lookups
    throw err;
  }

  // Install each dependency in order
  for (const depSlug of dependenciesToInstall) {
    // Check if this is the main plugin or a dependency
    if (depSlug === slug) {
      // Install the main plugin
      await registryService.register({
        slug,
        name: metadata.name,
        version,
        author: metadata.author,
        registryUrl: metadata.registryUrl,
        tarballUrl: metadata.tarballUrl,
        publishedAt: metadata.publishedAt,
        meta: metadata.meta,
      });
      installedDependencies.push(slug);
    } else {
      // For dependencies, we need their metadata from registry
      const depEntry = await registryService.get(depSlug);
      if (!depEntry) {
        // Dependency not found in registry — this should not happen
        // because resolveDependencies would have included it
        // Skip with warning
        warnings.push(
          `Dependency '${depSlug}' not found in registry; skipped.`,
        );
        continue;
      }

      // If dependency is already installed/active, skip
      if (depEntry.status === "installed" || depEntry.status === "active") {
        continue;
      }

      // Install the dependency with its existing metadata
      await registryService.register({
        slug: depSlug,
        name: depEntry.name,
        version: depEntry.version,
        author: depEntry.author ?? undefined,
        registryUrl: depEntry.registryUrl ?? undefined,
        tarballUrl: depEntry.tarballUrl ?? undefined,
        publishedAt: depEntry.publishedAt ?? undefined,
        meta: depEntry.meta,
      });
      installedDependencies.push(depSlug);
    }
  }

  return {
    slug,
    version,
    status: "installed",
    installedDependencies,
    warnings,
  };
}
