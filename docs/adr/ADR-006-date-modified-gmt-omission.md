# ADR-006: Omission of `date_gmt` and `modified_gmt` Fields in v1 REST API

- **Status:** Proposed
- **Date:** 2026-04-17
- **Author:** Ingrid (Lead Backend)

## Context

The WordPress REST API v2 post object exposes four timestamp fields:

| WP field       | Semantics                                                    |
| -------------- | ------------------------------------------------------------ |
| `date`         | Post publication date in site timezone (ISO 8601)            |
| `date_gmt`     | Post publication date in UTC                                 |
| `modified`     | Last modification date in site timezone (ISO 8601)           |
| `modified_gmt` | Last modification date in UTC                                |

The NodePress Drizzle schema (`packages/db/src/schema/posts.ts`) stores two
timestamp columns:

```
createdAt  TIMESTAMP WITH TIME ZONE  -- maps to WP `date`
updatedAt  TIMESTAMP WITH TIME ZONE  -- maps to WP `modified`
```

PostgreSQL's `TIMESTAMP WITH TIME ZONE` stores values in UTC internally and
returns them with full timezone offset. Any consumer that needs the value in
UTC can parse the ISO 8601 string directly — no separate `_gmt` column is
required.

The NodePress v1 REST serializer (tracked in OpenAPI spec as DIV-001) returns
`date` and `modified` from `createdAt`/`updatedAt` respectively, and omits
`date_gmt` and `modified_gmt` entirely.

Alejandro's Sprint 1 rule: **any WP semantics deviation requires an ADR before
merge.**

## Decision

Omit `date_gmt` and `modified_gmt` from the v1 Post REST response.

The two PostgreSQL `TIMESTAMPTZ` columns already encode timezone information;
`_gmt` variants would be byte-for-byte duplicates for any consumer that reads
ISO 8601 correctly. Adding them as columns introduces double storage of the
same datum. Deriving them at serialization time (converting to UTC on the fly)
adds complexity to `serialize.ts` for zero information gain.

If consumer demand materialises — evidenced by a tracked issue or plugin
compatibility report — the fields can be derived at the serialization layer
without any schema migration, since the source data is already UTC-anchored.

## Alternatives Considered

### A. Add `*_gmt` columns to the schema

Store four separate TIMESTAMP columns: `created_at`, `created_at_gmt`,
`updated_at`, `updated_at_gmt`.

**Discarded:** doubles timestamp storage with no new information. The WP
precedent exists because MySQL DATETIME has no timezone awareness; PostgreSQL
TIMESTAMPTZ does. The reason for WP's `_gmt` fields does not apply here.

### B. Derive `_gmt` values at serialization time

Compute `date_gmt` by converting `createdAt` to UTC string in `serialize.ts`,
returning both `date` and `date_gmt` in the response.

**Discarded for v1:** adds a permanent API surface with ongoing maintenance
cost (field must be included in every schema change, tested, documented) for a
field that no current consumer has requested. The calculation itself is trivial
but the surface area is not.

## Consequences

### Positive

- Schema stays clean: single source of truth per timestamp.
- Serialization layer stays simple.
- No migration debt — if demand appears, derivation is a one-line addition in
  `serialize.ts`.

### Negative

- WP consumers that filter or sort by `date_gmt` / `modified_gmt` will receive
  `undefined` for those fields. Breakage risk is assessed as low — most WP
  REST clients use `date` for display and `modified` for cache invalidation.
- Strict WP REST API conformance tests will flag these fields as absent. The
  test harness (#17) must explicitly mark DIV-001 as an expected divergence.

### Rollback

If `_gmt` fields are later required:

1. No schema migration needed — derive from existing `TIMESTAMPTZ` columns.
2. Add derivation to `serialize.ts`: `date_gmt = createdAt.toISOString()`.
3. Update OpenAPI spec and remove DIV-001 flag.

## References

- [WordPress REST API — Post object](https://developer.wordpress.org/rest-api/reference/posts/)
- `docs/api/openapi.yaml` — `x-nodepress-notes.wp-divergences[DIV-001]`
- `packages/db/src/schema/posts.ts` — Drizzle schema
- ADR-005: Hook System Semantics (format reference)
- Sprint 1 kickoff rule: deviations require ADR (meet-2026-04-17)
