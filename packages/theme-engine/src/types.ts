/**
 * @nodepress/theme-engine — public type contract.
 *
 * Declarative surface for the NodePress theme engine. Implementation is
 * scoped for Sprint 3+ per ADR-011. This file contains types only — no
 * runtime logic.
 *
 * The theme engine is responsible for three things:
 *
 * 1. Loading and validating a theme package (manifest, template map, assets).
 * 2. Resolving which template should render a given piece of content
 *    (post type + context → template). The algorithm mirrors the WordPress
 *    template hierarchy.
 * 3. Rendering the resolved template with the content payload, producing the
 *    final HTML string.
 *
 * ## Notes
 *
 * - Render output is a `string`. Streaming (`ReadableStream<string>`) is
 *   deliberately deferred; Fastify can buffer and flush. Streaming becomes an
 *   ADR when a real workload demands it.
 * - Templates are keyed by slug (not by path). Themes declare the mapping in
 *   their manifest so the engine can swap backing files without breaking
 *   references.
 * - Block rendering (Gutenberg compatibility) is an open question and lives
 *   downstream of this interface: a `Renderer` implementation may internally
 *   dispatch to a block pipeline, but the block API is not part of the public
 *   contract yet. See ADR-011 § Open Questions.
 */

// ---------------------------------------------------------------------------
// Content context
// ---------------------------------------------------------------------------

/**
 * WordPress-style post type identifier. Built-ins are listed explicitly; a
 * plain `string` fallback accommodates custom post types registered by
 * plugins without forcing every consumer to widen its types manually.
 */
export type PostType =
  | "post"
  | "page"
  | "attachment"
  | "nav_menu_item"
  | (string & { readonly _brand?: "PostType" });

/**
 * Resolution context supplied to {@link TemplateResolver.resolve}. Fields
 * mirror the WordPress template hierarchy signals: the post type being
 * rendered, its slug (for `single-<slug>.html`), the taxonomy term when
 * rendering archive pages, and whether this is the front page.
 *
 * Additional fields can be added without breaking consumers — every property
 * is optional except `postType`.
 */
export interface RenderContext {
  readonly postType: PostType;
  readonly slug?: string;
  readonly taxonomy?: string;
  readonly term?: string;
  readonly isFrontPage?: boolean;
  readonly isArchive?: boolean;
  readonly isSearch?: boolean;
}

// ---------------------------------------------------------------------------
// Template model
// ---------------------------------------------------------------------------

/**
 * A resolved template ready to be handed to a {@link Renderer}. The engine
 * never exposes file paths to callers — callers receive an opaque `Template`
 * and the renderer knows how to turn it into HTML.
 */
export interface Template {
  /** Stable slug used in the theme manifest. */
  readonly slug: string;
  /** The raw template source (format depends on the renderer). */
  readonly source: string;
  /**
   * MIME-like content type, e.g. `"text/html"` or `"text/x-wp-block"`. Used
   * by the renderer to dispatch to the correct parser. Defaults to
   * `text/html` for plain template files.
   */
  readonly contentType: string;
}

/**
 * Mapping from template slug to {@link Template}. Themes declare this map in
 * their manifest; the engine materializes it into this record on load.
 */
export type TemplateMap = Readonly<Record<string, Template>>;

// ---------------------------------------------------------------------------
// Theme package
// ---------------------------------------------------------------------------

/**
 * A loaded theme, as seen by the rest of the framework. Mirrors WordPress's
 * `style.css` metadata where it overlaps. Assets (CSS/JS) are referenced by
 * URL, not embedded.
 */
export interface Theme {
  /** Unique slug, used as a primary key in the admin registry. */
  readonly slug: string;
  /** Human-readable name rendered in the admin panel. */
  readonly name: string;
  /** SemVer string. */
  readonly version: string;
  /** Declared template catalogue. */
  readonly templates: TemplateMap;
  /**
   * URLs of CSS/JS assets to enqueue when this theme is active. Ordering is
   * preserved for asset dependency chains (ADR-002 § theme-engine).
   */
  readonly assets?: readonly string[];
}

// ---------------------------------------------------------------------------
// Resolver and renderer
// ---------------------------------------------------------------------------

/**
 * Resolves a {@link RenderContext} to a concrete {@link Template}. The
 * implementation applies the WordPress template hierarchy rules against a
 * theme's declared template map.
 */
export interface TemplateResolver {
  /**
   * Find the best template for the given context.
   *
   * Implementations must be deterministic: two calls with structurally equal
   * contexts return the same template. When no template matches, the
   * resolver returns the theme's `index` template (WP convention). If even
   * `index` is missing, the resolver throws — that is a theme packaging
   * error, not a runtime fallback scenario.
   */
  resolve(context: RenderContext): Template;
}

/**
 * Minimal data payload passed to a renderer. Kept intentionally open — the
 * concrete shape depends on the template engine and is refined by
 * implementations. Think of it as the WordPress "global post" equivalent
 * merged with the current request context.
 */
export type RenderData = Readonly<Record<string, unknown>>;

/**
 * Renders a {@link Template} with the given {@link RenderData} into an HTML
 * string. Synchronous by default — filters applied during rendering run
 * through {@link @nodepress/core#HookRegistry.applyFilters} (ADR-005),
 * which is itself synchronous.
 *
 * An asynchronous variant may be added later for data-loading templates
 * (SSR with remote fetches); the sync primitive covers the Sprint 3 scope.
 */
export interface Renderer {
  render(template: Template, data: RenderData): string;
}
