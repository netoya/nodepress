import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
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
   * Return all registered plugins, optionally filtered by status.
   * Pagination: page (1-based) + perPage (default 20, max 100).
   */
  async list(filter?: {
    status?: string;
    page?: number;
    perPage?: number;
  }): Promise<PluginRegistryEntry[]> {
    const page = Math.max(1, filter?.page ?? 1);
    const perPage = Math.min(100, Math.max(1, filter?.perPage ?? 20));
    const offset = (page - 1) * perPage;

    let rows: (typeof pluginRegistry.$inferSelect)[];

    if (filter?.status) {
      rows = await this.db
        .select()
        .from(pluginRegistry)
        .where(eq(pluginRegistry.status, filter.status))
        .limit(perPage)
        .offset(offset);
    } else {
      rows = await this.db
        .select()
        .from(pluginRegistry)
        .limit(perPage)
        .offset(offset);
    }

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
}
