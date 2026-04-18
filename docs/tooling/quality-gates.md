# Quality Gates — NodePress Tooling

> Owner: Helena (IT Manager). Last updated: 2026-04-17.

## ESLint

### Setup

- **Config file:** `eslint.config.js` (flat config, ESLint v9 format)
- **Script:** `npm run lint` / `npm run lint:fix`

### Plugins active

| Plugin                      | Scope               | Purpose                                                  |
| --------------------------- | ------------------- | -------------------------------------------------------- |
| `typescript-eslint` v8      | All `*.ts`, `*.tsx` | TS-aware lint rules (recommended preset, non-type-aware) |
| `eslint-config-prettier`    | All                 | Disables rules that conflict with Prettier               |
| `eslint-plugin-react-hooks` | `admin/**`          | Enforces hooks rules (exhaustive-deps, rules-of-hooks)   |
| `eslint-plugin-react`       | `admin/**`          | React-specific rules (jsx-scope off, prop-types off)     |

### Key rule decisions

- `@typescript-eslint/no-explicit-any`: **warn** in source, **off** in tests (mocks need it)
- `@typescript-eslint/no-unused-vars`: **error** with `argsIgnorePattern: ^_` (prefix \_ to suppress)
- `@typescript-eslint/ban-ts-comment`: **error** (from recommended) — use `@ts-expect-error`, not `@ts-ignore`
- `@typescript-eslint/no-empty-object-type`: **error** (from recommended)
- Type-aware rules (`recommendedTypeChecked`): **NOT enabled** — monorepo has per-package tsconfigs; projectService across workspaces causes resolution errors. Decision deferred to Sprint 2.

### Ignored paths

```
**/dist/**
**/node_modules/**
**/*.tsbuildinfo
**/coverage/**
packages/spike-phpwasm/**
```

Spike package (`packages/spike-phpwasm`) is permanently exempt.

### Baseline errors (Sprint 1 day 1)

| Workspace          | Errors | Warnings | Owner         |
| ------------------ | ------ | -------- | ------------- |
| `admin/`           | 5      | 4        | Marta / Lucas |
| `packages/server/` | 0      | 0        | Ingrid        |
| `packages/core/`   | 0      | 0        | Roman         |
| Total              | **5**  | **4**    | —             |

Errors in `admin/`:

- `@typescript-eslint/no-empty-object-type` x4 in `Card.tsx`
- `@typescript-eslint/ban-ts-comment` x1 in `ErrorBoundary.tsx`

Each workspace owner fixes their own errors. Helena does not touch source files.

### Where to report ESLint config issues

Open a GitHub Issue tagged `tooling/eslint`. CC Helena.

---

## Vitest Coverage

### Setup

- **Provider:** `v8`
- **Config:** root `vitest.config.ts`
- **Script:** `npm run test:coverage`
- **Reports:** `text` (stdout), `html` (`coverage/`), `json-summary` (`coverage/`)

### Include / Exclude

```
include:
  packages/*/src/**/*.ts
  admin/src/**/*.ts
  admin/src/**/*.tsx

exclude:
  packages/spike-phpwasm/**
  **/*.test.ts / **/*.test.tsx / **/__tests__/**
  **/dist/**
  **/node_modules/**
```

### Thresholds

| Package         | Stmts | Branches | Funcs | Lines | Mode                                        |
| --------------- | ----- | -------- | ----- | ----- | ------------------------------------------- |
| `packages/core` | 90%   | 90%      | 90%   | 90%   | Enforced (non-zero exit)                    |
| `packages/db`   | 75%   | 75%      | 70%   | 75%   | Warn-only (CI: continue-on-error, Sprint 1) |
| All others      | —     | —        | —     | —     | Informative only                            |

### Coverage baseline (Sprint 1 day 1, passing tests only)

| Package / File                        | Stmts | Branches | Funcs | Lines | Notes                                    |
| ------------------------------------- | ----- | -------- | ----- | ----- | ---------------------------------------- |
| `packages/core/hooks/HookRegistry.ts` | 93.8% | 97.5%    | 100%  | 93.8% | Above threshold                          |
| `packages/core/hooks/context.ts`      | 0%    | 0%       | 0%    | 0%    | No tests yet — pulls aggregate below 90% |
| `packages/server`                     | 0%    | —        | —     | 0%    | Integration test needs DATABASE_URL      |
| `admin/`                              | 0%    | —        | —     | 0%    | Tests fail (missing react dep in root)   |

Action items (not Helena scope):

- Roman: add tests for `context.ts` to reach 90% aggregate on core
- Marta/Lucas: fix react dep so admin tests run
- Ingrid: provide test DATABASE_URL in CI env

### How to interpret the report

1. Run `npm run test:coverage` locally
2. Open `coverage/index.html` in browser for file-level breakdown
3. `json-summary` is consumed by CI badge (planned Sprint 2)

---

## Pre-commit Hooks

**Status: Prototype / opt-in (Sprint 1). NOT mandatory yet.**

Configured in Sprint 1 day 2. Adoption decision at retro Sprint 1 → Sprint 2.

## Husky (prototype / opt-in)

### What the pre-commit hook runs

Executes `npx lint-staged` on staged files only. Specifically:

- `*.{ts,tsx}`: `eslint --fix` then `prettier --write`
- `*.{md,yaml,yml,json}`: `prettier --write`

**What it does NOT run:** `tsc --noEmit` (too slow for pre-commit), tests.

### How to disable temporarily

```sh
HUSKY=0 git commit -m "your message"
```

This skips all husky hooks for that commit. Use sparingly — CI will still catch lint errors.

### Evaluation timeline

- **Sprint 1:** prototype, opt-in. No enforcement.
- **Retro Sprint 1:** team votes: adopt mandatory, iterate, or drop.
- **Sprint 2 (if adopted):** mandatory + possibly add typecheck gate.

### Deps (pinned)

| Package       | Version |
| ------------- | ------- |
| `husky`       | 9.1.7   |
| `lint-staged` | 16.4.0  |

---

## WP Conformance Harness

### What it does

Validates that every post response from the NodePress API conforms to the WP REST API v2 **contract** — shape, field types, divergence boundaries, and pagination headers. This is a layer above Carmen's routing/auth tests: those verify that endpoints exist and return correct HTTP codes; the harness verifies that the JSON payload is WP-compatible.

The harness is built around three pure validator functions (`contract.ts`) that throw descriptive errors (`Missing field \`date\` in post response`) rather than opaque matcher diffs. Any regression in `serialize.ts` or a new endpoint that omits a required field will surface here.

Divergences covered:

| ID      | What is checked                                                                                              |
| ------- | ------------------------------------------------------------------------------------------------------------ |
| DIV-001 | `date_gmt` and `modified_gmt` must NOT appear in responses (ADR-006)                                         |
| DIV-002 | `title`, `content`, `excerpt` must be `{rendered: string, protected: boolean}` objects — never plain strings |
| DIV-003 | `featured_media`, `comment_status`, `ping_status`, `format`, `sticky`, `template` must be absent (ADR-007)   |
| DIV-005 | `_nodepress` namespace must be present with `type`, `menu_order`, `parent_id`, `meta` sub-fields             |

### When it runs

Integrated into the default `npm test` / `npx vitest run` at the project root.
It lives in `packages/server/src/__tests__/wp-conformance/` and is picked up by the root vitest workspace config automatically.

To run only the conformance harness:

```sh
npx vitest run packages/server/src/__tests__/wp-conformance/
```

To add a script alias in `package.json`:

```json
"test:conformance": "vitest run packages/server/src/__tests__/wp-conformance/"
```

### How to add a new endpoint to the harness

1. Add a fixture (or reuse one) from `fixtures.ts` that represents the full expected WP response shape.
2. Register a mock route in `post.contract.test.ts` `beforeAll` that returns the fixture.
3. Write a test using `assertPostShape` or a new `assertXxxShape` function in `contract.ts`.
4. If the new endpoint introduces a documented divergence, add a regression test block with the DIV id in the test name.
5. If the shape differs from `WpPost` (e.g., a different resource type), extend `contract.ts` with a new validator function following the same pattern: pure function, descriptive error messages, no Jest matchers.

---

## ESLint config extension

Config file is `eslint.config.mjs` (renamed from `.js` on 2026-04-17). Root `package.json` has no `"type": "module"` on purpose — keeping it absent avoids flipping the default for any future root-level `.js` tooling script. The `.mjs` extension is explicit and surgical: ESLint auto-detects flat config from `.mjs`, and Node stops emitting `MODULE_TYPELESS_PACKAGE_JSON` on lint runs.

---

## Real-DB Integration Tests (#28)

Tests that exercise the full HTTP → Drizzle → Postgres stack using real data.
Run against an ephemeral Postgres container via Testcontainers.

### What they cover

- `GET /wp/v2/posts` — empty list + pagination headers; seeded publish post with DIV-002/005 shape
- `GET /wp/v2/posts/:id` — 404 for missing; full shape with DIV-001 (no `date_gmt`) and DIV-005 (`_nodepress`)
- `POST /wp/v2/posts` — creates row in DB, returns 201 + WP shape; 400 on duplicate slug
- `PUT /wp/v2/posts/:id` — updates title in DB, response reflects change
- `DELETE /wp/v2/posts/:id` — soft delete (status=trash) and hard delete (force=true, row gone)

### How to run

Requires Docker running locally.

```sh
npm run test:integration
```

This sets `DOCKER_AVAILABLE=true` and runs only `*.real-db.test.ts` files via a dedicated Vitest config (`packages/server/vitest.integration.config.ts`), isolated from the workspace to avoid picking up all package tests.

### How it works

1. `@testcontainers/postgresql` boots a `postgres:16-alpine` container.
2. The migration SQL (`packages/db/drizzle/0000_auto-generated-plugin-registry.sql`) is applied directly via `pg` client.
3. `vi.doMock('@nodepress/db', ...)` swaps the module's `db` export to point at the test container pool before any handler imports.
4. `vi.resetModules()` + re-mock flushes the module cache so handlers pick up the swapped db.
5. After each test, `truncateAll()` resets all tables. After the suite, `teardownTestDb()` stops the container.

### CI without Docker

Do not run `npm run test:integration` in CI environments without Docker.
The default `npm test` excludes `*.real-db.test.ts` via `packages/server/vitest.config.ts`.
These tests are intended for local pre-merge validation and developer confidence only.

### File locations

| File                                                               | Purpose                                                             |
| ------------------------------------------------------------------ | ------------------------------------------------------------------- |
| `packages/server/src/__tests__/helpers/db.ts`                      | `setupTestDb()`, `truncateAll()`, `teardownTestDb()`, `getTestDb()` |
| `packages/server/src/__tests__/helpers/setup-integration.ts`       | Vitest setupFile — sets dummy DATABASE_URL before module load       |
| `packages/server/src/routes/posts/__tests__/posts.real-db.test.ts` | 9 real-DB tests (5 endpoints × ~2 tests each)                       |
| `packages/server/vitest.integration.config.ts`                     | Dedicated config — no workspace, correct include/exclude            |
| `packages/server/vitest.config.ts`                                 | Default server config — excludes `*.real-db.test.ts`                |
