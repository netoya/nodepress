# ADR-023: Plugin Registry Architecture — DB-backed Registry + npm-compatible Package Format

- **Status:** Proposed
- **Date:** 2026-04-18
- **Author:** Román (Tech Lead)
- **Sprint:** 6 (pre-work during Sprint 5 buffer, ticket #77)
- **Related:** ADR-010 (CLI Architecture), ADR-012 (Plugin API type surface), ADR-014 (Developer Quickstart Invariant), ADR-015 (Tooling Runtime Boundary), ADR-020 (Plugin Loader Runtime)

## Context

ICP-1 outreach (2026-04-24 → 2026-05-02, 5 calls) produced one non-negotiable finding: **5/5 discovery calls blocked adoption on "cannot install third-party plugins from a registry"** (backlog-sprint6-draft.md § H-1). The threshold described by the interviewed CTOs is minimal: (a) a registry where a plugin is registered with metadata, (b) `nodepress plugin install <name>`, (c) documentation explaining how a plugin author publishes. A visual marketplace is Sprint 7+ — nobody asked for it in Sprint 6.

Today NodePress has two halves of the picture and a gap in the middle:

- **Runtime side (shipped).** ADR-020 formalises how plugins on disk get loaded. `NODEPRESS_PLUGINS_DIR` is scanned at boot, each subdirectory is a plugin, the default export is invoked against the `HookRegistry`. Discovery and activation are solved — **for plugins that are already on the filesystem**.
- **Type surface (shipped).** ADR-012 froze `PluginManifest`, `Plugin`, `PluginStatus`. The shapes exist; the mechanism to _bring a plugin onto the filesystem from a remote source_ does not.
- **Schema side (shipped, half-empty).** `packages/db/src/schema/plugin-registry.ts` already declares a `plugin_registry` table with `slug`, `name`, `version`, `status`, `activated_at`, `error_log`, `meta`. The table was created in Sprint 0 #21 as part of the activation tracking model (admin panel reads it to show "which plugins are active"). It was never wired to an install flow because there was nothing to install from.

Sprint 6 closes the gap. Four P0 tickets (#74 schema + API, #75 CLI install command, #76 REST endpoints, #77 this ADR) land the registry end to end: an operator types `nodepress plugin install seo-basic`, the CLI hits the registry, downloads the package, extracts it to `NODEPRESS_PLUGINS_DIR`, and the next boot loads it via the ADR-020 loader. Nothing else changes in how plugins _run_ — the registry is a distribution mechanism, not a new runtime.

Constraints that shape the decision:

- **ADR-014 (Quickstart Invariant) must hold.** A clean clone with no plugins still boots in under 5 minutes. The registry cannot add mandatory network calls to the boot path.
- **ADR-020 (Loader Runtime) is the only execution mechanism.** The registry manages metadata and distribution; it does not invoke plugin code, does not sandbox it, does not validate its behaviour. Installation ends when the tarball is extracted on disk — from there, the existing loader takes over on next boot.
- **ADR-015 (Tooling Runtime Boundary) applies.** The registry API is Lane A (NodeNext ESM app). The CLI install command is Lane A. No bespoke transpiler, no runtime build step during install — the package on disk must be ready to `import()` as-is.
- **ADR-018 (Bridge Security Boundary) sets the precedent.** Any code that flows from an external source into the NodePress process is a security-reviewable surface. The registry increases the blast radius of ADR-020 ("buggy plugin crashes host") from "plugin the operator wrote" to "plugin someone published". That shift is recognised here; the hardening of vm.Context (Sprint 6 ticket #78) is the companion work that closes the loop.

Without this ADR written before Sprint 6 day 1, ticket #74 (Ingrid) and #75 (Raúl) race each other on schema extension + CLI fetch protocol, and ticket #76 (Carmen) has no REST contract to implement against. Writing it in the Sprint 5 buffer window lets the team arrive on day 1 with an unambiguous target.

## Decision

**The registry is a database-backed metadata store exposed over REST and consumed by a CLI install command that downloads npm-compatible tarballs into `NODEPRESS_PLUGINS_DIR`.** No separate infrastructure service, no external dependency, no plugin execution inside the registry itself.

### 1. Registry storage: `plugin_registry` table (extended)

The existing `plugin_registry` schema stays — it was designed for activation tracking and that role is preserved. Sprint 6 extends it with four columns that describe "where did this plugin come from":

| Column         | Type        | Purpose                                                                                                                            |
| -------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `registry_url` | `text`      | Source registry URL (self-hosted registry base, e.g. `https://registry.nodepress.dev`). Nullable for locally-side-loaded plugins.  |
| `tarball_url`  | `text`      | Fully-qualified URL of the `.tgz` (npm-compatible). Fetched by `nodepress plugin install`.                                         |
| `published_at` | `timestamp` | When the package was published to the registry. Surfaces "new vs stale" in future admin UI.                                        |
| `author`       | `text`      | Free-text author identity from `package.json` (`author` field). Not a foreign key to `users` — publishers are not NodePress users. |

Ingrid owns the migration. The existing `meta JSONB` column absorbs anything not deserving a first-class column (keywords, repository URL, homepage) so we do not fragment the schema across every field npm ever added to `package.json`. A single row per `slug` — the same slug used by ADR-020 for filesystem identity and by ADR-012 as `PluginManifest.slug`.

**Invariant:** one `slug` = one installed version at a time. Sprint 6 does not support multi-version parallel installs (npm does, we do not yet — no piloto asked for it). Upgrading is "install a new version over the old one".

### 2. Package format: npm-compatible with `nodepress` manifest field

A published plugin is an npm-style tarball containing `package.json` + compiled JS/TS source. We reuse the npm format for three concrete reasons:

- **Zero new tooling for plugin authors.** `npm pack` produces a valid NodePress plugin tarball today. Authors already know how to `npm publish`; they can host on our registry, on npm itself, or on a private registry — the consumer only needs the tarball URL.
- **`.tgz` + checksum is a solved distribution problem.** npm, yarn, pnpm have been streaming gzipped tar over HTTPS for a decade. There is no reason to invent a new envelope.
- **The `package.json` already holds everything we need.** `name`, `version`, `author`, `description`, `keywords` map to our columns one-to-one. The NodePress-specific metadata (ADR-020 entry point, permissions, capabilities) lives inside a reserved `nodepress` key:

```json
{
  "name": "seo-basic",
  "version": "1.0.0",
  "author": "Jane Doe <jane@example.com>",
  "nodepress": {
    "manifestVersion": 1,
    "slug": "seo-basic",
    "main": "./dist/index.js",
    "hooks": ["the_content", "wp_head"],
    "capabilities": ["filter_registration"]
  }
}
```

The `nodepress` key is the `PluginManifest` from ADR-012 carried inside `package.json`. Installing the tarball and extracting it to `NODEPRESS_PLUGINS_DIR/seo-basic/` produces a directory the ADR-020 loader already knows how to consume — no bridge code, no manifest translation layer.

**Rejected: custom envelope format** (`.nodepress-plugin` with proprietary structure). Every custom envelope is also a tooling surface we have to build and document. The npm format is the tax we do not pay.

### 3. REST API: `/wp/v2/plugins` (WP-compatible surface)

Three endpoints, Carmen implements against Ingrid's registry service:

- **`GET /wp/v2/plugins`** — list registered plugins. Pagination via `page` + `per_page` (WP convention). Query filter `?status=active|inactive|error`. Returns `PluginRegistry` rows with installation metadata. Public read (no auth).
- **`GET /wp/v2/plugins/:slug`** — single plugin detail. Public read.
- **`POST /wp/v2/plugins`** — register or publish a plugin. **Bearer token admin auth required** (same pattern as every other mutating endpoint in the codebase, ADR-001 § Auth). Body is a multipart upload: `package.json` + `tarball`. The server stores the tarball under a configurable storage backend (local filesystem for Sprint 6, S3/MinIO candidate for Sprint 7+) and writes the `plugin_registry` row.

The path `/wp/v2/plugins` matches WP's own plugin REST surface. A plugin management tool written against WP will talk to NodePress without modification for read operations. This is the same principle that drove the rest of our REST surface (ADR-001 § REST API).

**Rejected: a `/registry/*` namespace disjoint from `/wp/v2`.** Splitting the surface forces plugin authors to learn two URL conventions. Our distribution is small enough to pick "WP-compatible" and live with it.

### 4. CLI command: `nodepress plugin install <name>[@version]`

Raúl (ticket #75) implements the install command under `packages/cli/src/commands/plugin/install.ts`, next to the existing `list.ts` (the `plugin/index.ts` dispatcher already registers subcommands per ADR-010 § Addendum).

Install flow — no state machine, straight-line:

1. Resolve registry base URL from `NODEPRESS_REGISTRY_URL` env var (default `https://registry.nodepress.dev`, operators override for self-hosted). Absence of the env var and absence of a default network path does **not** break the Quickstart Invariant — `plugin install` is an operator action, not a boot step.
2. `GET {registry}/wp/v2/plugins/{name}` → receives `tarball_url` + `version`. If `@version` was specified, validate it matches the manifest; if not, use the latest published version.
3. Download the tarball, verify SHA-256 against the checksum in the registry response (npm already publishes shasums; we carry them in `meta.checksum`).
4. Extract the tarball to `NODEPRESS_PLUGINS_DIR/{slug}/`. Existing directory with same slug is overwritten (upgrade path) after a backup to `{slug}.previous/` that a future rollback command can restore.
5. Do **not** boot the plugin. The loader (ADR-020) picks it up on next server start. Install exits with a one-line instruction: `Plugin 'seo-basic' installed at plugins/seo-basic. Run 'nodepress serve' to activate.`

**The command does not invoke plugin code.** That guarantee is load-bearing: install runs as an operator, activation happens inside the server runtime where the loader and (Sprint 6+) vm.Context sandbox apply. Conflating install with activation would require the CLI to inherit every runtime constraint of the server — we are not paying that cost.

### 5. Authentication for publish: Bearer token admin

`POST /wp/v2/plugins` requires the same admin Bearer token that gates every other mutating endpoint (Sprint 1 auth model; roles/capabilities for finer-grained authorization land in Sprint 3+ and this endpoint will inherit them automatically). No plugin-specific auth system. No per-publisher API keys in Sprint 6.

Rationale: until we have more than one publisher identity, inventing publisher tokens is premature. The same admin who runs the registry is the admin who publishes. When Sprint 7+ opens publication to the community, a publisher-scoped token type is a small additive change — the endpoint contract does not move.

### 6. Scope — what is NOT in Sprint 6

This list is as load-bearing as the positive decisions. Each entry is a request the team could be talked into mid-sprint if the boundary is not written down:

- **No marketplace UI.** ICP-1 explicitly said CLI-first (H-3, H-4). Admin UI list already exists (reads `plugin_registry`); a "browse + install" UI is Sprint 7+.
- **No ratings, reviews, downloads counter.** Community signals — not on the critical path for the first 5 pilots.
- **No plugin sandboxing at the registry level.** Sandboxing is an ADR-020 runtime concern, hardened by ticket #78 (vm.Context memory limit) in parallel. The registry stores tarballs; it does not grade them.
- **No payment, no paid plugins, no license enforcement.** When a piloto pays for a plugin, that is a commerce problem layered on top of the distribution problem. Separate ADR, separate sprint.
- **No verified publishers / signing.** npm has been shipping unsigned packages for 15 years; we can live without package signatures for the first 5 pilots. When we add it (Sprint 8+), GPG-detached signatures alongside the tarball are the expected shape.
- **No dependency resolution between plugins.** `PluginManifest.dependencies[]` stays declarative (ADR-012 § Open Questions). A plugin that declares `dependencies: ["seo-basic"]` does not cause `seo-basic` to be installed automatically in Sprint 6.
- **No automatic upgrade path.** `plugin install <name>@{newer}` upgrades on demand; there is no `plugin upgrade --all` in Sprint 6. Trivial to add once the base flow works.
- **No offline / air-gapped install.** Every install in Sprint 6 talks to a registry URL. Side-loading a tarball from disk is possible (the loader does not care how the directory got there), but there is no `nodepress plugin install ./local.tgz` flag yet.

## Alternatives Considered

### A. External registry (use npm itself as the registry)

**Shape:** publish plugins to npmjs.com under an `@nodepress/` scope; `plugin install` is a thin wrapper over `npm install` into `NODEPRESS_PLUGINS_DIR`.

**Rejected because:**

- Npm is an external dependency with its own availability, rate limits, and policy. A NodePress install flow that fails because npmjs.com is in an incident is a support burden we do not need in the first 5 pilots.
- Plugins cannot be listed, filtered or searched by NodePress-specific metadata (hooks, capabilities) without crawling npm — we would be building a registry on top of a registry.
- Air-gapped and self-hosted deployments (several ICP-1 interviewees explicitly run on private infra) cannot reach npm. A self-hosted registry mirror is straightforward to stand up; replicating npm's auth + quota model is not.
- The ICP is migrating _from_ WordPress. WordPress has a first-party plugin directory, not a generic package manager. The expectation is "our CMS, our registry, our publish flow". Delegating to npm signals we are still an early-stage tool; running our own signals we take the ecosystem seriously.

The npm _format_ is still what we adopt (§ 2). The npm _registry_ is not.

### B. Filesystem-only, no registry

**Shape:** keep ADR-020 as the whole story. Operators drop plugins into `NODEPRESS_PLUGINS_DIR` manually; no API, no install command, no metadata service.

**Rejected because:** this is the status quo and ICP-1 blocked on it unanimously. The filesystem loader is necessary but not sufficient — without discovery and install, plugin distribution depends on "someone emails you a zip", which no CTO in the 5 calls was willing to sign off on.

### C. WordPress.org plugin directory proxy

**Shape:** `nodepress plugin install` queries wordpress.org's plugin API, downloads the WP plugin, somehow runs it.

**Rejected because:** WordPress plugins are PHP. NodePress plugins are JS/TS (ADR-012). A proxy that downloads a PHP plugin and tries to run it in NodePress would be a re-implementation of the WP runtime, which is exactly the trap D-008 forbids. This is not distribution architecture; it is a completely different compatibility story (ADR-003 Tier 2 / Tier 3), and it is explicitly closed (memory 2026-04-18 post-mortem: "Tier 3 full orquestador WP: RECHAZADO PERMANENTEMENTE").

### D. Git-based registry (install from `git clone URL`)

**Shape:** `nodepress plugin install <git-url>` clones a repo into the plugins directory.

**Rejected because:** git clone pulls entire history, respects no versioning semantics without tag conventions, cannot be checksummed trivially, and requires a git binary on the install target. A tarball over HTTPS is simpler and has stronger integrity guarantees (SHA-256 checksum in registry response). Git-based install can be added later as an install _source_ without changing the registry contract — the registry stores `tarball_url`, a future version can also store `git_url` with a companion `git_ref`.

## Consequences

**Ganamos:**

- The 5/5 blocker from ICP-1 is unblocked in Sprint 6 with four tickets that compose end to end. No piloto needs to wait for Sprint 7+ to evaluate NodePress on their real workflow.
- Plugin authors use the npm tooling they already know. `npm pack` + `curl -X POST /wp/v2/plugins` is the publish flow — three minutes from "I have a plugin" to "it is installable".
- The runtime stays untouched. ADR-020 loader keeps its contract; vm.Context hardening (ticket #78) proceeds in parallel because the registry does not touch execution.
- The REST surface reuses the existing auth model. No new token type, no new middleware, no new security boundary to audit — except the publish endpoint, which inherits `requireAdmin` and is the same shape Carmen has implemented a dozen times.
- The schema extension is additive (four nullable columns). No data migration risk; the existing `plugin_registry` rows continue to work with `registry_url = NULL`.
- Self-hosting the registry is trivial: point `NODEPRESS_REGISTRY_URL` at your own installation. A piloto with a private plugin ecosystem gets air-gapped distribution without us building a separate "enterprise registry" product.

**Perdemos:**

- **No signing in v1.** A compromised registry could serve malicious tarballs to every installation. Mitigation: the checksum in the registry response is computed by the registry itself — trust is anchored at the registry, not at a per-package level. An operator who does not trust the registry host does not use it. Package signing is Sprint 8+ when verified publishers exist.
- **No dependency graph.** A plugin that expects `seo-basic` to be present will fail at load time when it is not. The ADR-020 loader's "failed plugins do not halt startup" contract softens the blow, but the experience is not great. Sprint 7+ companion ticket: topological activation + auto-install of declared dependencies.
- **Admin-only publish means no community contributions in Sprint 6.** An open-source contributor cannot push a plugin to the registry without the admin token. This is the right default for the first 5 pilots; community publish requires an identity system (Sprint 8+).
- **Registry availability is a new SPOF for plugin install** (not for plugin _runtime_ — plugins run from disk). When the registry is down, `plugin install` fails; already-installed plugins keep working. Ops burden: the registry service becomes something we monitor. Mitigation: it is a thin REST layer over Postgres — the same Postgres every NodePress instance already has — so colocating the registry with the database simplifies availability to "keep the DB up".
- **Upgrade path overwrites the old version.** A bad upgrade has a `.previous/` backup directory to restore from, but there is no `plugin rollback` command yet. Operators who test before upgrading in production are unaffected; operators who do not will feel it once.

**Riesgos:**

- **Tarball size unbounded.** A 500MB tarball uploaded to the registry would consume disk, bandwidth, and client memory during extraction. Mitigation: enforce a 10MB limit at the POST endpoint (Carmen's ticket #76), reject larger uploads with a structured error. 10MB is double the largest piloto plugin surveyed in ICP-1; if a piloto hits it, ADR amendment (not silent growth).
- **Malicious tarball contents.** A plugin tarball could contain path traversal entries (`../../etc/passwd`) or symlinks pointing outside the extraction root. Mitigation: use a tar extractor that refuses absolute paths and `..` segments (the `tar` package in Node already does this by default with `strict: true`). Helena reviews the extraction code before merge; this is the same class of concern as ADR-018 § Attack Surface.
- **Race between install and boot.** An operator runs `plugin install` while `nodepress serve` is already running. The loader loads what was on disk at boot; the newly-installed plugin activates on next restart. This is documented behaviour (CLI prints "Run 'nodepress serve' to activate"); hot install is Sprint 7+ with the watch-mode loader already listed as a Sprint 4 open question in ADR-020.
- **Registry as attack vector.** Because `POST /wp/v2/plugins` writes to disk (tarball storage), a stolen admin token lets an attacker publish a malicious plugin. Mitigation: the same admin token already has full CRUD on posts, users, options — the threat model does not change with this endpoint. What does change is the blast radius (a malicious plugin can execute arbitrary JS on next boot), which is why ticket #78 (vm.Context hardening) ships in the same sprint. Both tickets are P0.

## Open Questions

- **Storage backend for tarballs in production.** Sprint 6 uses local filesystem (`./plugin-tarballs/` relative to server cwd). S3/MinIO is the natural Sprint 7+ candidate when a piloto needs multi-node registry availability. The storage abstraction is a single interface (`TarballStore.put/get/checksum`) — local vs remote is a swap, not a rewrite.
- **Checksum storage location.** `meta.checksum` (JSONB) vs a dedicated `sha256 TEXT` column. Leaning JSONB because the column list is already five columns wider than origin; if checksums become query-frequent (e.g., an integrity check job), promote to a column. Ingrid's call during ticket #74.
- **Tarball retention on upgrade.** The `.previous/` backup is one level deep. N=1 rollback. Multi-version retention (keep the last 3 tarballs per slug) is a disk-space decision; default stays N=1 until an operator asks for more.
- **`nodepress plugin uninstall <slug>`.** Symmetric to install. Removes the directory, clears the `plugin_registry` row. Scope-creep-safe because it is zero-ambiguity; Raúl can fold it into #75 if time permits, otherwise ticket #75b in the same sprint.
- **Plugin metadata search.** `GET /wp/v2/plugins?q=seo` full-text over name + description + keywords. Sprint 6 ships exact-slug lookup; fuzzy search is Sprint 7+ with the admin UI. Until then, browsing the full list client-side is acceptable (we are in the low hundreds of plugins for a long time).

## References

- `packages/db/src/schema/plugin-registry.ts` — existing schema (Sprint 0)
- `packages/cli/src/commands/plugin/index.ts` — existing `plugin list`, install command lands next to it
- `docs/process/backlog-sprint6-draft.md` — ICP-1 findings + Sprint 6 backlog
- ADR-010 § CLI Architecture — subcommand-as-directory pattern
- ADR-012 § Plugin API — `PluginManifest` type carried inside `package.json` → `nodepress` key
- ADR-014 § Developer Quickstart Invariant — install is operator action, not boot step
- ADR-015 § Tooling Runtime Boundary — registry API + CLI install run in Lane A
- ADR-020 § Plugin Loader Runtime — the loader consumes what install extracts; no bridge code between them
- ADR-018 § Bridge Security Boundary — tar extraction hardening follows the same threat-modelling pattern
- npm package specification: <https://docs.npmjs.com/cli/v10/configuring-npm/package-json>
- WordPress REST API plugins endpoint reference: <https://developer.wordpress.org/rest-api/reference/plugins/>
