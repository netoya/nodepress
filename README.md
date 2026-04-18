# NodePress

> WordPress-compatible CMS on Node.js and TypeScript.

[![License: GPL v3](https://img.shields.io/badge/License-GPL%20v3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![Node >=22](https://img.shields.io/badge/node-%3E%3D22-brightgreen.svg)](https://nodejs.org/)

> **Status: PoC / Sprint 0 — not production ready.**
> APIs, schemas, and plugin contracts are unstable and expected to change.

---

## What is NodePress

NodePress is an open-source CMS that aims to be compatible with the WordPress
ecosystem (plugins, themes, REST API) while running natively on Node.js and
TypeScript instead of PHP. The goal is to let teams keep the familiarity of
WordPress while moving to a modern, typed runtime backed by PostgreSQL.

The runtime is built around three pillars:

- **Hook system** — WordPress-style `actions` and `filters` with numeric
  priorities, implemented as an event-driven `HookRegistry`. Plugin lifecycle
  is tracked so hooks, timers, and listeners can be cleaned up on deactivation.
- **REST API** — endpoints that mirror the shape and semantics of the
  WordPress REST API v2, so existing clients and tooling can keep working.
- **Plugin API / theme engine** — a JS/TS-first plugin model, with a planned
  Tier 2 path via `php-wasm` for pure-content PHP plugins (no DB, no I/O).
  See [ADR-003](docs/adr/003-php-compatibility-strategy.md).

The admin panel is a fresh React 19 + Vite SPA — not the legacy WP admin.

---

## Tech Stack

- **Runtime:** Node.js 22, TypeScript (strict)
- **HTTP:** Fastify 5
- **Database:** PostgreSQL 16 + Drizzle ORM
- **Cache:** Redis 7
- **Admin:** React 19 + Vite 6
- **Tests:** Vitest
- **Lint / format:** ESLint + Prettier
- **Monorepo:** npm workspaces

---

## Repository Structure

```
nodepress/
├── admin/                  # React 19 + Vite admin SPA
├── packages/
│   ├── core/               # Hook system, content engine, domain primitives
│   ├── db/                 # Drizzle schema, migrations, seeds
│   ├── server/             # Fastify HTTP server, REST routes
│   ├── plugin-api/         # Plugin runtime contracts (vm.Context, lifecycle)
│   ├── theme-engine/       # Template resolver and rendering (planned)
│   └── cli/                # `nodepress` CLI (serve, migrate, plugin tooling)
├── docs/
│   ├── adr/                # Architecture Decision Records
│   ├── design/             # Design brief, tokens, wireframes
│   ├── business/           # ICP and licensing decisions
│   └── guides/             # Contributing guide
├── docker-compose.yml      # Postgres 16 + Redis 7 for local dev
├── PROJECT_STATUS.md       # Sprint status, decisions, roadmap
└── WORKFLOW.md             # Git flow, reviews, DoD quick reference
```

Core has a hard rule: **it does not import from `db`**. Direction of
dependencies is `server → core + db`. See
[ADR-002](docs/adr/002-folder-structure.md).

---

## ⚡ Quick Start

Prerequisites: Node.js >= 22, npm >= 10, Docker.

```bash
# 1. Clone
git clone https://github.com/netoya/nodepress.git
cd nodepress

# 2. Install workspace dependencies
npm install

# 3. Copy env file and adjust if needed
cp .env.example .env

# 4. Start Postgres 16 + Redis 7
docker compose up -d

# 5. Run database migrations
npm run db:migrate

# 6. Start the API server (Fastify, port 3000)
npm run dev

# 7. In another terminal, start the admin SPA (Vite)
npm run dev:admin
```

The server listens on `http://localhost:3000` and the admin SPA on the port
reported by Vite (typically `http://localhost:5173`).

---

## Scripts

Top-level scripts (see [`package.json`](package.json) for the full list):

| Script                        | Purpose                                        |
| ----------------------------- | ---------------------------------------------- |
| `npm run dev`                 | Start the Fastify server in watch mode         |
| `npm run dev:admin`           | Start the React admin SPA (Vite)               |
| `npm run build`               | Build every workspace                          |
| `npm run test`                | Run the full Vitest suite once                 |
| `npm run test:watch`          | Vitest in watch mode                           |
| `npm run lint`                | ESLint over `.ts` / `.tsx`                     |
| `npm run lint:fix`            | ESLint with auto-fix                           |
| `npm run format`              | Prettier over TS / TSX / JSON / MD             |
| `npm run typecheck`           | `tsc --build` across the monorepo              |
| `npm run db:migrate`          | Apply Drizzle migrations                       |
| `npm run db:seed`             | Run seeds from `packages/db/src/seeds`         |
| `npm run db:drizzle:generate` | Generate new Drizzle migration files           |
| `npm run db:drizzle:push`     | Push schema changes to the database (dev only) |
| `npm run db:drizzle:status`   | Show Drizzle migration status                  |
| `npm run cli -- <command>`    | Run the `nodepress` CLI from source            |

---

## Documentation

- [PROJECT_STATUS.md](PROJECT_STATUS.md) — sprint state, decisions, roadmap
- [WORKFLOW.md](WORKFLOW.md) — git flow, PR review, DoD quick reference
- [docs/guides/contributing.md](docs/guides/contributing.md) — contributing guide
- Architecture Decision Records:
  - [ADR-001 — Architecture Overview](docs/adr/001-architecture-overview.md)
  - [ADR-002 — Folder Structure](docs/adr/002-folder-structure.md)
  - [ADR-003 — PHP Compatibility Strategy](docs/adr/003-php-compatibility-strategy.md)
  - [ADR-004 — Plugin Lifecycle](docs/adr/004-plugin-lifecycle.md)
- Business docs:
  - [docs/business/icp.md](docs/business/icp.md) — ideal customer profile
  - [docs/business/licensing.md](docs/business/licensing.md) — licensing decision

---

## Roadmap

Sprint 0 (scaffolding) is in progress. Planned next:

- **Sprint 1** — Hook system, posts CRUD, WP-compatible REST endpoints, admin shell
- **Sprint 2** — Roles / capabilities, taxonomies, `nodepress port-plugin` CLI
- **Sprint 3** — Plugin API, `vm.Context` sandboxing, first example plugin

Post-Sprint 3: theme engine, full CLI, WP import/export tool, plugin registry.
See [PROJECT_STATUS.md](PROJECT_STATUS.md) for the live roadmap.

---

## Contributing

Contributions are welcome once the project goes public. Until then, please
read [docs/guides/contributing.md](docs/guides/contributing.md) for the git
flow, PR review rules, and Definition of Done.

---

## License

Licensed under **GPL-3.0-or-later**, as declared in
[`package.json`](package.json). Rationale and the ongoing dual-license
evaluation are documented in
[docs/business/licensing.md](docs/business/licensing.md).
