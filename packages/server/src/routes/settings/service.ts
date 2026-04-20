import { db, options } from "@nodepress/db";
import { eq } from "drizzle-orm";

/**
 * Settings shape — WP-compat naming (matches /wp/v2/settings endpoint).
 */
export interface SettingsShape {
  title: string;
  description: string;
  url: string;
  email: string;
  posts_per_page: number;
  default_category: number;
}

/**
 * Settings Service — manages WordPress-compatible options from the database.
 * The 6 whitelisted settings are persisted as options with autoload=true.
 * Values are stored as JSONB and extracted to native types on serialize.
 *
 * Whitelist:
 *   - siteTitle → options.name="title" or "siteTitle"
 *   - siteDescription → options.name="description"
 *   - siteUrl → options.name="url" or "home"
 *   - adminEmail → options.name="email" or "admin_email"
 *   - postsPerPage → options.name="posts_per_page"
 *   - defaultCategory → options.name="default_category"
 *
 * WP REST API uses snake_case: title, description, url, email, posts_per_page, default_category.
 */
export class SettingsService {
  private whitelist = [
    "title",
    "description",
    "url",
    "email",
    "posts_per_page",
    "default_category",
  ];

  /**
   * Get all whitelisted settings from the options table.
   * Reads options with autoload=true and returns as a flat object with native types.
   * Missing options default to sensible values.
   */
  async getSettings(): Promise<SettingsShape> {
    const rows = await db
      .select()
      .from(options)
      .where((opts) => eq(opts.autoload, true));

    // Build a map for easier lookup
    const optionsMap = new Map<string, unknown>();
    for (const row of rows) {
      optionsMap.set(row.name, row.value);
    }

    // Extract values, converting from JSONB to native types
    const extractValue = (key: string, defaultValue: unknown): unknown => {
      const val = optionsMap.get(key);
      if (val === undefined || val === null) return defaultValue;
      // JSONB values are already parsed; if it's a simple scalar, use it directly
      return val;
    };

    return {
      title: (extractValue("title", "WordPress") as string) || "WordPress",
      description: (extractValue("description", "") as string) || "",
      url:
        (extractValue("url", "http://localhost:3000") as string) ||
        "http://localhost:3000",
      email:
        (extractValue("email", "admin@example.com") as string) ||
        "admin@example.com",
      posts_per_page:
        parseInt(String(extractValue("posts_per_page", 10)), 10) || 10,
      default_category:
        parseInt(String(extractValue("default_category", 1)), 10) || 1,
    };
  }

  /**
   * Update whitelisted settings.
   * Only keys in the whitelist are persisted; others are silently ignored.
   * Performs upsert: inserts if missing, updates if present.
   * Values are stored as JSONB native types.
   */
  async updateSettings(data: Partial<SettingsShape>): Promise<void> {
    // Filter to whitelist only
    const updates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      if (this.whitelist.includes(key)) {
        updates[key] = value;
      }
    }

    // Upsert each setting
    for (const [key, value] of Object.entries(updates)) {
      await db
        .insert(options)
        .values({
          name: key,
          value: value, // Store as JSONB native type
          autoload: true,
        })
        .onConflictDoUpdate({
          target: options.name,
          set: { value: value },
        });
    }
  }
}
