# ADR-015: Tooling Runtime Boundary

- **Status:** Accepted
- **Date:** 2026-04-18
- **Author:** Román (Tech Lead)
- **Related:** ADR-001 (Architecture Overview — NodeNext ESM), ADR-014 (Developer Quickstart Invariant), ADR-017 (Tier 2 Bridge Surface — out of scope here), ADR-018 (Bridge Security Boundary — out of scope here)
- **Issue:** #21
- **Incident:** `e1b7fbf` — quickstart-broken (2026-04-18)

---

## Context

NodePress runs three different kinds of Node.js code against the same monorepo,
and each kind negotiates a different contract with the TypeScript toolchain:

1. **Application runtime.** The server (`packages/server`), the core (`packages/core`),
   the db package (`packages/db`), and every other workspace that ships to
   production. This is what boots behind Fastify, what the Docker image runs,
   and what plugin authors will extend in Sprint 3. Runtime = `node dist/index.js`
   against compiled JavaScript emitted by `tsc --build`, with `"module": "NodeNext"`
   and `"moduleResolution": "NodeNext"` (see `tsconfig.base.json`). Imports carry
   the `.js` suffix as the ESM contract requires.
2. **Developer tooling (CJS corners).** Third-party CLIs the team invokes from
   npm scripts — `drizzle-kit generate`, `drizzle-kit push`, `drizzle-kit migrate`
   today; potentially other legacy tooling tomorrow. These tools either ship as
   CommonJS, load their config file via CJS `require()`, or predate NodeNext
   resolution and cannot resolve a `.ts` file from a `.js`-suffixed import. They
   run as a direct child process of `node` with **no TypeScript awareness** of
   their own.
3. **Developer tooling (TS-aware).** Scripts we own, written in TypeScript,
   executed directly via `tsx` — `packages/db/src/seeds/index.ts`,
   `scripts/smoke-fresh-clone.ts`, etc. These inherit the NodeNext resolution
   contract because `tsx` implements it natively, so they read as regular ESM
   TypeScript without ceremony.

The quickstart incident of 2026-04-18 (commit `e1b7fbf`) proved that ADR-001
did not name this split. ADR-001 specified NodeNext for the runtime; it did
not contemplate the CJS-only corner of the tooling stack. When `drizzle-kit`
is invoked as a plain CJS binary it loads `drizzle.config.ts` via `require()`,
and the moment that config reaches `import * as schema from "./schema/index.js"`,
CJS resolution looks for a literal `schema/index.js` file on disk, fails,
and aborts with "cannot find module". The runtime contract (`.js` suffix) and
the tooling contract (CJS `require()` of `.ts` files) were incompatible, and
neither ADR had named the boundary.

The fix in `e1b7fbf` is textual: prefix every `drizzle-kit` invocation with
`NODE_OPTIONS="--import tsx"`. This installs the `tsx` loader into the child
process, which then transforms `.ts` on the fly and resolves `.js` specifiers
against their `.ts` source. The fix is correct, but it lives as opaque ceremony
in `packages/db/package.json` without a written contract explaining why. This
ADR writes the contract so the next tool the team adds does not need to
rediscover it through the same 45-minute failure cascade.

The boundary this ADR addresses is **tooling only** — the local/CI
developer experience for NodePress itself. It deliberately does not address
the PHP-WASM bridge runtime boundary (Tier 2 JS ↔ PHP interop): that is the
subject of ADR-017 (surface) and ADR-018 (security). Mixing the two would
conflate two orthogonal trade-offs.

---

## Decision

NodePress declares three runtime lanes for TypeScript execution, each with a
named contract. Every npm script, CI step, or developer command falls into
exactly one lane, and the choice is mechanical — not a judgement call.

### Lane A — Application Runtime (Node + NodeNext ESM, compiled)

**Contract:**

- Source: `packages/*/src/**/*.ts`.
- Compiler: `tsc --build` per `tsconfig.base.json` (`module: NodeNext`,
  `moduleResolution: NodeNext`, `outDir: dist`).
- Execution: `node packages/<pkg>/dist/index.js`.
- Imports: ESM with `.js` suffix (e.g. `import { db } from "./client.js"`),
  even when the source is `.ts`. This is the NodeNext ESM contract and is
  non-negotiable — see ADR-001 and ADR-014.
- No loader, no wrapper. The runtime is plain Node.

**Examples:**

- `npm run dev` → `packages/server` transpiles with `tsx` for dev speed, but
  the **production path** is `node dist/index.js` and that must work without
  `tsx` anywhere in the process tree. This is a hard invariant (ADR-014).
- `npm run build` → `tsc --build` across the workspace.

**When to use this lane:** anything that ships to production, anything that
runs inside the Docker image, anything a plugin author will import. If the
code is a `.ts` file that ends up in a published `dist/`, it belongs here.

### Lane B — Developer Scripts (TS-aware via `tsx`)

**Contract:**

- Source: `.ts` files we own — seeds, local scripts, smoke tests, quickstart
  helpers.
- Execution: `tsx <script>.ts` (direct) — never `node <script>.ts`.
- Imports: ESM with `.js` suffix, same as Lane A. `tsx` reads the NodeNext
  resolution and maps `.js` → `.ts` transparently.
- No build step. `tsx` handles transform and resolution in a single pass.

**Examples:**

- `packages/db` scripts: `"seed": "tsx src/seeds/index.ts"`,
  `"reset": "tsx src/seeds/reset.ts"`.
- Root workspace: `"smoke:fresh-clone": "tsx scripts/smoke-fresh-clone.ts"`.

**When to use this lane:** any TypeScript we own whose lifecycle is
"run once, exit" — one-shot scripts, seeds, smoke tests, local dev utilities.
The code is ours, we can assume NodeNext conventions, and `tsx` is the
simplest glue.

### Lane C — CJS-only Third-Party Tooling (Node + `--import tsx`)

**Contract:**

- Tool: a third-party CLI binary that ships as CommonJS, loads its config file
  via `require()`, and has no concept of NodeNext `.js` → `.ts` resolution.
- Execution: `NODE_OPTIONS="--import tsx" <tool> <args>`. The env prefix
  installs the `tsx` loader into the child process **before** the tool's own
  entry point runs, so when the tool calls `require("drizzle.config.ts")`
  the loader is already live and the `.js` imports inside the config resolve
  to their `.ts` sources.
- The wrapper is **declared in `package.json`**, not in README prose or
  developer memory. The npm script is the contract.

**Canonical example (from `packages/db/package.json`):**

```json
{
  "scripts": {
    "migrate": "NODE_OPTIONS=\"--import tsx\" drizzle-kit migrate",
    "drizzle:generate": "NODE_OPTIONS=\"--import tsx\" drizzle-kit generate",
    "drizzle:push": "NODE_OPTIONS=\"--import tsx\" drizzle-kit push"
  }
}
```

**Why this and not something else:**

- The wrapper is transparent to the tool — `drizzle-kit` sees an ordinary
  Node process; the loader is an implementation detail.
- It preserves the NodeNext contract in our own config file
  (`packages/db/drizzle.config.ts` still uses `.js` suffixes for schema
  imports), so the config is readable and future-compatible with any tool
  that does speak NodeNext.
- It contains the blast radius: only the scripts that actually need the
  loader carry the prefix. The server, the build, the tests, the seeds — all
  lanes A and B — stay clean.

**This is not a hack.** It is the named workaround for a named boundary. The
cost is one `NODE_OPTIONS` prefix per affected npm script; the benefit is
that `drizzle.config.ts` reads like every other `.ts` file in the repo and
the runtime contract in ADR-001 is preserved end-to-end.

---

## Rule for Introducing a New Tool

Any contributor adding a new CLI tool, config-driven build step, or automation
script to a `package.json` MUST walk the decision tree before merging:

1. **Is the code I'm adding my own `.ts` file?**
   - **Yes** → Lane B. Script is `tsx path/to/script.ts`. Done.
   - **No** (it's a third-party binary) → continue.

2. **Does the tool ship native ESM + NodeNext resolution support?** (The easy
   way to check: does its config file accept `.ts` with `.js`-suffixed
   imports, or does it only accept `.js`/`.mjs`/`.cjs`?)
   - **Yes** → invoke the tool directly from the npm script. Example: vitest,
     eslint v9, prettier — all of these handle NodeNext today.
   - **No** → continue.

3. **Does the tool accept a JavaScript config file (e.g. `tool.config.js`
   / `.cjs`)?**
   - **Yes** → acceptable if the config is trivial (no imports from the
     workspace). If the config needs to import workspace types or schema,
     prefer step 4 to keep one source of truth.
   - **No**, or workspace imports are needed → step 4.

4. **Apply Lane C:** wrap the invocation in `NODE_OPTIONS="--import tsx"`.
   Add a short comment in the `package.json` or a companion ADR note
   explaining which tool requires it and why. The wrapper lives in the npm
   script, never in developer shell history.

**Gate:** Introducing a new Lane C tool requires a one-paragraph note in the
PR body naming the tool, its CJS/ESM nature, and the chosen lane. This is
lightweight (no new ADR per tool) but non-skippable. R-5 (ADR-014 quickstart
invariant) already requires a fresh-clone smoke for any PR touching tooling
scripts, which independently validates that the wrapper works from a clean
checkout.

---

## Why `drizzle-kit` Requires `--import tsx` — Reference Case

This section exists so the next contributor who debugs a "cannot find module"
error from `drizzle-kit` finds the answer here instead of rediscovering it.

- `drizzle-kit` (v0.30.x) is published as a CommonJS binary.
- It loads the config file (`drizzle.config.ts`) via CJS `require()` against
  a Node process that has no TypeScript transformer registered.
- Our config and every schema file use NodeNext ESM conventions —
  `import * as schema from "./schema/index.js"` resolves against a `.ts`
  file on disk — which CJS `require()` cannot follow.
- `NODE_OPTIONS="--import tsx"` registers the `tsx` ESM loader in the child
  Node process before `drizzle-kit`'s entry point runs. Once live, the
  loader intercepts the config's imports, transpiles `.ts` on demand, and
  maps `.js` specifiers to their `.ts` sources. `drizzle-kit` never sees
  the difference.
- Alternatives considered and rejected: (a) rewriting the config and schema
  as plain JS — breaks the runtime contract and duplicates schema; (b)
  switching `moduleResolution` to `bundler` — rejected in ADR-014 because
  it breaks `node dist/index.js`; (c) using `drizzle-kit`'s upcoming native
  ESM mode — not yet stable, and would be a Lane-A candidate when it ships
  (would drop the `NODE_OPTIONS` prefix automatically at that point).

Expected evolution: when `drizzle-kit` ships native NodeNext support, the
migration is a one-line edit per script (strip the `NODE_OPTIONS` prefix)
plus a smoke-fresh-clone run. No other code changes.

---

## What This ADR Does NOT Cover

To keep the boundary clean, the following are **explicitly out of scope**:

- **PHP-WASM bridge runtime boundary.** The Tier 2 bridge between Node and
  PHP-WASM is a different problem — a cross-language FFI surface, not a
  TypeScript toolchain resolution issue. That boundary is specified by
  **ADR-017 (Tier 2 Bridge Surface)** and **ADR-018 (Bridge Security
  Boundary)**. Confusing the two would muddle both.
- **Worker Threads / async I/O within the runtime.** Those are internal to
  Lane A and covered elsewhere (e.g. ADR-013 for the circuit breaker's
  single-threaded assumption).
- **Plugin author toolchain.** Sprint 3 will introduce a `nodepress plugin
build` command and a plugin compilation pipeline (CJS output for
  vm.Context, per meet 2026-04-09). That pipeline is a Lane A build step
  from the plugin author's perspective; it will be specified when the CLI
  ships and is tracked by ADR-010.
- **Browser-side build tooling** for `admin/` (Vite, esbuild). The admin
  package uses its own bundler that has native TS + NodeNext support; it
  falls into step 2 of the decision tree (direct invocation, no wrapper
  needed) and does not cross the boundary this ADR names.

---

## Consequences

### Positive

- **Every TypeScript invocation in the repo has a named lane.** "Why does
  this script have `NODE_OPTIONS`?" and "Do I need `tsx` here?" become
  mechanical questions with written answers.
- **The runtime contract (ADR-001) is preserved end-to-end.** No `.js`
  aliasing, no `moduleResolution: bundler`, no config duplication. The
  Lane C wrapper is surgical.
- **New tools get a decision tree, not a debugging session.** The 45 minutes
  burned in incident `e1b7fbf` is the ceiling; the next tool costs the time
  to read this ADR.
- **When upstream tooling catches up with NodeNext, the migration is
  trivial.** Strip the prefix, run `smoke:fresh-clone`, ship. No
  architectural unwinding.

### Negative

- **Three lanes is one more concept than "just run the code".** New
  contributors must internalise the split on day one. Mitigated by the
  decision tree and by canonical examples in `packages/db/package.json`.
- **Lane C scripts are slightly slower.** The `tsx` loader adds ~100–200ms
  cold-start. For `drizzle-kit migrate` (seconds) this is noise; for a
  tight loop tool it could matter. No current tool is in a tight loop.
- **The `NODE_OPTIONS` prefix is shell-syntax-sensitive.** Windows
  CMD/PowerShell contributors need `cross-env` or the npm-run-all idiom
  if/when they appear. Noted; not blocking today (team is macOS/Linux).

### Neutral

- **Lane B (tsx direct) and Lane C (NODE_OPTIONS wrapping tsx) use the same
  underlying tool.** The distinction is whether _we_ invoke our own `.ts`
  file directly (Lane B) or whether a third-party CJS tool invokes _its own_
  entry point which then needs to read our `.ts` config (Lane C). Same
  loader, two different integration points.
- **This ADR makes no prediction about `drizzle-kit`'s ESM roadmap.** If it
  ships, great — the migration is a script edit. If it never ships, Lane C
  remains valid indefinitely.

---

## Rollback

This ADR documents a decision already implemented and validated (in
`e1b7fbf` and confirmed by the quickstart invariant in ADR-014). Rolling
back means choosing a different story for the CJS tooling corner:

- **Revert to pre-fix state** (strip `NODE_OPTIONS` from scripts) → the
  quickstart invariant breaks within 24 hours. Rejected by ADR-014.
- **Bundler resolution** → rejected in ADR-014 for breaking
  `node dist/index.js` in production.
- **Hand-written migrations forever** → what Ingrid tried in Sprint 0; it
  was the tactical root cause of `e1b7fbf`. Not a path.

The only real rollback trigger is upstream: if `drizzle-kit` (and any
future Lane C tool) ships native NodeNext support, Lane C collapses into
Lane A / step 2 of the decision tree. At that point this ADR becomes
historical context, not a live constraint. The transition is non-breaking —
strip the prefix, run `smoke:fresh-clone`, commit.

---

## References

- **ADR-001** — Architecture Overview (NodeNext ESM decision).
- **ADR-014** — Developer Quickstart Invariant (operational contract this ADR
  backs architecturally).
- **ADR-017 / ADR-018** — PHP-WASM bridge boundary, explicitly _not_ this
  ADR's scope.
- **Incident post-mortem:** `.claude/logs/20260418-post-mortem-e1b7fbf-quickstart.md`.
- **Fix commit:** `e1b7fbf` — "fix(db+server): auto-load .env + drizzle-kit
  works with NodeNext".
- **Canonical Lane C example:** `packages/db/package.json` — `migrate`,
  `drizzle:generate`, `drizzle:push`.
- **Canonical Lane B example:** `packages/db/package.json` — `seed`, `reset`.
- **Canonical Lane A example:** `packages/server/dist/index.js` — the
  production boot path.
