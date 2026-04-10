# ADR-002: Folder Structure — NodePress

- **Status:** Accepted
- **Date:** 2026-04-09
- **Author:** Román (Tech Lead)

## Context

NodePress is a monorepo with multiple concerns: core CMS engine, plugin system, theme engine, admin panel, and CLI tools. The structure must support independent development and clear boundaries.

## Decision

Monorepo with npm workspaces. Each package is independently buildable and testable.

```
nodepress/
├── package.json                  # Root — workspaces, shared scripts
├── tsconfig.base.json            # Shared TS config
├── vitest.workspace.ts           # Test workspace config
├── .env.example
├── docker-compose.yml            # PG + Redis for local dev
│
├── packages/
│   ├── core/                     # @nodepress/core
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts          # Public API
│   │       ├── hooks/            # Hook system (actions + filters)
│   │       │   ├── registry.ts
│   │       │   ├── types.ts
│   │       │   └── __tests__/
│   │       ├── content/          # Posts, pages, CPT, taxonomies
│   │       │   ├── posts.ts
│   │       │   ├── taxonomies.ts
│   │       │   ├── media.ts
│   │       │   └── __tests__/
│   │       ├── auth/             # Users, roles, capabilities, sessions
│   │       │   ├── users.ts
│   │       │   ├── roles.ts
│   │       │   ├── capabilities.ts
│   │       │   └── __tests__/
│   │       ├── options/          # Settings/options system
│   │       ├── comments/         # Comment system
│   │       └── utils/            # Shared utilities
│   │
│   ├── db/                       # @nodepress/db
│   │   ├── package.json
│   │   ├── src/
│   │   │   ├── schema/           # Drizzle schema definitions
│   │   │   │   ├── posts.ts
│   │   │   │   ├── users.ts
│   │   │   │   ├── terms.ts
│   │   │   │   ├── options.ts
│   │   │   │   └── comments.ts
│   │   │   ├── migrations/       # Drizzle migrations
│   │   │   ├── seeds/            # Dev seed data
│   │   │   └── client.ts         # DB connection + pool
│   │   └── drizzle.config.ts
│   │
│   ├── server/                   # @nodepress/server
│   │   ├── package.json
│   │   ├── src/
│   │   │   ├── index.ts          # Fastify app bootstrap
│   │   │   ├── routes/
│   │   │   │   ├── wp-json/      # WP REST API v2 compatible routes
│   │   │   │   │   ├── posts.ts
│   │   │   │   │   ├── pages.ts
│   │   │   │   │   ├── users.ts
│   │   │   │   │   ├── media.ts
│   │   │   │   │   ├── taxonomies.ts
│   │   │   │   │   └── comments.ts
│   │   │   │   └── nodepress/    # NodePress-specific endpoints
│   │   │   ├── middleware/
│   │   │   │   ├── auth.ts
│   │   │   │   ├── rate-limit.ts
│   │   │   │   └── cors.ts
│   │   │   └── plugins/          # Fastify plugins (not CMS plugins)
│   │   └── __tests__/
│   │
│   ├── plugin-api/               # @nodepress/plugin-api
│   │   ├── package.json
│   │   └── src/
│   │       ├── loader.ts         # Plugin discovery + loading
│   │       ├── sandbox.ts        # vm.Context sandboxing
│   │       ├── manifest.ts       # plugin.json schema + validation
│   │       ├── wp-compat.ts      # WP API shim layer
│   │       └── __tests__/
│   │
│   ├── theme-engine/             # @nodepress/theme-engine
│   │   ├── package.json
│   │   └── src/
│   │       ├── resolver.ts       # Template hierarchy resolver
│   │       ├── renderer.ts       # Template rendering
│   │       ├── blocks.ts         # Block rendering (Gutenberg compat)
│   │       ├── assets.ts         # Asset pipeline (enqueue system)
│   │       └── __tests__/
│   │
│   └── cli/                      # @nodepress/cli
│       ├── package.json
│       └── src/
│           ├── index.ts          # CLI entry (similar to wp-cli)
│           ├── commands/
│           │   ├── serve.ts
│           │   ├── migrate.ts
│           │   ├── seed.ts
│           │   ├── plugin.ts     # install, activate, deactivate
│           │   ├── import-wp.ts  # Import from WP MySQL dump
│           │   └── user.ts
│           └── __tests__/
│
├── plugins/                      # User/community plugins (not packages)
│   └── hello-nodepress/          # Example plugin
│       ├── plugin.json
│       └── index.ts
│
├── themes/                       # User/community themes
│   └── default/
│       ├── theme.json
│       ├── templates/
│       └── assets/
│
├── admin/                        # React admin panel (Vite)
│   ├── package.json
│   ├── vite.config.ts
│   ├── index.html
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── api/                  # API client (uses WP REST endpoints)
│       ├── components/
│       ├── pages/
│       ├── hooks/
│       └── stores/
│
├── docs/
│   ├── adr/                      # Architecture Decision Records
│   └── api/                      # API documentation
│
└── .claude/                      # Claude Code config
    └── TEAM.md
```

## Rationale

- **`packages/` for core modules:** Clear dependency graph. `server` depends on `core` + `db`. `plugin-api` depends on `core`. No circular deps.
- **`plugins/` and `themes/` at root:** These are user-land, not build-time dependencies. They're loaded at runtime by `plugin-api` and `theme-engine`.
- **`admin/` at root:** Separate SPA with its own build. Communicates with server exclusively via REST API — same as any WP admin replacement.
- **`packages/db/` separate from `core`:** Database is an implementation detail. Core defines business logic; db implements persistence. This enables testing core with in-memory adapters.

## Consequences

- npm workspaces handle dependency linking and shared scripts
- Each package has its own `tsconfig.json` extending `tsconfig.base.json`
- CI can build/test packages in parallel
- Clear ownership boundaries for future team scaling
