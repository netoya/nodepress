import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { eq, sql, or, ilike } from "drizzle-orm";
import { pluginRegistry } from "@nodepress/db";

/**
 * Public shape returned by all PluginRegistryService methods.
 * Mirrors the plugin_registry table with Sprint 6 columns included.
 */
export interface PluginRegistryEntry {
  slug: string;
  name: string;
  version: string;
  status: string;
  author: string | null;
  registryUrl: string | null;
  tarballUrl: string | null;
  publishedAt: Date | null;
  activatedAt: Date | null;
  errorLog: string | null;
  meta: Record<string, unknown>;
}

/**
 * Input shape for register (upsert).
 */
export interface RegisterInput {
  slug: string;
  name: string;
  version: string;
  author?: string;
  registryUrl?: string;
  tarballUrl?: string;
  publishedAt?: Date;
  meta?: Record<string, unknown>;
}

// Drizzle DB type inferred from the schema — keeps service decoupled from transport layer.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DrizzleDb = NodePgDatabase<any>;

/**
 * Map a raw DB row to the public PluginRegistryEntry shape.
 */
function toEntry(row: typeof pluginRegistry.$inferSelect): PluginRegistryEntry {
  return {
    slug: row.slug,
    name: row.name,
    version: row.version,
    status: row.status,
    author: row.author ?? null,
    registryUrl: row.registryUrl ?? null,
    tarballUrl: row.tarballUrl ?? null,
    publishedAt: row.publishedAt ?? null,
    activatedAt: row.activatedAt ?? null,
    errorLog: row.errorLog ?? null,
    meta: (row.meta as Record<string, unknown>) ?? {},
  };
}

/**
 * Service for managing the plugin registry.
 *
 * Inject a Drizzle db instance via constructor — enables unit testing with
 * a mock db without touching the singleton.
 */
export class PluginRegistryService {
  constructor(private readonly db: DrizzleDb) {}

  /**
   * Return all registered plugins, optionally filtered by status or search term.
   * Pagination: page (1-based) + perPage (default 20, max 100).
   * Search: full-text filter on name or meta.description (ILIKE %term%).
   */
  async list(filter?: {
    status?: string;
    page?: number;
    perPage?: number;
    search?: string;
  }): Promise<PluginRegistryEntry[]> {
    const page = Math.max(1, filter?.page ?? 1);
    const perPage = Math.min(100, Math.max(1, filter?.perPage ?? 20));
    const offset = (page - 1) * perPage;

    // Build WHERE conditions
    const conditions = [];

    if (filter?.status) {
      conditions.push(eq(pluginRegistry.status, filter.status));
    }

    if (filter?.search) {
      const searchTerm = `%${filter.search}%`;
      // Match on name OR description from meta.description
      conditions.push(
        or(
          ilike(pluginRegistry.name, searchTerm),
          sql`${pluginRegistry.meta}->>'description' ILIKE ${searchTerm}`,
        ),
      );
    }

    let query = this.db.select().from(pluginRegistry);

    if (conditions.length === 1) {
      query = query.where(conditions[0]);
    } else if (conditions.length > 1) {
      query = query.where(or(...conditions)!);
    }

    if (filter?.search) {
      query = query.orderBy(pluginRegistry.name);
    }

    const rows = await query.limit(perPage).offset(offset);

    return rows.map(toEntry);
  }

  /**
   * Fetch a single plugin by slug. Returns null if not found.
   */
  async get(slug: string): Promise<PluginRegistryEntry | null> {
    const [row] = await this.db
      .select()
      .from(pluginRegistry)
      .where(eq(pluginRegistry.slug, slug))
      .limit(1);

    return row ? toEntry(row) : null;
  }

  /**
   * Register or update a plugin entry (upsert by slug).
   * On conflict (same slug) updates all provided fields.
   */
  async register(data: RegisterInput): Promise<PluginRegistryEntry> {
    const values: typeof pluginRegistry.$inferInsert = {
      slug: data.slug,
      name: data.name,
      version: data.version,
      author: data.author ?? null,
      registryUrl: data.registryUrl ?? null,
      tarballUrl: data.tarballUrl ?? null,
      publishedAt: data.publishedAt ?? null,
      meta: data.meta ?? {},
    };

    const [row] = await this.db
      .insert(pluginRegistry)
      .values(values)
      .onConflictDoUpdate({
        target: pluginRegistry.slug,
        set: {
          name: values.name,
          version: values.version,
          author: values.author,
          registryUrl: values.registryUrl,
          tarballUrl: values.tarballUrl,
          publishedAt: values.publishedAt,
          meta: values.meta,
        },
      })
      .returning();

    // returning() always yields a row after insert/upsert
    return toEntry(row!);
  }

  /**
   * Unregister a plugin by slug.
   * Updates status to 'uninstalled' (row preserved for audit).
   * Returns the updated entry or null if not found.
   */
  async unregister(slug: string): Promise<PluginRegistryEntry | null> {
    const [row] = await this.db
      .update(pluginRegistry)
      .set({ status: "uninstalled" })
      .where(eq(pluginRegistry.slug, slug))
      .returning();

    return row ? toEntry(row) : null;
  }
}
