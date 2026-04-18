# ADR-022: WordPress Import Strategy — WXR via SAX Streaming

- **Status:** Proposed
- **Date:** 2026-04-18
- **Author:** Román (Tech Lead)
- **Related:** ADR-002 (Folder Structure — monorepo lanes), ADR-010 (CLI Architecture), ADR-014 (Developer Quickstart Invariant), ADR-015 (Tooling Runtime Boundary), D-006 (Core no importa de DB)

## Context

Sprint 4 shipped `nodepress import-wp <source>` as a stub command (ticket #63) so the CLI surface could freeze without committing to an implementation. Sprint 5 turns that stub into real behaviour: a site owner migrating from WordPress runs `nodepress import-wp path/to/export.xml` and gets posts, taxonomies, users and comments into NodePress with a single command.

Two input formats are plausible:

- **WXR** (WordPress eXtended RSS) — the XML dump produced by WP's built-in `Tools → Export` screen. Self-contained, stable for over a decade, the lingua franca of WP migrations. Every hosted WP site can produce it in one click.
- **MySQL dump** — the raw DB. Strictly more information (plugin tables, user meta, everything), but requires the importer to understand the entire WP schema plus whatever plugin schemas happen to be present. The parser becomes a compatibility project on its own.

Three constraints shape the decision:

- **Dumps are large.** Real-world WXR files range from a few MB (small blogs) to 500MB+ (content-heavy sites with thousands of posts and tens of thousands of comments). DOM parsing a 300MB XML buffer will exhaust Node's heap and crash the CLI with a cryptic allocation error. The importer must stream.
- **The 80/20 rule applies hard.** Of the dozens of element types WXR can contain, the four that define "this is a WordPress site's content" are posts, terms (categories + tags), users and comments. Everything else — media, custom post types, plugin meta (ACF, Yoast, WooCommerce), serialised PHP option blobs, theme settings — is either a separate migration problem or a compatibility rabbit hole.
- **D-006 is intact.** Core does not import from the database layer. The CLI is allowed to talk to `@nodepress/db` directly because it is not a runtime concern — it is an operator tool. Keeping that invariant means the importer lives in `packages/cli`, not `packages/core`.

Without a written decision here, Sprint 5 day 1 dissolves into "should we also do media?", "do we need to parse ACF?", "what about custom post types?". Carmen cannot start with confidence; each ambiguity becomes a mid-sprint meeting.

## Decision

**The Sprint 5 importer parses WXR with a streaming SAX parser, imports posts + terms + users + comments, and logs warnings for everything else.** Media and MySQL dumps are explicit non-goals for this sprint.

### 1. Parser: SAX streaming, not DOM

We use a SAX (Simple API for XML) streaming parser. The parser emits events (`startElement`, `text`, `endElement`) as bytes arrive; the importer keeps a small stack of "currently inside" elements and emits a fully-formed record only when a `</item>` closes. Memory stays bounded regardless of input size.

Two candidate packages:

- **`sax`** — the de facto SAX parser for Node. Zero dependencies, mature (>12 years), used by npm itself. JavaScript-first; typings via `@types/sax`.
- **`saxes`** — TypeScript-native fork of sax. First-class types, slightly stricter XML compliance, maintained. Zero runtime dependencies.

Carmen runs a 0.5-day spike before writing importer code: parse a 100MB real WXR, measure peak RSS and wall-clock, confirm the event API gives us what we need. Output: either a PR switching the dependency or a short note in this ADR moving to `Accepted` with the chosen package named.

**Rejected: DOM parsers** (`xml2js`, `fast-xml-parser`'s default mode). Both are excellent for small known-bounded documents; both explode on 100MB+ inputs. This is not a theoretical concern — it is the exact failure mode a real migration hits on the first try.

### 2. Format supported in Sprint 5: WXR only

MySQL dump import is out of scope for Sprint 5. It gets its own ADR (ADR-023+) when a piloto actually asks for it. The reasons:

- The WXR-only path covers the migration story for every WP site that can reach `Tools → Export`, which is every self-hosted WP install and most managed hosts.
- The MySQL path drags in schema-version detection, plugin table handling, and a much larger test surface. It is a sprint on its own.
- A clean WXR path is the baseline a future MySQL path will compose with — not throwaway work.

### 3. Scope of what gets imported (Sprint 5)

| Entity                                                    | Sprint 5          | Rationale                                                                                                                                                                                                                                                                                                                              |
| --------------------------------------------------------- | ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Posts (`post`, `page` types, all statuses)                | IMPORT            | The product. Without posts the importer is pointless. All publish/draft/private/trash statuses preserved so editors keep their in-flight work.                                                                                                                                                                                         |
| Terms (categories + tags)                                 | IMPORT            | Content without taxonomies is navigation-less. Natural pair with posts.                                                                                                                                                                                                                                                                |
| Users                                                     | IMPORT (readonly) | Post authorship needs a user ID to be meaningful. We import user records (username, email, display name, registration date) but **never** passwords — WP hashes are phpass, incompatible with our auth, and migrating them would imply copying a weak hash into our DB. Imported users are created in a password-reset-required state. |
| Comments                                                  | IMPORT            | Core content. Preserves parent/child threading.                                                                                                                                                                                                                                                                                        |
| Media / attachments                                       | SKIP + WARN       | Binary fetch, storage backend, URL rewriting — a whole subsystem. Sprint 6+, separate ADR. Importer logs one warning per media item with the original URL so operators know what to re-attach.                                                                                                                                         |
| Custom post types                                         | SKIP + WARN       | Schema-for-schema mapping, plugin-specific. No generic answer. Future work.                                                                                                                                                                                                                                                            |
| Plugin-specific post meta (ACF, Yoast, WooCommerce, etc.) | SKIP + WARN       | Each plugin is its own compatibility project. We log which plugin meta keys were seen so a future pass can prioritise.                                                                                                                                                                                                                 |
| Serialised PHP meta (`a:3:{s:5:"title"...}`)              | SKIP + WARN       | Deserialising PHP serialisation in Node is a known footgun; even if decoded, the target shape depends on the plugin that wrote it. Not worth it for Sprint 5.                                                                                                                                                                          |
| Theme settings / customiser                               | SKIP + WARN       | Theme-specific; no destination in our theme engine v1.                                                                                                                                                                                                                                                                                 |

**Core principle: a skipped item is a warning, never an error.** Edge cases must not abort the import. A WXR with a dozen ACF fields should import the posts cleanly and log a summary of the meta keys it ignored. The operator can then triage.

### 4. Idempotency

Natural key for deduplication: `wp:post_id` (the numeric ID inside WXR). Stored on the NodePress post row (column `wp_post_id INT UNIQUE NULL` — Ingrid owns the migration). Re-importing the same WXR must not produce duplicates.

Two modes, exposed as a flag:

- **`--mode=upsert`** (default) — `INSERT ... ON CONFLICT (wp_post_id) DO UPDATE`. Safe to re-run. Preserves NodePress-native rows that have no `wp_post_id` (nothing to conflict against). This is the right default: the common path is "I ran the import, noticed something, ran it again".
- **`--mode=reset`** — truncate the target tables (posts, terms, comments, wp-imported users) before importing. Confirms interactively unless `--yes` is also passed. Used for clean-slate migrations and test environments. Never truncates rows without `wp_post_id` (NodePress-native content is preserved).

The same `wp_post_id` strategy applies to terms (`wp_term_id`), users (`wp_user_id`) and comments (`wp_comment_id`). Each gets its own nullable-unique column on the respective NodePress table.

### 5. Dry-run

`--dry-run` parses the WXR fully, runs normalisation, but **never writes to the database**. Output is a table of counts and a warning block:

```
WXR Import Dry-Run — export.xml (214 MB)
────────────────────────────────────────
Posts      : 1,842  (1,621 publish, 184 draft, 37 trash)
Pages      :    12
Terms      :    94  (71 categories, 23 tags)
Users      :    18
Comments   : 6,721
────────────────────────────────────────
Skipped    :
  - Media attachments          :   512  (see --verbose for URLs)
  - Custom post types (`book`) :    43
  - ACF meta keys              :   147 unique keys across 1,621 posts
  - Serialised PHP meta        :    89 occurrences
  - Theme settings             :     1 block
```

Dry-run is the mandatory first step before a real import. The CLI's help text and docs say so.

### 6. Module architecture

The importer lives in `packages/cli/src/commands/import-wp/`. Explicitly **not** in `packages/cli/src/index.ts` (the CLI entry dispatch is already a pattern per ADR-010 § Addendum — each subcommand a directory). Proposed shape:

```
packages/cli/src/commands/import-wp/
├── index.ts              # CLI command registration + flag parsing
├── pipeline.ts           # orchestrates parse → normalize → write
├── parser/
│   ├── sax-stream.ts     # thin wrapper over sax/saxes emitting typed WXR records
│   └── wxr-types.ts      # typed shapes for <item>, <wp:tag>, <wp:category>, etc.
├── normalize/
│   ├── post.ts           # WXR item → NodePress post row
│   ├── term.ts
│   ├── user.ts
│   └── comment.ts
├── writer/
│   ├── batch.ts          # buffered batch insert via @nodepress/db
│   └── modes.ts          # upsert vs reset
└── __tests__/            # vitest — fixtures in __fixtures__/
```

Pipeline (pseudo):

```
WXR XML bytes
  → SAX stream (parser/sax-stream.ts)
  → typed WXR records (one event per </item>)
  → normalizer (normalize/*)
  → batch buffer (writer/batch.ts, flush every N=500 rows)
  → @nodepress/db INSERT ... ON CONFLICT
  → progress event (stderr) + final summary (stdout)
```

Dependency direction: `@nodepress/cli` → `@nodepress/db`. No import of `@nodepress/core`, no import of `@nodepress/server`. The CLI talks to DB directly — D-006 respected on the opposite bound (core does not import from DB; here CLI does, which is the allowed direction).

## Consequences

**Ganamos:**

- Carmen can start Sprint 5 day 1 with an unambiguous scope: four entity types, SAX streaming, two modes, dry-run mandatory.
- 70% of standard WP blogs (content + taxonomies + authors) import cleanly with the Sprint 5 command. The long tail (media, plugin meta, custom post types) is logged, visible, and prioritisable.
- Idempotency is a first-class property. Operators can re-run without fear.
- The module layout mirrors the established CLI pattern (`commands/<name>/`), so reviewers navigate it without a map.
- D-006 stays intact. The importer is a CLI-to-DB concern, never leaks into core.

**Perdemos:**

- No media import in Sprint 5. For sites that live-and-die by their image library, Sprint 5 delivers a posts-only migration. Product (Martín) accepts this trade and will signal pilots accordingly.
- No MySQL dump path. An operator with a `.sql` file and no WP access to produce WXR is not served by Sprint 5. This is a known gap; Sprint 6+ with concrete pilot demand.
- Readonly users means every imported account requires a password reset on first login. A user-facing friction point. Mitigation: the CLI emits a one-line instruction at the end of a successful import explaining this, and the admin panel (Sprint 5) gets a "send password reset email to imported users" bulk action.
- Serialised PHP meta blobs are dropped, not translated. For a site leaning heavily on ACF, Sprint 5's import is a starting point, not a destination. Warning output makes the gap visible.

**Riesgos:**

- A malformed WXR (truncated export, illegal XML) could crash the SAX parser mid-stream. Mitigation: wrap the pipeline in an error boundary that prints line + column + last-seen element and exits non-zero. Write a fixture for each failure mode in `__tests__/__fixtures__/malformed/`.
- A 1GB+ WXR file exists in the wild (large enterprise blogs). Streaming keeps memory bounded, but the wall-clock is minutes. The CLI must print progress to stderr (`[====>      ] 4,217 / 12,000 posts processed`) or operators will think it hung and kill it.
- Batch inserts at N=500 rows balance throughput vs transaction size. If Postgres rejects a batch due to a single bad row, we lose 499 good rows unless we fall back to per-row insert on conflict. Sprint 5 implements the fallback explicitly; the spike should confirm the right batch size.
- `--mode=reset` is destructive. The CLI prompts interactively unless `--yes`. CI usage with `--yes` is documented as "only against a disposable DB".

## Open Questions

- **Which SAX package — `sax` or `saxes`?** Decided by Carmen's 0.5-day spike. Preference leans `saxes` (TS-native typings align with project standards), but `sax` wins if the spike shows measurable perf delta on a 300MB input.
- **Attachment warning verbosity.** Default is a single summary line per type; `--verbose` lists every skipped URL. Confirm the summary is enough during Carmen's first real import against a reference dump.
- **Progress UI.** A spinner (`ora`) vs a plain counter line. Preference: plain counter to stderr. Tooling constraint (ADR-015 Lane A); spinners break CI log capture.
- **Post→user linkage when a post references an author that is not in the `<wp:author>` list.** Observed in WXRs where the user was deleted but authored content remained. Default: create a ghost user `wp-imported-author-<N>` and log a warning. Confirm this matches WP's own behaviour on re-import.
- **Term hierarchy.** WP categories can be nested. Sprint 5 imports the flat list; parent relations are captured in the WXR (`<wp:category_parent>`) and stored on the NodePress term row, but the admin UI for hierarchical browsing is Sprint 6+. Surfaced explicitly so the demo does not claim feature parity it does not have.

## References

- `packages/cli/src/commands/import-wp/` — implementation (Sprint 5)
- ADR-010 § CLI Architecture — subcommand-as-directory pattern
- ADR-014 § Developer Quickstart Invariant — the importer is a CLI tool; Quickstart must not depend on running it
- ADR-015 § Tooling Runtime Boundary — CLI runs in Lane A (NodeNext ESM)
- WordPress Codex, WXR format: <https://codex.wordpress.org/Tools_Export_Screen>
- `sax` package: <https://www.npmjs.com/package/sax>
- `saxes` package: <https://www.npmjs.com/package/saxes>
