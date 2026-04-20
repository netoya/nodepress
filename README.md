# NodePress

> WordPress-compatible CMS built on Node.js / TypeScript.

[![Node >=22](https://img.shields.io/badge/node-%3E%3D22-brightgreen.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/typescript-strict-3178c6.svg)](https://www.typescriptlang.org/)
[![License: GPL-3.0-or-later](https://img.shields.io/badge/license-GPL--3.0--or--later-blue.svg)](LICENSE)
[![Status: Beta](https://img.shields.io/badge/status-beta-yellow.svg)](PROJECT_STATUS.md)

**Sprint 6 closed · Sprint 7 active (public CSS + bridge hardening + Sprint Closing process).**

---

## What is NodePress

NodePress is an open-source CMS that runs the WordPress ecosystem semantics —
hooks, REST API v2, plugin contracts, theme templates — on a native Node.js /
TypeScript runtime. It is not a PHP wrapper and not a WordPress orchestrator:
the content engine, the HTTP layer, and the admin panel are all Node-first,
backed by PostgreSQL and Drizzle ORM.

It exists for a specific audience: agencies and engineering teams that want
to leave PHP behind without losing the familiarity of the WordPress authoring
model or the long tail of plugins and themes they already depend on. The
common shape is an organization that ships WordPress today, hits a ceiling on
typing, observability, or runtime cost, and is not willing to rewrite every
content plugin from zero to move off.

To make that transition tractable, NodePress ships three compatibility
surfaces out of the box: a `HookRegistry` with WordPress-identical `action`
and `filter` semantics (numeric priorities, sync filters, async actions), a
WP REST API v2 compatible surface covering the core content endpoints, and a
Tier 2 bridge that runs pure-content PHP plugins through `php-wasm` for
shortcodes and filters — no database access, no I/O, no networking. Plugins
that need persistence or side effects are loaded as JS/TS modules through a
`vm.Context` sandbox ([ADR-020](docs/adr/ADR-020-plugin-loader-runtime.md)),
not through PHP.

---

## What's shipped (Sprints 0–6)

- **Hook system** — `HookRegistry` with WP-identical semantics: numeric
  priorities, sync filters, async actions, `removeAllByPlugin` cleanup.
  100% coverage on the registry.
  ([ADR-005](docs/adr/ADR-005-hook-system-semantics.md))
- **REST API WP-compatible** — 15 endpoints across posts, users,
  taxonomies (categories, tags), media stub, and plugins. `?context=view|edit`
  honored per [ADR-009](docs/adr/ADR-009-context-param-deferred-sprint-2.md).
- **Tier 2 bridge (`php-wasm`)** — 4 pilots operational and integration-tested
  against a real PHP runtime: Footnotes, Shortcodes Ultimate, Display Posts,
  Contact Form 7 (static HTML).
  ([ADR-017](docs/adr/ADR-017-tier2-bridge-surface.md),
  [ADR-018](docs/adr/ADR-018-bridge-security-boundary.md))
- **Plugin Loader** — JS/TS plugins discovered under `NODEPRESS_PLUGINS_DIR`,
  loaded through `vm.Context` sandbox with per-plugin disposal.
  ([ADR-020](docs/adr/ADR-020-plugin-loader-runtime.md))
- **ThemeEngine MVP** — `ThemeEngine.render(slug, context)` interface with
  `InlineThemeEngine` covering `single` and `archive`.
  ([ADR-021](docs/adr/ADR-021-theme-core-integration.md))
- **CLI** — `nodepress serve`, `nodepress migrate`, `nodepress plugin list`,
  `nodepress import-wp` publishable as an npm binary.
  ([ADR-010](docs/adr/ADR-010-cli-architecture.md))
- **Admin panel (React 19 + Vite)** — Dashboard (4 states), Posts (list +
  editor with taxonomy selector), Plugins list, Users list. React Router v7.
- **WP Import CLI** — real importer for posts, terms, users, and comments,
  with `--mode=reset|upsert` and `--dry-run`.
  ([ADR-022](docs/adr/ADR-022-wp-import-strategy.md))
- **Plugin Registry** — `nodepress plugin install <name>[@version]` wired to
  the registry, tarball download + extraction into `NODEPRESS_PLUGINS_DIR`,
  REST surface at `GET/POST /wp/v2/plugins`. Plugin status fixed: installed
  plugins are immediately active.
  ([ADR-023](docs/adr/ADR-023-plugin-registry-architecture.md))
- **vm.Context hardening** — Worker Threads with 32 MB memory limit per
  plugin, opt-in via `NODEPRESS_WORKER_SANDBOX=true`.
- **Bridge hardening** — VFS sandbox verified (file_get_contents path traversal
  returns false), BRIDGE_FATAL console.error in development, singleton
  redeclaration guards on all 11 PHP stubs. E2E shortcode specs in CI.
- **Public frontend CSS** — `InlineThemeEngine` rewritten with design tokens
  (Inter, Deep Violet palette, 720px reading column). Covers single, archive,
  empty state, 404. Shortcode rendering: footnotes, su_note, su_button.
- **Tests** — 404+ Vitest tests green across core, server, admin, db, cli,
  theme-engine. Integration tests hit real Postgres and real `php-wasm`.
- **ADRs** — 24 Accepted. See [docs/adr/](docs/adr/) for the full index.

---

## What's in Sprint 7 (active, 2026-06-30 → 2026-07-11)

- **Plugin marketplace UI** — Browse, search, install plugins from the admin
  panel. Dependency resolution before install.
- **Public frontend design tokens** — `@nodepress/design-tokens` package
  extraction (P0 Sprint 9 committed). CSS tokens shared between admin and
  public frontend.
- **Sprint Closing Checklist** — Formal process: retro log + PROJECT_STATUS
  closed + README review + CI guard (`docs(readme): Sprint N close`).
  ([docs/process/sprint-close-checklist.md](docs/process/sprint-close-checklist.md))
- **Dark mode** — Admin panel dark mode (desplazado desde S7, delivery en S8).

Full Sprint 7 ticket map in [PROJECT_STATUS.md](PROJECT_STATUS.md).

---

## Quick Start

Prerequisites: Node.js >= 22, npm >= 10, Docker.

The Quick Start is a contract, not a suggestion. Any commit on `main` must
pass it on a fresh clone — see
[ADR-014 — Developer Quickstart Invariant](docs/adr/ADR-014-developer-quickstart-invariant.md).

```bash
# 1. Clone
git clone https://github.com/netoya/nodepress.git
cd nodepress

# 2. Copy env file
cp .env.example .env

# 3. Start Postgres 16 + Redis 7
docker compose up -d

# 4. Install workspace dependencies
npm install

# 5. Apply schema (dev)
npm run db:drizzle:push

# 6. Start the API server (Fastify, port 3000)
npm run dev

# 7. In another terminal, start the admin SPA (Vite, typically :5173)
npm run dev:admin
```

**Optional flags:**

- `NODEPRESS_TIER2=true` — enable the `php-wasm` Tier 2 bridge and the
  registered pilots. Mutually exclusive with `NODEPRESS_DEMO_MODE`.
- `NODEPRESS_DEMO_MODE=true` — register the demo hooks at boot (reproducible
  demo lifecycle, [ADR-016](docs/adr/ADR-016-demo-lifecycle-contract.md)).
- `NODEPRESS_WORKER_SANDBOX=true` — Sprint 6+, opt-in Worker Threads sandbox
  for plugins with a 32 MB memory limit. Default OFF to preserve the
  Quickstart invariant.

---

## Architecture

- **Plugin system** — JS/TS plugins loaded through `vm.Context` sandbox; PHP
  content plugins via the Tier 2 `php-wasm` bridge. No DB, I/O, or network
  from Tier 2 ([ADR-003](docs/adr/003-php-compatibility-strategy.md),
  [ADR-020](docs/adr/ADR-020-plugin-loader-runtime.md)).
- **PHP compatibility tiers** — Tier 1 = JS/TS native (full capability).
  Tier 2 = `php-wasm` for shortcodes and content filters. Tier 3 = future,
  gated on concrete enterprise demand.
- **Hook system** — sync filters, async actions. The asymmetry is
  intentional and matches WP semantics; any deviation requires an ADR
  before merge ([ADR-005](docs/adr/ADR-005-hook-system-semantics.md)).
- **REST surface** — WP API v2 compatible; `?context=view|edit` gates raw
  fields to admin callers.
- **Direction of dependencies** — `server → core + db`, `server → theme-engine`,
  `plugin-api → core`. Core does not import from `db`.
  ([ADR-002](docs/adr/002-folder-structure.md))

Full ADR index: [docs/adr/](docs/adr/). Sprint status and decisions:
[PROJECT_STATUS.md](PROJECT_STATUS.md).

---

## Contributing

NodePress is in **beta, open to technical contributors**. Read
[CONTRIBUTING.md](CONTRIBUTING.md) for the git flow, PR review rules, and
Definition of Done. **A signed CLA is required for external contributors**
— see [CLA.md](CLA.md). The CLA Assistant webhook is being wired up in
Sprint 6.

---

## Roadmap

| Sprint            | Goal                                                               |
| ----------------- | ------------------------------------------------------------------ |
| Sprint 6 (active) | Plugin Registry + vm.Context hardening + OpenAPI 100%              |
| Sprint 7          | Plugin marketplace UI + dependency resolution                      |
| Sprint 8+         | Verified publishers, Tier 3 plugin-server (enterprise demand only) |

Canonical source for sprint status, tickets, decisions, and ADR index:
[PROJECT_STATUS.md](PROJECT_STATUS.md).

---

## License

NodePress is dual-licensed:

- **GPL-3.0-or-later** — declared in [`package.json`](package.json). Full
  text in [LICENSE](LICENSE). This covers open-source use, modification, and
  redistribution under the GPL's copyleft terms.
- **Commercial license** — available for teams that cannot adopt GPL terms.
  See [COMMERCIAL-LICENSE.md](COMMERCIAL-LICENSE.md).

Rationale and the ongoing licensing discussion:
[docs/business/licensing.md](docs/business/licensing.md).
