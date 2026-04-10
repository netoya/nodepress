# ADR-001: Architecture Overview — NodePress

- **Status:** Accepted
- **Date:** 2026-04-09
- **Author:** Román (Tech Lead)

## Context

NodePress aims to be a modern CMS built on Node.js/TypeScript that maintains compatibility with the WordPress ecosystem (plugins, themes, REST API). The key challenge is balancing WP compatibility with a clean, modern architecture.

## Decision

### Stack

| Layer | Choice | Why | Trade-off |
|---|---|---|---|
| Runtime | Node.js 22 LTS + TypeScript 5.x strict | Ecosystem size, async-native, type safety | No PHP — WP plugins need adaptation layer |
| HTTP Framework | Fastify | Plugin system built-in, schema validation, 2x faster than Express | Smaller community than Express |
| Database | PostgreSQL 16 | JSONB for meta, CTEs for hierarchies, row-level security | WP ecosystem assumes MySQL — queries need translation |
| ORM | Drizzle ORM | Type-safe, SQL-like API, migrations built-in, lightweight | Younger than Prisma — smaller ecosystem |
| Cache | Redis 7 | Object cache, sessions, transient API compatible with WP | Extra infra dependency |
| Admin Panel | React 19 + Vite | Modern DX, component ecosystem, fast builds | Separate from WP's PHP admin — no backward compat |
| Testing | Vitest | Fast, TS-native, compatible with Jest API | — |
| Auth | Custom (Passport.js strategies) | WP-compatible roles/caps + modern OAuth2/OIDC | More work than Auth0, but full control needed for WP compat |

### Component Diagram

```
┌─────────────────────────────────────────────────────────┐
│                     CLIENTS                              │
│  (Browser, Mobile, Third-party apps, WP-CLI compat)     │
└──────────────┬──────────────────────┬───────────────────┘
               │ REST API v2          │ GraphQL (future)
               ▼                      ▼
┌─────────────────────────────────────────────────────────┐
│                   HTTP LAYER (Fastify)                    │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐  │
│  │ Auth Guard   │  │ Rate Limiter │  │ CORS / Helmet  │  │
│  └─────────────┘  └──────────────┘  └────────────────┘  │
└──────────────┬──────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────┐
│                   HOOK SYSTEM (core)                      │
│                                                           │
│  do_action('save_post', post)    ◄── Action hooks         │
│  apply_filters('the_content', c) ◄── Filter hooks         │
│                                                           │
│  Priority queue (10 = default, like WP)                   │
│  Sync filters / Async actions                             │
└──────────────┬──────────────────────────────────────────┘
               │
       ┌───────┴────────┬──────────────────┐
       ▼                ▼                  ▼
┌────────────┐  ┌──────────────┐  ┌──────────────────┐
│  CONTENT   │  │   PLUGIN     │  │   THEME          │
│  ENGINE    │  │   LOADER     │  │   ENGINE          │
│            │  │              │  │                    │
│ Posts      │  │ JS plugins   │  │ Template resolver  │
│ Pages      │  │ WP compat    │  │ Block rendering    │
│ CPT        │  │ layer        │  │ Asset pipeline     │
│ Taxonomies │  │ Sandbox      │  │                    │
│ Media      │  │ (VM context) │  │                    │
└─────┬──────┘  └──────┬───────┘  └────────┬─────────┘
      │                │                    │
      ▼                ▼                    ▼
┌─────────────────────────────────────────────────────────┐
│                  DATA ACCESS LAYER                        │
│                                                           │
│  ┌──────────┐  ┌───────────┐  ┌────────────────┐        │
│  │ Drizzle  │  │  Redis    │  │  File Storage  │        │
│  │ (PG)     │  │  Cache    │  │  (S3-compat)   │        │
│  └──────────┘  └───────────┘  └────────────────┘        │
└─────────────────────────────────────────────────────────┘
```

### Hook System Design

The hook system replicates WordPress's `do_action` / `apply_filters` semantics:

```
HookRegistry {
  actions: Map<string, PriorityQueue<HookCallback>>
  filters: Map<string, PriorityQueue<FilterCallback>>

  addAction(tag, callback, priority = 10)
  addFilter(tag, callback, priority = 10)
  doAction(tag, ...args): Promise<void>       // async, parallel-safe
  applyFilters(tag, value, ...args): value    // sync, sequential (like WP)
  removeAction(tag, callback)
  removeFilter(tag, callback)
  hasAction(tag): boolean
  hasFilter(tag): boolean
}
```

**Key decisions:**
- **Filters are synchronous.** WP filters are synchronous and plugins depend on this. Async filters would break the mental model and ordering guarantees.
- **Actions are async.** Actions don't return values, so async is safe and enables I/O in hooks.
- **Priority is numeric (default 10).** Identical to WP. Lower number = earlier execution.
- **Tag naming convention:** `snake_case`, matching WP hook names where applicable (e.g., `save_post`, `the_content`, `init`).

### Plugin Loading Strategy

```
plugins/
  my-plugin/
    plugin.json        ← manifest (replaces PHP header comments)
    index.ts           ← entry point, exports activate/deactivate
    hooks/             ← hook registrations
```

**Loading sequence:**
1. Scan `plugins/` directory for `plugin.json` manifests
2. Validate manifest (name, version, dependencies, WP compat flag)
3. Load in dependency order (topological sort)
4. Each plugin calls `activate()` which registers hooks
5. Plugins with `wpCompat: true` get access to a WP API shim layer

**WP Compatibility Layer:**
- Provides global-like functions: `add_action`, `add_filter`, `get_option`, `wp_query`, etc.
- These are thin wrappers around NodePress core APIs
- **No PHP bridge.** PHP-to-JS transpilation is out of scope. Plugins must be JS/TS native, but the API surface mirrors WP.
- Trade-off: We lose direct WP plugin reuse but gain type safety, testability, and performance. The API familiarity reduces migration effort for WP developers.

**Sandboxing:**
- Each plugin runs in a Node.js `vm.Context` with controlled globals
- Plugins cannot access filesystem or network directly — only through provided APIs
- Crash isolation: a failing plugin doesn't take down the server

### Database Schema Approach

**Decision: Clean-slate schema with WP data import/export compatibility.**

WP's schema (`wp_posts`, `wp_postmeta` as EAV, `wp_options` as key-value) is optimized for MySQL and PHP's flexibility. Replicating it in PostgreSQL would waste PG's strengths.

**Our approach:**
- **Posts:** Proper columns for common fields + JSONB `meta` column (replaces EAV `postmeta`)
- **Taxonomies:** Proper relational tables with junction tables
- **Options:** JSONB-based settings table, typed
- **Users:** Proper columns + JSONB `capabilities` (replaces serialized PHP arrays)
- **WP Import/Export:** CLI tool to migrate from WP's MySQL schema to NodePress PG schema

```
posts (id, type, status, title, slug, content, excerpt, author_id, 
       parent_id, menu_order, meta JSONB, created_at, updated_at)

terms (id, taxonomy, name, slug, description, parent_id, meta JSONB)

term_relationships (post_id, term_id, order)

users (id, login, email, display_name, password_hash, 
       roles text[], capabilities JSONB, meta JSONB)

options (id, name UNIQUE, value JSONB, autoload boolean)

comments (id, post_id, author_id, parent_id, content, 
          status, type, meta JSONB, created_at)
```

**Trade-off:** We lose byte-for-byte schema compatibility with WP, but gain:
- 10-100x faster meta queries (JSONB vs EAV joins)
- Type safety in the ORM layer
- GIN indexes on JSONB for flexible querying
- No serialized PHP arrays

### REST API Compatibility

- Mount WP REST API v2 routes under `/wp-json/wp/v2/` for drop-in client compatibility
- Same response shapes, pagination headers (`X-WP-Total`, `X-WP-TotalPages`), and query params
- Authentication via Application Passwords (WP-compat) + Bearer tokens (modern)
- Custom endpoints register via `register_rest_route()` equivalent

### Authentication & Roles

- WP-compatible role system: `administrator`, `editor`, `author`, `contributor`, `subscriber`
- Capability-based: `edit_posts`, `publish_posts`, `manage_options`, etc.
- Stored as `roles[]` + `capabilities JSONB` on user record
- Extensible: plugins can register custom roles/capabilities via hooks
- Session: JWT + refresh tokens (not WP's cookie-based auth)

## Consequences

- **Positive:** Modern stack, type-safe, fast, extensible, familiar API for WP developers
- **Negative:** No direct PHP plugin reuse — plugins must be ported to JS/TS
- **Risk:** WP API surface is massive — we'll implement incrementally, starting with posts/pages/taxonomies/users
- **Mitigation:** WP API conformance test suite to validate endpoint compatibility

## References

- [WordPress REST API Handbook](https://developer.wordpress.org/rest-api/)
- [WordPress Plugin API](https://developer.wordpress.org/plugins/)
- [Fastify Documentation](https://fastify.dev/docs/latest/)
- [Drizzle ORM](https://orm.drizzle.team/)
