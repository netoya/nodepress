# ADR-025: Content Polymorphism — Pages over Posts Table

- **Status:** Accepted
- **Date:** 2026-04-20
- **Accepted:** 2026-04-20
- **Author:** Román (Tech Lead)
- **Sprint:** Mini-sprint intermedio (Pages / Users / Settings, 2026-07-14 → 2026-07-18)
- **Related:** ADR-001 (Architecture Overview), ADR-005 (Hook System Semantics — `pre_save_post`, `the_content`), ADR-007 (Slug Auto-Suffix), ADR-009 (Context Param `view|edit`), ADR-017 (Tier 2 Bridge Surface — `the_content` flows through the bridge transparently)

## Context

The mini-sprint Pages/Users/Settings requires NodePress to expose WordPress-compatible Pages at `/wp/v2/pages` (WP REST v2 surface). Pages in WordPress are semantically distinct from Posts — they are static, hierarchical, ordered — but structurally they are stored in the same table (`wp_posts`) with a discriminator column `post_type = "page"`. Every compat client (wp-cli, WordPress mobile apps, third-party REST clients) expects this exact contract: separate endpoints, shared storage shape, identical field surface plus two extras (`parent`, `menu_order`).

NodePress already ships every structural prerequisite. `packages/db/src/schema/posts.ts` declares `posts.type` as `varchar(20)` with default `"post"`, and `posts.parentId` exists as a self-referential foreign key. The composite index `posts_type_status_idx` already covers the query pattern `WHERE type = ? AND status = ?` — the shape used by both `listPosts` (for posts) and the future `listPages` (for pages). The current implementation does not exercise any of this: every handler in `packages/server/src/routes/posts/handlers.ts` implicitly assumes `type = "post"` without filtering on it.

There are three failure modes the design must close:

1. **The absent filter is an active bug, not just latent.** `listPosts` today runs `SELECT * FROM posts` with no `WHERE type = 'post'`. The moment a single row with `type = "page"` lands in the table, `GET /wp/v2/posts` returns pages too — contract violation against WP REST v2, where `/wp/v2/posts` must only return post-typed rows. Mini-sprint M2 (page creation) is the triggering event; the fix is scoped to M2, not deferred.
2. **`createPost` hardcodes `authorId = 1`.** Line 157 of `handlers.ts` comments "In production, this should come from the authenticated user context." If we parametrise by `postType` without correcting this, every page created through the API is owned by user 1 regardless of who authored the request. Any downstream feature that trusts `author` (capability checks, edit permissions, WP-compat `_embedded.author`) silently corrupts.
3. **Duplicating `handlers.ts` would diverge.** The tempting shortcut — copy the file to `pages/handlers.ts`, swap the string literal — creates two parallel implementations of the same business logic (slug derivation, hook dispatch via `pre_save_post`, `the_content` filter application, `context=edit|view` branching, pagination headers). Two implementations will drift. One of the two will accept a patch the other never receives. The cost of the divergence is paid by Sprint 8+, not by us.

The decision below commits to the **polymorphic approach WordPress itself uses** and documents the constraints that keep the polymorphism safe.

## Decision

**Pages are stored in the `posts` table with `type = "page"`. A handler factory parametrises the post type without editing the existing `handlers.ts` in place.** Zero schema migrations, one new file, one surgical fix to the existing listing query.

### 1. Storage: reuse `posts` table, discriminate by `type` column

The `posts.type varchar(20) default "post"` column is the discriminator. Every existing column applies unchanged — `slug`, `title`, `content`, `excerpt`, `status`, `authorId`, `parentId`, `meta` — plus the two page-specific fields added below as schema-level defaults, not as new columns. No migration is required for M1.

**Invariant:** one row per content item, regardless of type. The `slug` remains unique across types (WP matches this behaviour — you cannot have a post and a page sharing the same slug). Slug auto-suffix from ADR-007 applies to pages identically.

**`posts_type_status_idx`** (already present) satisfies the dominant query pattern `WHERE type = ? AND status = ?`. No new index is required.

### 2. Handler factory: `createPostHandler(postType: string)` in a new file

A new file `packages/server/src/routes/posts/handler-factory.ts` exports a single factory function:

```ts
export function createPostHandler(postType: string) {
  return {
    listPosts: async (request, reply) => {
      /* filters by eq(posts.type, postType) */
    },
    getPost: async (request, reply) => {
      /* ...with type guard */
    },
    createPost: async (request, reply) => {
      /* inserts with type: postType, authorId: request.user.id */
    },
    updatePost: async (request, reply) => {
      /* ... */
    },
    deletePost: async (request, reply) => {
      /* ... */
    },
  };
}
```

The existing `packages/server/src/routes/posts/handlers.ts` is **not edited in place**. Two reasons:

- **Tests already assert against the current handler signatures.** In-place refactor forces every existing test (posts CRUD, `posts.real-db.test.ts`, `bridge.integration.test.ts`, demo specs) to churn. Factory pattern keeps `handlers.ts` importable for posts while pages consume the factory.
- **Rollback is trivial.** If the factory approach shows friction during M2, reverting is `rm handler-factory.ts` and re-pointing the pages route file. The existing posts handler continues to serve posts unaffected.

Migration path for posts: the existing `handlers.ts` is expected to migrate to `createPostHandler("post")` in a later sprint once the factory has proven its shape. Mini-sprint does not force that migration — pages are the only consumer at delivery time.

### 3. Bug fixes scoped to M2 (non-deferrable)

Two fixes ride with the factory and must not be split into follow-up tickets:

- **`listPosts` filter:** the new factory emits `SELECT * FROM posts WHERE type = $1` where `$1` is the `postType` the factory was constructed with. For posts this is `"post"`; for pages this is `"page"`. The **existing** `handlers.ts` listing is updated in the same PR to add `eq(posts.type, "post")` — otherwise introducing pages immediately breaks `GET /wp/v2/posts`. This is debt repayment at the earliest actionable moment, not a new feature.
- **`authorId` from the authenticated request:** the factory reads `request.user.id` from the Fastify authentication hook (ADR-001 Bearer token flow; `request.user` is populated by the auth decorator). The `authorId = 1` literal at line 157 is removed in the factory version. The existing `handlers.ts` keeps the literal until a follow-up migrates it — this ADR does not force the existing file to change beyond the `listPosts` filter.

### 4. Schema additions: `parent` + `menu_order` at the top level

Pages extend the WP post surface with two fields that must appear at the **root** of the REST response object, not nested inside `_nodepress.*` or any namespaced envelope:

| Field        | Type                   | Source                                                                                          | WP-compat mapping       |
| ------------ | ---------------------- | ----------------------------------------------------------------------------------------------- | ----------------------- |
| `parent`     | `integer \| null`      | `posts.parentId` (column already exists)                                                        | `parent` (nullable int) |
| `menu_order` | `integer`, default `0` | `posts.menuOrder` — **stored in `meta` JSONB** as `menu_order` key; no new column in Sprint MVP | `menu_order`            |

`parent` maps one-to-one to the existing `posts.parentId` column. No migration.

`menu_order` is persisted via the existing `meta JSONB` column with key `menu_order`. Zero migrations, but the schema layer must:

1. Expose `menu_order` at root of the `PageSchema` (not inside `meta`).
2. Default to `0` on create when omitted.
3. Persist to `meta.menu_order`, read from `meta.menu_order` on serialize.

Promotion of `menu_order` to a first-class column is deferred until query-frequent sorting pressure appears (e.g. admin Pages list sorts by `menu_order ASC` and table size exceeds the row-scan threshold). Pattern reused from ADR-023 "first-class columns when queried/indexed, JSONB for descriptive metadata".

**`PageSchema` is an extension of `PostSchema`.** Shape: all PostSchema fields (`id`, `title`, `content`, `slug`, `status`, `author`, `_links`, etc.) plus `parent` and `menu_order` at the top level. WP compat clients that read `/wp/v2/pages` find `parent` and `menu_order` as root-level fields, exactly matching WordPress REST v2.

### 5. Circular parent: client-side validation only, MVP

A page cannot be its own ancestor (direct or transitive). Backend MVP **does not** validate this — the validation lives in the admin page editor (M8, Lucas), which loads the current ancestor chain and prevents selecting any of its members as the new parent.

**Rationale for deferring backend validation:**

- The attack surface is effectively internal: only authenticated admins can create pages in Sprint MVP. An admin who deliberately forges a circular `parent` via direct REST POST is exploiting themselves.
- Recursive CTE validation (`WITH RECURSIVE ancestors AS ...`) at write time adds a second query to every page create/update for a case that does not happen in ordinary usage.
- Sprint 8 technical debt ticket: backend enforcement via DB trigger or pre-insert recursive CTE. Documented in the mini-sprint NO-DO list under "Pages hierarchy recursive".

### 6. Hook semantics: `pre_save_post` and `the_content` apply to pages

ADR-005 filter `pre_save_post` (sync, before DB write) and `the_content` (sync, on serialize) apply to **every row served through the factory**, regardless of `postType`. Pages benefit from bridge Tier 2 (ADR-017) shortcode rendering transparently — `[footnote]`, `[su_button]`, `[contact-form-7]` render in page content without any pages-specific wiring. This is the primary architectural payoff of polymorphism over a parallel table: the hook ecosystem is already implemented and page content flows through it for free.

## Alternatives Considered

### A. Separate `pages` table

A new table `pages` with columns mirroring `posts` plus `parentId`/`menu_order`.

**Discarded because:**

- Requires migration (schema change + seed rollback path) — violates the mini-sprint "zero migration" constraint.
- Duplicates every downstream mechanism: hook dispatch, slug auto-suffix, context-param branching, bridge pilot injection. Two codepaths to maintain, two sets of tests, two places a future field has to be added.
- Breaks the WP-compat storage model. WordPress itself uses one table — any attempt to import a WP dump (ADR-022) would need a splitter mapping `wp_posts` rows by `post_type` to either our `posts` or our `pages`. Unnecessary complexity for the importer.
- No query-performance benefit: `posts_type_status_idx` already partitions the hot path by type.

### B. Duplicate the `handlers.ts` file into `pages/handlers.ts`

Copy the existing file, swap the literal `"post"` for `"page"`, adjust schemas.

**Discarded because:**

- Two parallel implementations diverge in code review: a fix to the posts flow lands in one file and not the other. The divergence is invisible until the first bug reveals it.
- Duplicates the hook dispatch logic, which touches ADR-005 semantics. Two sites of error for filter ordering, priority inheritance, error wrapping.
- Doubles the surface audited by Helena for security review (passes through `the_content` → bridge Tier 2).
- No rollback advantage over the factory: a buggy factory reverts by deleting one file; two buggy files require two reverts.

### C. Polymorphic single handler that inspects `request.routerPath`

Single `handlers.ts` that checks `request.routerPath.includes("/pages")` to decide type.

**Discarded because:**

- Couples the handler to its routing shape. A future refactor that moves `/wp/v2/pages` to a different path breaks the type dispatch.
- Makes the handler harder to unit-test (needs a request fixture with the right path, instead of a handler constructed with a known type).
- Introduces a string-matching conditional in the hot path. The factory approach resolves the type once at construction, not per-request.

## Consequences

### What changes

- New file: `packages/server/src/routes/posts/handler-factory.ts` (factory function, returns typed handler object).
- New file: `packages/server/src/routes/pages/index.ts` (route registration, calls factory with `"page"`).
- Existing `packages/server/src/routes/posts/handlers.ts` gains one change: `listPosts` adds `eq(posts.type, "post")` filter.
- `PageSchema` lives alongside `PostSchema` in `packages/server/src/routes/pages/schemas.ts`, extends by composition (spread the shared fields, add `parent`, `menu_order`).
- OpenAPI gains `/wp/v2/pages` + `/wp/v2/pages/{id}` surfaces with `PageSchema`.

### What does not change

- No DB migrations. `posts.type`, `posts.parentId`, `posts.meta` already exist.
- No changes to the hook system (ADR-005) or bridge (ADR-017). Pages content flows through `the_content` transparently.
- The existing `handlers.ts` keeps the `authorId = 1` literal. The factory does not reach into the existing file to change it beyond the `listPosts` filter. A follow-up ticket in Sprint 8 migrates `handlers.ts` to consume the factory and inherits the authentication fix.

### Risks

- **`listPosts` filter fix may break tests that insert mixed types.** Mitigation: test fixtures that seed rows never specify `type` explicitly today (default `"post"` applies), so the filter is transparent for existing tests. M2 adds test fixtures for pages that seed `type: "page"` explicitly.
- **Factory signature evolution.** If future post types (attachments, custom post types) need shared behaviour the factory does not yet expose, we pay the cost of extending the factory — but only once, not once per duplicated handler.
- **Mini-sprint scope creep temptation.** The factory exists; adding "one more quick post type" during the same PR is easy. Guard: M1 ADR freezes the scope at two types (`post`, `page`); further types require their own ticket.

### Enforcement

- Code review for M2 (Carmen) verifies: (a) factory used for pages, (b) `handlers.ts` listing adds the filter, (c) `authorId` in the factory reads `request.user.id`.
- M3 tests (Ingrid) include a case where a post and a page share no cross-contamination: `POST /wp/v2/pages` then `GET /wp/v2/posts` returns only posts, and vice versa. Without this test the `listPosts` filter regression is invisible.
- Sprint 8 ticket carried forward: backend circular-parent validation + `handlers.ts` migration to factory + `menu_order` column promotion if sort pressure materialises.

## Sign-off

- **2026-04-20 — Román (Tech Lead):** Accepted as blocking gate for M2 (Carmen) and M3 (Ingrid). Factory pattern confirmed; in-place `handlers.ts` edit rejected.

## References

- `packages/db/src/schema/posts.ts:36` — `posts_type_status_idx` composite index on `(type, status)`.
- `packages/server/src/routes/posts/handlers.ts:157` — `authorId = 1` literal to be replaced in the factory.
- ADR-005 — hook semantics that apply uniformly to all post types.
- ADR-007 — slug auto-suffix applies to pages unchanged.
- ADR-009 — `context=view|edit` branching reused by the factory.
- ADR-017 — Tier 2 bridge applies to `the_content` regardless of post type.
- Mini-sprint scope: `.claude/memory/agents/tech-lead-roman/mini-sprint-scope.md`.
