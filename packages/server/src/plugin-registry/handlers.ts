import type { FastifyReply, FastifyRequest } from "fastify";
import { db } from "@nodepress/db";
import { PluginRegistryService } from "./plugin-registry.service.js";
import type { PluginRegistryEntry } from "./plugin-registry.service.js";
import { installPluginWithDependencies } from "./install-service.js";
import {
  DependencyCycleDetectedError,
  DependencyDepthExceededError,
} from "./dependency-resolver.js";

// Initialize the service with the injected Drizzle db instance
const registryService = new PluginRegistryService(db);

/**
 * GET /wp/v2/plugins — List registered plugins with optional status filter, search, and pagination.
 * Public endpoint (no auth required).
 * Supports full-text search on name and meta.description via ?q=term
 */
export async function listPlugins(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<PluginRegistryEntry[]> {
  const query = request.query as Record<string, unknown>;
  const page = Math.max(1, parseInt((query["page"] as string) ?? "1", 10));
  const perPage = Math.min(
    100,
    Math.max(1, parseInt((query["per_page"] as string) ?? "10", 10)),
  );
  const status = (query["status"] as string) ?? undefined;
  const search = (query["q"] as string) ?? undefined;

  const results = await registryService.list({
    status,
    page,
    perPage,
    search,
  });

  // Compute total count for pagination headers
  const allResults = await registryService.list({
    status,
    page: 1,
    perPage: 1000,
    search,
  });
  const total = allResults.length;
  const totalPages = Math.ceil(total / perPage);

  reply.header("X-WP-Total", total.toString());
  reply.header("X-WP-TotalPages", totalPages.toString());

  return results;
}

/**
 * GET /wp/v2/plugins/:slug — Retrieve a single plugin by slug.
 * Public endpoint (no auth required).
 * Returns 404 with WP-style error response if plugin not found.
 */
export async function getPlugin(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<PluginRegistryEntry | void> {
  const params = request.params as Record<string, unknown>;
  const slug = params["slug"] as string;

  const plugin = await registryService.get(slug);

  if (!plugin) {
    return reply.status(404).send({
      code: "rest_plugin_invalid_slug",
      message: "Plugin not found.",
      data: { status: 404 },
    });
  }

  return plugin;
}

/**
 * POST /wp/v2/plugins — Register or update a plugin in the registry with dependency resolution.
 * Admin-auth required.
 * Body schema:
 *  - slug (required)
 *  - name (required)
 *  - version (required)
 *  - author, registryUrl, tarballUrl, publishedAt (optional)
 *  - meta (optional, can contain dependencies: [{ slug, version? }])
 *
 * Automatically resolves and installs dependencies before registering the main plugin.
 * Depth cap: 3 levels of transitive dependencies.
 */
export async function createPlugin(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const body = request.body as Record<string, unknown>;

  // Validate required fields
  const slug = body["slug"] as string | undefined;
  const name = body["name"] as string | undefined;
  const version = body["version"] as string | undefined;

  if (!slug || !name || !version) {
    return reply.status(400).send({
      code: "rest_missing_param",
      message: "Missing required parameters: slug, name, version are required.",
      data: { status: 400 },
    });
  }

  // Parse optional fields
  const author = (body["author"] as string | null) ?? undefined;
  const registryUrl = (body["registryUrl"] as string | null) ?? undefined;
  const tarballUrl = (body["tarballUrl"] as string | null) ?? undefined;
  const publishedAtStr = body["publishedAt"] as string | undefined;
  const meta = (body["meta"] as Record<string, unknown>) ?? undefined;

  // Convert publishedAt ISO string to Date if provided
  let publishedAt: Date | undefined = undefined;
  if (publishedAtStr) {
    try {
      publishedAt = new Date(publishedAtStr);
      if (isNaN(publishedAt.getTime())) {
        return reply.status(400).send({
          code: "rest_invalid_param",
          message: "publishedAt must be a valid ISO date string.",
          data: { status: 400 },
        });
      }
    } catch {
      return reply.status(400).send({
        code: "rest_invalid_param",
        message: "publishedAt must be a valid ISO date string.",
        data: { status: 400 },
      });
    }
  }

  // Install with dependency resolution
  try {
    const result = await installPluginWithDependencies(
      registryService,
      slug,
      version,
      {
        name,
        author,
        registryUrl,
        tarballUrl,
        publishedAt,
        meta,
      },
    );

    return reply.status(201).send({
      slug: result.slug,
      version: result.version,
      status: result.status,
      installedDependencies: result.installedDependencies,
      warnings: result.warnings,
    });
  } catch (err) {
    if (err instanceof DependencyCycleDetectedError) {
      return reply.status(422).send({
        code: "rest_dependency_cycle_detected",
        message: err.message,
        data: { status: 422 },
      });
    }

    if (err instanceof DependencyDepthExceededError) {
      return reply.status(422).send({
        code: "rest_dependency_depth_exceeded",
        message: err.message,
        data: { status: 422 },
      });
    }

    // Other errors (DB, registry lookup, etc.)
    const msg = err instanceof Error ? err.message : String(err);
    return reply.status(500).send({
      code: "rest_internal_error",
      message: `Failed to install plugin: ${msg}`,
      data: { status: 500 },
    });
  }
}

/**
 * DELETE /wp/v2/plugins/:slug — Uninstall a plugin (mark as uninstalled).
 * Admin-auth required.
 * Returns 200 with updated PluginRegistryEntry (status='uninstalled').
 * Returns 404 if plugin not found.
 * Returns 401 if not authenticated.
 */
export async function deletePlugin(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<PluginRegistryEntry | void> {
  const params = request.params as Record<string, unknown>;
  const slug = params["slug"] as string;

  const plugin = await registryService.unregister(slug);

  if (!plugin) {
    return reply.status(404).send({
      code: "rest_plugin_invalid_slug",
      message: "Plugin not found.",
      data: { status: 404 },
    });
  }

  return reply.status(200).send(plugin);
}
