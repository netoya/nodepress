# ADR-007: WP Standard Post Fields Omitted in v1

- **Status:** Proposed
- **Date:** 2026-04-17
- **Author:** Ingrid (Lead Backend)

## Context

The WordPress REST API v2 post object includes the following fields that have
no counterpart in the NodePress v1 schema or serializer:

| WP field         | WP semantics                                                          | Missing reason                                             |
| ---------------- | --------------------------------------------------------------------- | ---------------------------------------------------------- |
| `featured_media` | ID of the attached Media post (0 = none)                              | Requires a `media` table. Not yet designed.                |
| `comment_status` | `"open"` or `"closed"` — controls whether comments are accepted       | Requires an enum column on `posts`. No comment system yet. |
| `ping_status`    | `"open"` or `"closed"` — controls trackback/pingback acceptance       | Same as `comment_status`; low-value feature for NodePress. |
| `format`         | Post format: `standard`, `aside`, `chat`, `gallery`, …               | Niche feature; no demand signal. Omitted indefinitely.     |
| `sticky`         | Boolean — whether the post is pinned to the top of the index          | Requires boolean column + ordering logic in list queries.  |
| `template`       | Custom page template slug (theme-specific)                            | Requires mature theme engine. Not in scope v1.             |

These fields are documented as DIV-003 in `docs/api/openapi.yaml`. Alejandro's
Sprint 1 rule mandates an ADR before merge for any WP semantics deviation.

## Decision

All six fields are omitted from the v1 Post REST response. Consumers that
expect WP compat must treat them as absent (`undefined`). The fields are
candidates for re-evaluation at the Sprint 2 retrospective.

Planned re-introduction milestones:

| Field            | Target sprint | Blocking work                                |
| ---------------- | ------------- | -------------------------------------------- |
| `featured_media` | Sprint 3+     | Media upload system + `media` table          |
| `comment_status` | Sprint 2      | Comment system schema + enum column          |
| `ping_status`    | Sprint 2      | Same as `comment_status`                     |
| `sticky`         | Sprint 2+     | Boolean column + list query ordering         |
| `format`         | TBD           | No demand signal — re-evaluate in Sprint 2   |
| `template`       | TBD           | Requires theme engine (Sprint 3+ roadmap)    |

## Alternatives Considered

### A. Add columns as `NULL`-by-default and expose them immediately

Add nullable columns for each field to the schema and return them (as `null`
or with a default value) in the REST response.

**Discarded:** exposes permanent API surface for features with no backing
logic. A `comment_status: null` response does not satisfy WP semantics — it
creates an ambiguous half-contract. Consumers would need to distinguish between
"field not supported" and "field is legitimately null", which is harder than
simply not including the field. Deprecated fields cost more to remove later
than absent fields cost to add.

### B. Return hardcoded WP-compatible defaults

Return `featured_media: 0`, `comment_status: "open"`, `ping_status: "open"`,
`format: "standard"`, `sticky: false`, `template: ""` to achieve surface-level
WP conformance without backing columns.

**Discarded:** misleads consumers. A plugin that reads `comment_status: "open"`
and then tries to POST a comment will find no comment endpoint — the
inconsistency is worse than the absence. Lying about capability is a
maintenance debt.

## Consequences

### Positive

- Schema stays minimal for Sprint 1 scope.
- No migration technical debt from half-implemented features.
- Clear upgrade path: each field is individually addable as its backing system
  matures, without breaking the existing contract.

### Negative

- WP plugins that depend on any of these fields will receive `undefined`. The
  most common case is `featured_media` (many themes render hero images from
  it). Plugin authors must add a guard: `if (post.featured_media) { ... }`.
- WP REST API conformance test suite will flag these as missing fields. The
  NodePress test harness (#17) must mark DIV-003 as an expected divergence with
  a comment tying it to this ADR.

### Rollback

Not applicable — fields are absent, not wrongly present. Adding them in a
future sprint is additive and non-breaking for consumers that already guard
against `undefined`.

## References

- [WordPress REST API — Post object](https://developer.wordpress.org/rest-api/reference/posts/)
- `docs/api/openapi.yaml` — `x-nodepress-notes.wp-divergences[DIV-003]`
- ADR-006: date/modified_gmt omission (companion ADR for DIV-001)
- ADR-005: Hook System Semantics (format reference)
- Sprint 1 kickoff rule: deviations require ADR (meet-2026-04-17)
