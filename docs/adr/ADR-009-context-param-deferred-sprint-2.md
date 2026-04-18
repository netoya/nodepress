# ADR-009: Context Parameter Support Deferred to Sprint 2

- **Status:** Accepted
- **Date:** 2026-04-18
- **Author:** Carmen (Dev Backend)

## Context

The WordPress REST API v2 POST object supports a `context` query parameter that controls serialization scope:

| Context | Audience     | Visible Fields               |
| ------- | ------------ | ---------------------------- |
| `view`  | Public       | `{rendered, protected}`      |
| `edit`  | Admin (auth) | `{rendered, raw, protected}` |

The `raw` field exposes the unrendered source content (e.g., shortcodes, raw HTML) and is intentionally gated to `?context=edit` to avoid leaking rendering hints to public consumers.

NodePress Sprint 1 implementation (`toWpPost()` in `packages/server/src/routes/posts/serialize.ts`) initially included `raw` in all responses (DIV-002 in OpenAPI spec), deviating from WP compat by exposing unrendered content to unauthenticated clients.

Ingrid's conformance harness (#17) validated against OpenAPI fixtures that correctly omit `raw`. This exposed the mismatch.

## Decision

**Immediate (Sprint 1):** Remove `raw` field from all serialized post responses. NodePress v1 operates in `context=view` mode exclusively.

**Deferred (Sprint 2):** Implement full context param support:

- Handlers accept `?context=view|edit` query parameter
- `?context=edit` routes through `requireAdmin` or equivalent role guard
- Serializer branches on context: returns `raw` only for `context=edit`
- OpenAPI spec updated to document the param and conditional schema

## Rationale

1. **Security-first approach:** Sprint 1 must not leak unrendered content by default. Removing `raw` is a zero-risk, one-line fix.

2. **Simplicity for Sprint 1:** Full context support requires routing layer changes (reading query params, passing context to serializer, role-based branching) — deferred burden for minimal v1 benefit since no edit-context consumer exists yet.

3. **Alignment with roles roadmap:** Sprint 2 introduces proper admin roles and ACLs (per project board). Context branching naturally integrates with role enforcement at that time.

## Alternatives Considered

### A. Keep `raw` and restrict via middleware

Gate `?context=view` explicitly and reject `context=edit` with 403.

**Discarded:** Still leaks `raw` by default; doesn't match WP semantics (WP returns `raw` in `edit` context, not blocked).

### B. Implement full context support now

Add query param reading, role-based branching in Sprint 1.

**Discarded:** Adds ~50 lines; role system not ready; no consumer demand yet. Deferral risk is low (reversible one-line deletion is already in place).

## Consequences

### Positive

- POST responses now match OpenAPI spec exactly.
- Conformance harness (#17) tests pass cleanly: 26/26 green.
- No content leakage to public clients.
- Sprint 2 context param is a straightforward feature, not a bug fix.

### Negative

- Admin users cannot query `?context=edit` until Sprint 2. Breakage risk: low (no admin panel consuming NodePress REST API yet).
- If edit-context consumer emerges during Sprint 1, must route around this limitation (e.g., comment about it in tech memory).

### Rollback

If business priority demands `?context=edit` in Sprint 1:

1. Revert serialize.ts to include `raw` field.
2. Implement context param branching (adds ~30 lines).
3. Update OpenAPI spec.

Effort: ~2 hours; not critical for v1 launch.

## Implementation (Sprint 2 — 2026-04-18)

**Status: Implemented.** Delivered in commit `942dc8e`.

- `SerializeContext = "view" | "edit"` type exported from `serialize.ts`
- `toWpPost(dbRow, hooks, context)` and `toWpPostAsync(dbRow, hooks, bridge, context)` accept context param
- `context=edit` spreads `raw` into title/content/excerpt (unrendered DB source, not filter output)
- `GET /wp/v2/posts?context=edit` and `GET /wp/v2/posts/:id?context=edit` call `requireAdmin` before serializing
- OpenAPI spec updated: `?context` param, `RenderedFieldEdit` schema, `401` response declared
- WP conformance harness extended: 10 new tests (context=view raw absent + context=edit raw present + 401 gate)

## References

- [WordPress REST API — Post object — context parameter](https://developer.wordpress.org/rest-api/reference/posts/#context)
- `packages/server/src/routes/posts/serialize.ts` — `SerializeContext`, `toWpPost()`, `toWpPostAsync()`
- `packages/server/src/routes/posts/handlers.ts` — context param + `requireAdmin` gate
- `packages/server/src/__tests__/wp-conformance/post.contract.test.ts` — ADR-009 conformance section
- `docs/api/openapi.yaml` — `?context` param + `RenderedFieldEdit` schema
- ADR-006: Omission of `date_gmt` / `modified_gmt` (precedent for DIV-001)
- #17 WP Conformance Harness (triggered this review)
