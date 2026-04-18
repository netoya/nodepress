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

| Package         | Stmts | Branches | Funcs | Lines | Mode                     |
| --------------- | ----- | -------- | ----- | ----- | ------------------------ |
| `packages/core` | 90%   | 90%      | 90%   | 90%   | Enforced (non-zero exit) |
| All others      | —     | —        | —     | —     | Informative only         |

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

**Status: NOT configured. Decision deferred to Sprint 2.**

Candidates to evaluate: `husky` + `lint-staged` (lint only changed files), `tsc --noEmit`.

Flag for Sprint 2 planning: Should pre-commit block on `eslint` errors? On `tsc` errors? Or warn-only?
Bring to team retro before implementing — hooks affect all devs and need consensus.

---

## ESLint config extension

Config file is `eslint.config.mjs` (renamed from `.js` on 2026-04-17). Root `package.json` has no `"type": "module"` on purpose — keeping it absent avoids flipping the default for any future root-level `.js` tooling script. The `.mjs` extension is explicit and surgical: ESLint auto-detects flat config from `.mjs`, and Node stops emitting `MODULE_TYPELESS_PACKAGE_JSON` on lint runs.
