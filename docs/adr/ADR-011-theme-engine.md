# ADR-011: Theme Engine Architecture — `@nodepress/theme-engine`

- **Status:** Proposed
- **Date:** 2026-04-18
- **Author:** Román (Tech Lead)
- **Related:** ADR-001 (Architecture Overview — § theme-engine), ADR-002 (Folder Structure), ADR-005 (Hook System Semantics — sync filters)

## Context

The theme engine resolves and renders the public-facing HTML of a NodePress site. It is architecturally independent of the admin panel (admin is a React SPA that never invokes the theme engine) and architecturally dependent on the hook system (templates and rendered output pass through WP-compatible filters like `the_content` and `the_title`, which are synchronous per ADR-005).

Sprint 1 left `packages/theme-engine/src/index.ts` as `export {}`. Leaving this interface undefined while the server and plugin-api packages ship creates a contract vacuum: the server team cannot type-safely reference "the template to render a post" without inventing a local contract, and the plugin-api team cannot decide whether block rendering hooks expose theme internals. Committing the public type surface now unblocks both.

Full implementation — template loader, renderer for Gutenberg blocks, asset pipeline, theme.json validation — is Sprint 3+ work (per ADR-002 § ordering). This ADR scopes that work and records the API commitments made at skeleton time.

## Decision

The theme engine exposes three composable roles plus a packaging type. Public types live in `packages/theme-engine/src/types.ts`:

- **`Theme`** — `{ slug, name, version, templates: TemplateMap, assets? }`. Stable packaging shape consumed by the admin registry and the loader.
- **`TemplateMap`** — `Readonly<Record<string, Template>>`. Themes declare their template catalogue in their manifest; the loader materializes the map at load time.
- **`Template`** — `{ slug, source, contentType }`. Opaque to callers: the resolver hands one back, the renderer consumes it. File paths are never exposed.
- **`RenderContext`** — the WP template hierarchy signals: `postType`, optional `slug`, optional `taxonomy`/`term`, and page flags (`isFrontPage`, `isArchive`, `isSearch`). This is the input to `TemplateResolver.resolve`.
- **`PostType`** — string literal union of WP built-ins (`post`, `page`, `attachment`, `nav_menu_item`) with a branded `string` fallback for custom post types registered by plugins.
- **`TemplateResolver`** — deterministic `resolve(context) => Template`. Falls back to the `index` template per WP convention; a missing `index` is a theme packaging error, not a runtime fallback scenario.
- **`Renderer`** — `render(template, data: RenderData) => string`. **Synchronous** by design, aligned with ADR-005: render-time filters are synchronous, so introducing async here would introduce a subtle asymmetry and wreck drop-in compatibility with ported WP themes.

Rationale for the key choices:

- **Output is `string`, not `ReadableStream`.** Streaming rendering is a performance optimization for large templates that Fastify can add as a middleware later without changing the engine contract. Introducing streams now would complicate the common case (Fastify reply buffering handles anything under ~1MB trivially) for a benefit we do not need in v1.
- **Templates keyed by slug, not path.** The engine never exposes paths. Themes may reorganize their filesystem layout between versions without breaking downstream code that references templates by slug.
- **Resolver is deterministic.** Two calls with structurally equal contexts produce the same template. Caching is therefore trivial and correct; there is no per-request hidden state.
- **Block rendering is not in the public contract.** Gutenberg compatibility is a subsystem a `Renderer` implementation may dispatch to internally, but the block API is not exposed now. Committing to a block type surface before Sprint 3 would be speculative.

## Open Questions

- **Template language.** Plain HTML with a PHP-like `{{ }}` interpolation? A JSX-for-server variant? Twig-compatible syntax (what ClassicPress's plugin-hungry fork expects)? The decision is out of scope for this skeleton; the `Template.contentType` field is the hook for dispatching to the right parser.
- **Gutenberg block rendering.** Block pipeline lives inside the `Renderer` implementation but is not part of the public contract. Separate ADR expected in Sprint 3 alongside the first concrete renderer.
- **Async data loading in templates.** If a template needs to fetch data during render (SSR with remote sources), the sync `render()` primitive forces the caller to prepare data upfront. An `AsyncRenderer` variant may be added later if a real workload demands it — we have none in the Sprint 1–3 roadmap.
- **Asset pipeline ownership.** `Theme.assets` is a URL array now. Whether NodePress ships an asset bundler (Vite integration, enqueue dependency graph à la `wp_enqueue_script`) or defers to theme authors using their own tooling is a Sprint 3+ question.
- **Theme hot-reload in development.** The plugin system reloads at runtime via cache-busted `dynamic import()` (ADR-004). Whether themes follow the same pattern or only reload between dev-server restarts is undecided.
- **Integration with `HookRegistry`.** The renderer will apply `the_content`, `the_title`, and friends. How the renderer gets a handle to the registry (constructor injection? module-level singleton? context object?) is a Sprint 3 decision. The theme-engine types deliberately stay decoupled from `@nodepress/core` today to keep the option open.

## References

- `packages/theme-engine/src/types.ts` — frozen type surface
- ADR-001 § Hook System Design — filters applied at render time
- ADR-002 § theme-engine package layout — resolver, renderer, blocks, assets modules
- ADR-005 § Hook System Semantics — rationale for sync `render()` signature
- [WordPress Template Hierarchy](https://developer.wordpress.org/themes/basics/template-hierarchy/)
