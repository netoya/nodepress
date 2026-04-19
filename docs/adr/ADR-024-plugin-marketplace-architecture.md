# ADR-024: Plugin Marketplace Architecture — Visual Discovery + Full Lifecycle over ADR-023 Registry

- **Status:** Accepted
- **Date:** 2026-04-19
- **Accepted:** 2026-04-19
- **Author:** Román (Tech Lead)
- **Sprint:** 7 (pre-work during Sprint 6 closure, ticket #86)
- **Related:** ADR-010 (CLI Architecture), ADR-012 (Plugin API type surface), ADR-014 (Developer Quickstart Invariant), ADR-015 (Tooling Runtime Boundary), ADR-018 (Bridge Security Boundary — threat-modelling precedent), ADR-020 (Plugin Loader Runtime), ADR-023 (Plugin Registry Architecture)

## Context

ADR-023 shipped the registry backbone in Sprint 6: `plugin_registry` table extended with `registry_url/tarball_url/published_at/author`, REST surface `GET /wp/v2/plugins` + `GET /wp/v2/plugins/:slug` + `POST /wp/v2/plugins`, CLI `nodepress plugin install <name>[@version]`. End-to-end install flow is proven by the 10/10 Sprint 6 closure (tests green, tarball extraction hardened via `tar --strict`, ADR-018 co-sign on path-traversal mitigation).

The gap Sprint 7 closes is the other half of "third-party plugins work":

- **Discovery.** Sprint 6 ships only exact-slug lookup. ICP-1 H-1 said "plugins from a registry" — no CTO specified "I will curl JSON to find them". Without a visual index, the registry is adoptable only by engineers who already know what to install.
- **Lifecycle completeness.** Install exists; uninstall does not. An operator who wants to try a plugin and back out has to manually `rm -rf plugins/<slug>/` and surgically delete the DB row — a hostile UX that contradicts the "reversible operations" posture ADR-023 § Consequences committed to.
- **Search.** The list endpoint returns everything paginated by published date. A registry with 50 plugins is browseable; a registry with 500 plugins needs `?q=seo`. Sprint 7 ships the first capability; scale ships the second before the second one is a blocker.
- **Dependency resolution.** ADR-023 § Scope explicitly deferred this to Sprint 7+ ("A plugin that declares `dependencies: ["seo-basic"]` does not cause `seo-basic` to be installed automatically in Sprint 6"). Sprint 7 pays that debt because the marketplace UI ships plugins that realistically chain (SEO plugin depends on a meta plugin, display plugin depends on a shortcode plugin) and a silent "install failed at boot because dep missing" is the worst UX a first-time piloto will hit.

Sprint 7 lands four P0/P1 tickets that compose end to end over ADR-023:

- **#84** (Lucas + Nico) — marketplace UI in the admin panel: browse, search, install, uninstall, status badge.
- **#85** (Raúl + Ingrid) — dependency resolution inside the install flow: read `nodepress.dependencies[]`, resolve transitively with a depth cap.
- **#88** (Raúl) — `nodepress plugin uninstall <slug>` + `DELETE /wp/v2/plugins/:slug`.
- **#89** (Carmen + Ingrid) — `GET /wp/v2/plugins?q=<term>` full-text over name + description.

Without this ADR written before Sprint 7 day 1, four agents race on contract decisions simultaneously: Lucas on which endpoints the UI calls, Raúl on how the CLI triggers install from the UI, Ingrid on what `q` matches against, Nico on what status badges exist. Same pattern that ADR-023 solved for Sprint 6 — contract-before-code as coordination primitive for parallel execution.

Constraints that shape the decision:

- **ADR-014 (Quickstart Invariant) holds.** A clean clone still boots without touching the marketplace. No new mandatory env var, no new boot-time network call.
- **ADR-020 (Loader Runtime) is still the only execution mechanism.** The marketplace discovers + distributes + removes code on disk; the loader decides what actually runs on next boot. Uninstall does not deactivate a running plugin — same contract ADR-023 framed for install ("run `nodepress serve` to activate").
- **ADR-018 (Bridge Security Boundary) sets the precedent.** The new `POST /wp/v2/plugins/install` endpoint executes code that writes files to the server's filesystem. Helena gate required before staging. Same threat-modelling rigour that gated the php-wasm bridge.
- **ADR-015 (Tooling Runtime Boundary) applies.** The new install endpoint runs in Lane A (NodeNext ESM app) and calls the install _service_ (shared with the CLI), never shells out to the CLI binary. No `child_process.exec`, no shell interpolation surface.
- **Scope discipline per retro S6.** R-S6-4 promoted marketplace UI as P0; nothing beyond the four tickets above is in Sprint 7. Ratings, verified publishers, paid plugins, hot-reload all stay out — same rationale-with-list pattern as ADR-023 § Scope.

## Decision

**The marketplace is a thin UI layer over the ADR-023 REST surface, plus three server-side capabilities (install-via-REST, uninstall, search) and a dependency resolver inside the install flow.** No new infrastructure. No new auth model. No new distribution format. Every new surface composes with what ADR-023 shipped.

### 1. Marketplace UI — new page `/plugins` in the admin panel

A single admin route renders four operations over the existing registry REST:

- **Browse.** Paginated list backed by `GET /wp/v2/plugins`. Pagination uses the already-documented `page` + `per_page` query params (ADR-001 § REST API; OpenAPI contract shipped in Sprint 6 ticket #79).
- **Search.** Search box drives `GET /wp/v2/plugins?q=<term>` (new in Sprint 7, § 4 below). Debounced client-side (300ms) — no new server contract for rate limiting; the search endpoint is behind the existing admin session.
- **Install.** Per-row "Install" button hits `POST /wp/v2/plugins/install` with `{ slug }` (new endpoint, § 2 below). The UI renders a pending state until the server returns; on success, the row's status badge flips to `installed`.
- **Uninstall.** Per-row button (visible when status is `installed` or `active` or `error`) hits `DELETE /wp/v2/plugins/:slug` (new endpoint, § 3 below).
- **Status badge.** Derived from the existing `status` column of `plugin_registry` (`installed | active | error | uninstalled`). No new schema. The badge mirrors what the existing Users UI already does for role displays — Lucas's Sprint 6 pattern reused.

**The UI introduces zero new infrastructure.** No state machine in the frontend, no background polling, no optimistic updates. React Query handles loading + error + refetch; the server is the source of truth. If the server says `status: error`, the badge says "error" and a tooltip surfaces `error_log` (already in the schema since Sprint 0). The UI is a projection of the DB row, no more.

**Rejected: a separate "marketplace" entity in the schema** — one row per plugin mentioned on the internet, distinct from `plugin_registry` rows for installed ones. Splits the source of truth, forces the UI to reconcile two lists. The same `plugin_registry` table carries both "installed here" and "discoverable" rows — `status = 'uninstalled'` is a valid entry, not a deleted one (§ 3 below). One table, one list, one badge meaning.

### 2. Install via REST — `POST /wp/v2/plugins/install`

New endpoint. **The admin panel does not shell out to the CLI.** Instead the server exposes an endpoint that invokes the **same install service the CLI calls**:

```
POST /wp/v2/plugins/install
Authorization: Bearer <admin-token>
Content-Type: application/json

{ "slug": "seo-basic" }   or   { "slug": "seo-basic", "version": "1.2.0" }
```

**Shared-service architecture — not shell-exec.** Today the CLI install command (`packages/cli/src/commands/plugin/install.ts`) contains the flow described in ADR-023 § 4 as straight-line code. Sprint 7 ticket #88/#85 extracts that flow into a shared module under `packages/server/src/plugins/install-service.ts` (or similar — Raúl's implementation call). The CLI imports it. The REST handler imports it. Both call `installPlugin({ slug, version? })`. One code path, two entry points.

This is load-bearing for three reasons:

- **Shell exec from an HTTP handler is a security anti-pattern.** `exec('nodepress plugin install ' + slug)` is an RCE vector if any validation gap ever lets an arbitrary string into `slug`. The REST handler never assembles a shell command. Helena's ADR-018 precedent stands: any code that flows from an external source into a side effect must not use shell as the transport.
- **Auth and auditability collapse to the same layer.** The REST endpoint runs inside Fastify's request lifecycle — `requireAdmin` middleware, request logging, OpenAPI contract, structured errors. Shelling out would skip all of that.
- **Testability.** The install service is unit-testable with a mocked registry client. A shell-exec handler would need the CLI binary on PATH in every test environment.

**Async execution model.** The install flow (fetch manifest → download tarball → verify checksum → extract → write registry row → resolve dependencies) is I/O-bound but can take several seconds for a multi-MB tarball on a slow connection. Sprint 7 ships it as a **synchronous request from the client's perspective**: the HTTP connection stays open, the handler awaits the service, returns `200 { status: 'installed', slug, version, dependencies: [...] }` or a structured error. No background jobs, no polling endpoint. Request timeout is Fastify's default (configurable later if needed); a 30s install is acceptable for an operator-initiated action behind an admin login.

Rationale for sync: background-job infrastructure (queue, worker, status endpoint) is a separate ADR. Sprint 7 doesn't need it — the UX is "click install, watch spinner, see result". Async-with-polling is a Sprint 8+ upgrade if any piloto reports 30s timeouts.

**Rejected: shell-exec the CLI.** Security + auth + testability arguments above. Also splits ownership — the CLI command evolves, the REST wrapper lags, drift between "install via CLI" and "install via UI" becomes a bug category.

**Rejected: message queue + worker + status polling.** Premature infrastructure. When a piloto complains about 30s installs, we add it; until then, one fewer moving part.

### 3. Uninstall — `DELETE /wp/v2/plugins/:slug` + `nodepress plugin uninstall <slug>`

Symmetric to install. Both the REST endpoint and the CLI command call a shared `uninstallPlugin({ slug })` service with this behaviour:

1. Verify the plugin exists in `plugin_registry`. 404 if not.
2. Delete the plugin directory: `NODEPRESS_PLUGINS_DIR/{slug}/`. If missing on disk but present in DB (manual drift), the service logs a warning and continues — DB authoritative.
3. **Do not delete the `plugin_registry` row.** Update `status = 'uninstalled'`, clear `activated_at`, keep `error_log` as historical audit trail. The row stays so future reinstalls (a piloto uninstalls, then reinstalls two days later) see the history and so admin UI can surface "you had this installed before".
4. **No hot-deactivation.** If the server is running and the plugin was loaded at boot, the running process still has the plugin active in memory. The CLI/UI prints/returns: `Plugin 'seo-basic' uninstalled. Run 'nodepress serve' to deactivate.` — same contract as install's "run serve to activate". Symmetric footprint, no ADR-020 loader changes.

**Rejected: delete the registry row on uninstall.** Destroys history. A piloto reinstalling the same plugin a week later would get a fresh row with no link to the previous install's error_log. That's the exact scenario where history helps ("this plugin crashed before, check the logs first").

**Rejected: hot-deactivate via dynamic module unload.** Node's ESM module cache makes this genuinely hard (not "one API call" hard — requires loader-level hook invalidation + HookRegistry cleanup by pluginId, which ADR-020's `removeAllByPlugin` supports but has never been exercised in production). That's a Sprint 8+ ADR ("Plugin Hot Reload") with its own security review, not a side-effect of uninstall. Keeping the contract "restart to deactivate" matches install and gives us one mental model.

**Rejected: soft-delete with `deleted_at` timestamp column.** A new column just to mimic `status = 'uninstalled'`. The existing status enum does the job.

### 4. Search — `GET /wp/v2/plugins?q=<term>`

Extends the existing list endpoint with one query param. Matching semantics:

- **Full-text over `name` + `description`.** The `name` column already exists (ADR-023 § 1). `description` is currently inside `meta.description` (JSONB) — Ingrid's ticket #89 decides whether to promote it to a first-class column or query it in-place via PostgreSQL's `jsonb` operators. Either works; promotion is a trivial migration if query performance needs it. Same rule that governed Sprint 6's column-vs-JSONB decision: first-class when queried often, JSONB otherwise.
- **Case-insensitive substring match for Sprint 7.** `ILIKE '%term%'` over the two text sources. No relevance ranking, no stemming, no fuzzy matching. If two plugins match, `ORDER BY name ASC` (deterministic, alphabetical, matches browse expectations). A PostgreSQL `tsvector` full-text index is a Sprint 8+ upgrade when the registry crosses a size threshold (tens of thousands of plugins) — today we have one digit of plugins, an index is over-engineering.
- **Pagination preserved.** `?q=seo&page=2&per_page=20` works identically to `?page=2&per_page=20`. The `q` filter narrows the set; pagination paginates the narrowed set.
- **Empty `q` is equivalent to no `q`.** `?q=` returns the full list. Matches WP REST convention and avoids a special "please type something" state in the UI.

**Rejected: a separate `/wp/v2/plugins/search` endpoint.** Two URL shapes for one semantic operation. The WP REST API philosophy is "same endpoint, more query params" — we follow it here.

**Rejected: ElasticSearch / Meilisearch / any external search engine.** New infrastructure dependency for a problem PostgreSQL handles at our scale. The day we have the scale problem, we add it; today we don't.

### 5. Dependency resolution — inside the install flow

The shared install service gains a dependency-resolution step before the "write registry row" step. Flow for `installPlugin({ slug: 'seo-advanced' })`:

1. **Fetch the target plugin's manifest** from the registry (same as Sprint 6 install flow).
2. **Read `nodepress.dependencies[]`** from `package.json`. This is a declared list of slugs: `["seo-basic", "meta-utils"]`. Versioned dependencies (`"seo-basic@^1.0.0"`) are **out of scope for Sprint 7** — plain slug-only, "any version installed". When the ecosystem has enough plugins to hit semver-conflict territory, the ADR amendment adds version resolution; today nobody has asked.
3. **For each dependency**, check the local `plugin_registry` table for `status IN ('installed', 'active')`. If present, skip. If absent, recursively call `installPlugin({ slug: dep })` with an incremented depth counter.
4. **Depth cap: 3.** A plugin can depend on a plugin that depends on a plugin — three levels deep. Attempting a fourth level is a hard error: `Dependency resolution exceeded max depth (3). Chain: seo-advanced → seo-basic → seo-core → seo-utils`. Three is enough for the plugin ecosystems the ICP knows (WP plugins rarely exceed two); the cap exists to prevent runaway recursion from corrupted manifests, not to enforce an ecosystem norm.
5. **Cycle detection by traversal set.** The recursive call carries a `Set<string>` of slugs already being resolved in the current chain. Encountering a cycle (`A → B → A`) aborts with `Dependency cycle detected: A → B → A`. Not counted against the depth cap — cycle is a distinct, more specific error.
6. **Version conflict is a warning, not a block.** If `seo-advanced` requires `seo-basic` (unversioned) and `seo-basic@1.0.0` is already installed but some hypothetical manifest metadata suggests `seo-basic@2.0.0` would have been fetched, the install proceeds with the already-installed version and surfaces a warning in the response: `{ warnings: ["seo-basic@1.0.0 already installed; skipped fetch of @2.0.0"] }`. No auto-upgrade. No interactive prompt. The operator can `plugin install seo-basic@2.0.0` explicitly if they want to.
7. **Transaction semantics.** Each dependency install is its own DB write — no "all or nothing" transaction. If `seo-advanced` installs but one of its deps fails, the operator gets a structured error listing exactly what installed and what didn't, and can retry. Full-rollback-on-partial-failure is scope creep that forces a two-phase commit pattern we don't need at this scale.

**Rejected: topological full-dep-graph resolver (npm-style).** Build the full graph, check SAT, install in order. Every ecosystem discovers the hard way that SAT solvers for deps are over-engineered until they're necessary; npm didn't have pnpm-style strict resolution for a decade. Depth-3 recursion is "good enough" for the first 50-100 plugins in our ecosystem, and the upgrade path to a proper solver is a Sprint 10+ ADR when the problem exists.

**Rejected: declare deps but do not auto-install.** Sprint 6 status quo. The retro signal (R-S6-4) said "marketplace UI" as the P0; shipping a UI that silently fails at boot because deps weren't installed is not a marketplace, it's a catalog. Auto-install is the minimum viable lifecycle.

**Rejected: peer-dep-style warnings with no install.** Less disruptive but doesn't close the gap. If a piloto installs an SEO plugin from the UI and nothing happens because it silently needed another plugin first, the piloto uninstalls NodePress. The whole point of the marketplace UI is to remove friction; half-measures here give the worst of both worlds.

### 6. Scope — what is NOT in Sprint 7

As load-bearing as the decisions. Each entry is a request that a mid-sprint pivot could justify if it's not written down:

- **No hot-reload of plugins.** Uninstall doesn't deactivate a running plugin; install doesn't activate one mid-runtime. Restart required for both. Sprint 8+ candidate with its own ADR.
- **No ratings or reviews.** Ticket #92 (P2) is a schema stub only — a table and columns, nothing that queries them. The UI does not render ratings in Sprint 7.
- **No verified publishers implementation.** Ticket #87 is conditional on Alejandro delivering criteria in the first 2 days. If criteria land, Román + Lucas implement the badge surface only — no identity verification, no signing, no per-publisher trust scoring. If criteria don't land, #87 is dropped (per backlog draft § Decisiones Pendientes).
- **No paid plugins / license enforcement / payment integration.** Commerce is a separate problem domain. When a piloto pays for a plugin, that's ADR-030-something territory.
- **No versioned dependency resolution.** Plain slug-only as § 5.2 states. `^1.0.0` and friends are Sprint 8+.
- **No rollback command.** `plugin uninstall` is the closest approximation. A full `plugin rollback <slug>` that restores the `.previous/` backup is Sprint 8+ if demand appears.
- **No offline / air-gapped install from local tarball via UI.** The CLI can side-load a local tarball in a future flag; the UI only installs from the configured registry URL.
- **No dependency graph visualisation in the UI.** The UI shows "this plugin installed, these deps were auto-installed" in the install response; it does not render a graph. Sprint 8+ if piloto requests.
- **No community publish flow.** `POST /wp/v2/plugins` still requires admin Bearer token (ADR-023 § 5). Opening publish to non-admins requires a publisher identity system — explicitly deferred to Sprint 8+ in ADR-023.
- **No marketplace category / tag navigation.** Search by name/description only. Category browsing is a product decision Alejandro hasn't surfaced.

## Alternatives Considered

### A. UI talks directly to the CLI via a local IPC socket

**Shape:** admin panel connects to a Unix socket exposed by `nodepress serve`, sends install commands as JSON messages, receives progress updates.

**Rejected because:** introduces a parallel protocol (IPC) alongside the existing REST API, doubles the surface we have to test, and still needs admin auth — which we already have on REST. The "watch install progress in real time" UX it enables is Sprint 8+ concern; Sprint 7 survives on request/response.

### B. Render a full npm-style dependency solver in the CLI

**Shape:** adopt `semver` + lockfile + topological sort; every install resolves the full transitive graph, deduplicates versions, writes `plugin-lockfile.json`.

**Rejected because:** we don't have version conflicts to resolve yet — plain slug resolution is sufficient for the first 50-100 plugins. Shipping an over-engineered solver now means we carry its maintenance burden before it earns its keep, and the migration path to it from depth-3 recursion is incremental (add a lockfile, add semver parsing, add topological sort) rather than destructive.

### C. Uninstall via separate `POST /wp/v2/plugins/uninstall`

**Shape:** mirror the install endpoint pattern with a POST instead of a DELETE.

**Rejected because:** REST conventions have a DELETE verb for a reason. The existing resource `/wp/v2/plugins/:slug` has a clean DELETE semantic — "remove this plugin from the installed set". The WP REST API itself uses DELETE for plugin removal. Matching both HTTP and WP conventions is free; deviating would need a reason we don't have.

### D. Search via a separate `/wp/v2/plugins/search?q=` endpoint

**Shape:** dedicated URL for search distinct from list.

**Rejected because:** two endpoints with nearly identical responses and differing only in whether `q` is accepted. WP REST API itself treats search as a query param on the list endpoint. One endpoint, one behaviour, `q` filters the set.

### E. UI as a separate SPA / separate app

**Shape:** marketplace lives outside the admin panel as its own route tree, maybe even a separate Vite app.

**Rejected because:** the admin panel already has the auth session, the React Query client, the layout, the Toast component, the router. Splitting the marketplace out is cost with no benefit — plugins are administered inside the admin panel. Users UI was added the same way in Sprint 6 (ticket #81) and the pattern works.

## Consequences

**Ganamos:**

- **Full plugin lifecycle accessible from both UI and CLI.** A non-technical operator browses, searches, installs, uninstalls through the admin panel. A technical operator does the same via CLI. Same code path under both. H-1 from ICP-1 (plugins from a registry) is unblocked for the non-technical half of the audience — Sprint 6 already unblocked the technical half.
- **No new infrastructure.** No queue, no background worker, no IPC socket, no search engine. Four endpoint additions + one service extraction + one UI page. Sprint 7 deliverable fits inside the team's existing mental model.
- **Contract coordination for four tickets in parallel.** #84, #85, #88, #89 can start simultaneously on day 1 with this ADR accepted. Same pattern that delivered 10/10 in Sprint 6.
- **Reversible operations.** Uninstall exists; status history preserved; operator can recover. The first piloto who installs a bad plugin doesn't need to DROP the DB row by hand.
- **Dependency resolution without silent failures.** A plugin that declares deps gets them installed, with a depth cap as a safety net. The worst UX (silent boot failure) is gone.

**Perdemos:**

- **`POST /wp/v2/plugins/install` is a new filesystem-writing REST surface.** Same threat class as ADR-023's `POST /wp/v2/plugins` publish endpoint — requires Helena review before staging. Specifically: the shared install service must use the same tar hardening (`strict: true`, path-traversal rejection) that ADR-023 locked down, and Helena audits that the service is the single extraction path used by both CLI and REST.
- **Synchronous install blocks a request thread for multi-second installs.** If 20 admins install simultaneously and each install takes 15 seconds, the server has 20 long-lived requests. Mitigation: admin endpoints are already low-concurrency; Fastify request limits + OS-level resource guards cover the worst case. Background-job upgrade is an option if a piloto reports saturation.
- **Uninstall leaves the registry row.** Storage grows monotonically. Mitigation: rows are tiny (JSONB metadata, maybe a kilobyte each); the table is small (hundreds to thousands in the lifetime of any install) and never approaches concerning size. A "clear history" operator action can be added later if needed.
- **Depth-3 dep resolution excludes some ecosystems.** A plugin with 4+ levels of deps won't resolve. Mitigation: the cap is explicit and the error message is actionable ("chain: A → B → C → D exceeds depth 3"). Operator can install deeper deps manually; ADR amendment raises the cap if any real piloto plugin hits it.

**Riesgos:**

- **Install endpoint as RCE amplifier.** A stolen admin token + a malicious plugin in the registry = arbitrary JS on the server on next boot. Same threat posture as ADR-023 publish endpoint, not new. Mitigation chain: admin token is the existing trust boundary; tar extraction is hardened (`strict: true`); Helena audits the install service; vm.Context sandbox (Sprint 6 #78) boxes the execution blast radius.
- **Dependency resolution slowing install significantly.** A plugin with three levels of deps fetches four tarballs serially. Mitigation: depth-3 cap bounds the worst case to 4 fetches; if it becomes painful, parallelise dep fetches (same level in parallel, next level sequential). Optimisation not needed for Sprint 7; the cap is the guardrail.
- **Search query amplifying DB load.** `ILIKE '%term%'` on a JSONB field is a sequential scan for each request. At hundreds of plugins, negligible; at tens of thousands, problematic. Mitigation is Sprint 8+ concern — add a `tsvector` GIN index or promote description to a column.
- **UI installs that fail mid-stream leave partial state.** Dep resolution fetches three plugins; second succeeds, third fails. Server returns structured error naming what installed. UI has to render that clearly, not as "install failed" (which would mislead — one of three succeeded). Lucas's ticket #84 owns this UX; the ADR guarantees the error shape carries the partial success data.
- **Race between UI install and concurrent CLI install of same slug.** Two operators click install at the same time. The service must handle this — either lock on slug, or let the second install succeed idempotently (same version → no-op, different version → upgrade). Raúl's #85 implementation chooses; the ADR mandates that the concurrent case doesn't corrupt the `plugin_registry` row.

## Open Questions

- **Async install with progress.** If Sprint 8+ pilots report 30s+ installs (large tarballs, slow connections), upgrade to job-queue pattern with a `GET /wp/v2/plugins/install/:job-id` status endpoint. The request/response contract in § 2 doesn't preclude this — the upgrade is additive.
- **Rollback command.** `nodepress plugin rollback <slug>` that restores from the `.previous/` backup directory. Symmetric in spirit to uninstall. Sprint 8+ candidate once a piloto asks.
- **Dep resolution with versioning.** When two plugins declare conflicting versions of a shared dep, the Sprint 7 behaviour is "first install wins + warning". A proper solver is Sprint 10+ territory when ecosystem size demands it.
- **Marketplace metadata beyond search.** Categories, tags, author profiles, download counters. All community-signal features that Sprint 7 defers. Schema stub (#92) is the only groundwork; activation is Sprint 8+.
- **Multi-version installs in parallel.** ADR-023 § 1 invariant: one slug = one installed version. When a piloto needs two versions of the same plugin live (rare but possible), an ADR amendment relaxes this. No piloto has asked.

## References

- `packages/db/src/schema/plugin-registry.ts` — existing schema; Sprint 7 does not modify it (description-to-column decision inside #89 may add one column)
- `packages/cli/src/commands/plugin/install.ts` — existing CLI install; Sprint 7 extracts its body into a shared service
- `packages/admin/src/pages/` — admin panel pages; `/plugins` lands here alongside existing routes
- `docs/process/backlog-sprint7-draft.md` — Sprint 7 backlog + retro S6 references
- `docs/process/retros/sprint-6-retro.md` — R-S6-4 (marketplace UI as P0)
- ADR-001 § REST API — pagination + auth conventions reused
- ADR-014 § Developer Quickstart Invariant — marketplace doesn't alter boot flow
- ADR-015 § Tooling Runtime Boundary — shared install service runs in Lane A; no shell exec
- ADR-018 § Bridge Security Boundary — threat-modelling precedent for code-path-writing REST surfaces
- ADR-020 § Plugin Loader Runtime — restart-to-activate / restart-to-deactivate contract preserved
- ADR-023 § Plugin Registry Architecture — the foundation this ADR extends
- WordPress REST API plugins endpoint reference: <https://developer.wordpress.org/rest-api/reference/plugins/>
