# ADR-003: PHP Compatibility Strategy

- **Status:** Accepted
- **Date:** 2026-04-09
- **Author:** Román (Tech Lead)

## Context

WordPress has approximately 60,000 PHP plugins. NodePress is built natively on Node.js/TypeScript — there is no PHP runtime in the stack.

ADR-001 established that the plugin system would be JS/TS native with a WP-compatible API surface, explicitly ruling out a PHP bridge. During Sprint 0 planning, the CEO raised the concern that without PHP compatibility, NodePress cannot realistically compete in the WP ecosystem. This ADR formalizes the compatibility strategy agreed in the team meeting of 2026-04-09, following evaluation of six technical approaches and input from Tech Lead, Lead Backend, IT Manager, and external consultant.

### Options evaluated and discarded

| Option                         | Why discarded                                                                                                                                                                                   |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PHP-to-JS transpilation        | No mature technology exists. Discarded immediately.                                                                                                                                             |
| FrankenPHP embedded in Node    | Not an embeddable runtime for this use case. Not viable standalone.                                                                                                                             |
| PHP-FPM sidecar process        | +400MB Docker image, dual CVE pipeline, php-fpm process has no sandbox equivalent to `vm.Context`, IPC crossing for sync filters costs 5–50ms per call — eliminates Node performance advantage. |
| Full dual runtime (Node + PHP) | Months of engineering, two sources of truth, identity problem: "is this a Node CMS or a WordPress orchestrator?"                                                                                |
| WP core stripped as PHP base   | 50MB of PHP globals, require loops, non-isolatable. Any PHP base must be custom shims only.                                                                                                     |

### Market validation

No project outside of WordPress itself has achieved PHP plugin compatibility: Ghost (3M active sites), Strapi ($400M valuation), Directus, ClassicPress — none run WP PHP plugins. The market does not reward PHP compatibility; it rewards modern DX and a clear ICP.

### The $wpdb problem

The primary technical blocker for PHP compatibility is `$wpdb`. Popular WP plugins issue raw SQL against MySQL, using WP's EAV schema (`wp_posts`, `wp_postmeta` key-value rows). NodePress uses PostgreSQL with a clean-slate schema and JSONB meta. Bridging this requires either:

- A MySQL compatibility layer with dual writes (weeks of engineering, two sources of truth), or
- A MySQL→PostgreSQL query rewriter with partial coverage.

Neither is viable at this stage. Any PHP plugin requiring database access must be ported to JS/TS native.

## Decision

### Plugin Tier System

NodePress defines three tiers of plugin compatibility:

---

#### Tier 1 — Native (Current, First-Class)

**Runtime:** Node.js `vm.Context` sandbox  
**Support level:** Full  
**Status:** Active — all of Sprint 0/1

Plugins written in JS/TS using NodePress's WP-compatible API surface. This is the target format for all NodePress plugins. The API mirrors WordPress (`add_action`, `add_filter`, `get_option`, `register_post_type`, etc.) but runs natively in TypeScript with type safety, testability, and full Node.js performance.

Plugins run in a `vm.Context` sandbox with controlled globals. Direct filesystem and network access is only available through provided APIs. A crashing plugin does not take down the server.

**This is the only officially supported tier at launch.**

---

#### Tier 2 — PHP via php-wasm (Post-Beta, Scoped)

**Runtime:** `@php-wasm/node` embedded WASM module  
**Support level:** Limited — content logic only  
**Status:** Post-beta — contingent on Sprint 1 spike results

For PHP plugins that require only pure content logic: shortcodes, text filters, simple widgets. **No database access. No filesystem. No networking.**

The bridge mechanism:

1. `@php-wasm/node` executes the plugin's `activate()` function
2. PHP calls to `add_action` / `add_filter` are intercepted by a PHP shim that serializes hook registrations to the JS HookRegistry
3. When a hook fires, NodePress calls back into the WASM module with serialized arguments
4. The response is deserialized and returned to the JS hook chain

**Key constraint:** `apply_filters` is synchronous in NodePress (matching WP semantics). WASM execution is synchronous and blocks the event loop during processing. This is acceptable for content-only logic (1–3 calls per request, microsecond-range execution) but is explicitly prohibited for plugins doing I/O, queries, or networking.

**PHP extensions available in WASM are limited.** `curl`, `gd`, `imagick`, and other native extensions are not available. The exact extension matrix will be documented separately by the IT Manager following the Sprint 1 spike.

**Why php-wasm over php-fpm for Tier 2:**

| Concern                    | php-fpm                       | php-wasm                  |
| -------------------------- | ----------------------------- | ------------------------- |
| Docker image delta         | +400MB                        | +70MB                     |
| Second process required    | Yes                           | No                        |
| Sandbox model              | `disable_functions` (fragile) | WASM sandbox (structural) |
| IPC overhead               | 5–50ms per crossing           | Microseconds (in-process) |
| PHP installation on server | Required                      | No                        |

**Entry condition for Tier 2:** Sprint 1 spike (Raúl, 2 days, supervised by Román) must demonstrate a real WP shortcode plugin executing successfully in NodePress via `@php-wasm/node` with acceptable latency and memory footprint. If the spike fails to demonstrate viability, Tier 2 does not enter the roadmap.

---

#### Tier 3 — PHP Plugin Server (Future — Not in Active Roadmap)

**Runtime:** Separate PHP-FPM microservice with dedicated MySQL instance  
**Support level:** Full PHP + $wpdb — for plugins requiring real database access  
**Status:** Documented design, NOT scheduled. Requires separate ADR.

A separate opt-in microservice (`nodepress-wp-plugin-server`) running PHP custom shims (not WP core) against a MySQL database containing WP-compatible schema. NodePress synchronizes data from PostgreSQL to MySQL (unidirectional — PG is source of truth). Plugins can read via `$wpdb`; writes from PHP are not supported in v1 (single source of truth constraint).

**Technical constraints if ever built:**

- `apply_filters` síncrono + HTTP is a hard blocker. Only `do_action` (async) can cross the bridge in v1. PHP filters must be ported to JS.
- Schema sync: JSONB meta in PG must be flattened to EAV rows in MySQL, including PHP-serialized array format. Estimated 2 weeks for the PG→MySQL mapper alone.
- PHP base must be a custom minimal implementation (~300 lines for hook system + `$wpdb` wrapper + common function shims). **Never WP core** — it is non-isolatable.
- Stack grows from 3 services (Node, PG, Redis) to 5 (+ PHP-FPM, MySQL). Production HA requires Kubernetes. Estimated infrastructure cost increase: +70–120 €/month base.
- DR with two databases requires coordinated snapshots. Asynchronous dumps are not coherently restorable.
- Estimated engineering effort: 7–8 weeks senior developer, not including DR and CVE pipeline work.

**Pre-requisites before this tier can enter the active roadmap (non-negotiable):**

1. Dedicated ADR with full technical design and trade-offs
2. Threat model (PHP-FPM executing third-party code is categorically different attack surface from `vm.Context`)
3. Coordinated DR strategy documented and validated
4. PHP CVE pipeline — PHP has critical vulnerabilities multiple times per year

**Business trigger for activation:** At least one concrete enterprise customer request with a specific plugin, a budget, and a timeline. Building this without validated demand is speculative. The client with WooCommerce who cannot migrate is not NodePress's ICP today.

---

### Migration Tooling — `nodepress port-plugin`

A CLI tool enters the roadmap for Sprint 2. It analyzes a PHP plugin and generates a JS/TS scaffold with:

- Hook registrations identified from PHP source (`add_action`, `add_filter` calls)
- Options and settings structures extracted
- Custom Post Types and taxonomies detected
- REST route registrations identified

The developer completes the port manually. Target automation coverage: ~60% mechanical scaffolding, ~40% manual implementation.

**This is the primary migration path for PHP plugins.** The tool reduces migration cost significantly for WP developers targeting Tier 1.

### ICP and Go-to-Market Alignment

NodePress's target customer is agencies and development teams that want to move beyond PHP — building new projects, or migrating existing WP sites where the team is ready to work in TypeScript.

The client who has WooCommerce and cannot rewrite it is not the current ICP. That client should remain on WordPress.

The go-to-market position:

> "NodePress: CMS moderno con API WordPress-compatible. Tu equipo trabaja en TypeScript. Tus shortcodes PHP simples funcionan. Y hay herramientas para portar el resto."

This position is conditional on the Sprint 1 spike validating Tier 2. No public PHP compatibility claims before a working demo exists.

## Sprint 1 Spike — Acceptance Criteria

| Metric                  | Target                                                     |
| ----------------------- | ---------------------------------------------------------- |
| Plugin type             | Real WP shortcode plugin (e.g., Contact Form 7 or similar) |
| Execution               | Shortcode renders correctly in NodePress response          |
| Latency overhead        | < 20ms for content-only shortcodes                         |
| Memory footprint        | < 100MB WASM module baseline                               |
| PHP extensions required | Must work within WASM extension constraints                |

Spike owner: Raúl. Supervised by: Román (Tech Lead). Duration: 2 days within Sprint 1.

Results feed directly into whether Tier 2 enters the post-beta roadmap or is removed from consideration.

## Consequences

### Positive

- Clean architecture. No PHP runtime in the core stack at launch. No second process, no dual CVE pipeline.
- Clear ICP. NodePress targets developers who want to leave PHP — the PHP compat question does not arise with this audience.
- Tier 2 covers the realistic use case: content-only plugins (shortcodes, text filters) represent approximately 80% of plugins used by blogs and simple content sites by volume, even if not by complexity.
- Migration tooling (CLI) reduces porting effort and makes the community contribution path tractable.
- Tier 3 is architecturally designed and documented, so if enterprise demand materializes it can be built without a redesign.

### Negative

- Existing PHP plugins do not work without porting. This is a hard constraint.
- WooCommerce, ACF, and other database-dependent plugins require full reimplementation. There is no shortcut.
- Community adoption depends on developers being willing to port or build native plugins. Community does not exist yet.

### Mitigations

- `nodepress port-plugin` CLI reduces porting effort to ~60% automation
- Open source community can reimplement the top 20 plugins (NodePress provides the framework, not the implementations)
- Honest positioning avoids the credibility loss of overpromising PHP compatibility

## References

- ADR-001: Architecture Overview — establishes JS/TS native runtime and plugin sandbox
- ADR-002: Folder Structure
- Meeting log: `20260409-compatibilidad-plugins-php-wordpress.md`
- Meeting log: `20260409-nodepress-wp-plugin-server-bridge.md`
- [WordPress Plugin API](https://developer.wordpress.org/plugins/)
- [`@php-wasm/node`](https://github.com/WordPress/wordpress-playground)
