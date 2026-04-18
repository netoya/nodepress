# ADR-014: Developer Quickstart Invariant

- **Status:** Accepted
- **Date:** 2026-04-18
- **Author:** Román (Tech Lead)
- **Related:** ADR-001 (Architecture Overview — NodeNext ESM), ADR-002 (Folder Structure — monorepo workspaces)

## Sign-off

- **2026-04-18 — Román (Tech Lead):** CI `smoke-fresh-clone` operativo en `main`, TTFA <5 min validado post-mortem. Invariante activo y verificable en todo commit futuro sobre `main`.

## Context

On 2026-04-18, commit `e1b7fbf` ("fix(db+server): auto-load .env + drizzle-kit works with NodeNext") restored the ability to boot NodePress from a clean clone. The fix was correct; the fact that it was needed is the problem. Seven distinct errors surfaced in sequence when a developer cloned the repo fresh and followed the README: `.env` not auto-loaded, `drizzle-kit` failing to resolve `.js` extensions under NodeNext, `drizzle.config.ts` pointing at a barrel file that CJS could not traverse, `packages/db` missing `dotenv`/`tsx`, the server boot not loading `.env` defensively, manually hand-written migrations leaving no journal, and `drizzle:generate` silently unusable. None of these were caught by CI during the two days the repo was broken. The 108 passing tests ran against mocks; the real boot path was never exercised end-to-end. The post-mortem diagnosed the failure as systemic, not personal.

The architectural root is that ADR-001 (NodeNext ESM) and ADR-002 (monorepo workspaces) did not contemplate the CJS-only tooling corner of the stack (drizzle-kit, vitest config loaders, some ESLint plugins) nor the invariant that the repo must actually boot. NodeNext was adopted for runtime correctness; it was never validated operationally against the tools that run outside the runtime. The three tsconfig fixes during Sprint 0 were a recurring signal that was treated as isolated bugs rather than a pattern. The second, tactical root is that the hand-written `plugin_registry.sql` migration in Sprint 0 silenced the symptom at the cost of invalidating the Drizzle snapshot format — once that contract was broken, every subsequent `drizzle-kit` invocation failed in a way that the in-repo developers did not see because their `.env` was already warm and their `node_modules` already installed.

The false confort of "CI verde" is the lesson we pay for. A green build that only exercises mocks and pre-warmed environments does not certify that the system is real. For an open-source project whose adoption depends on external CTOs cloning the repo and reaching a working `curl` in under five minutes, the boot path is the product.

## Decision

We adopt a single, testable, CI-enforced invariant. The invariant is the contract; every other mechanism in this ADR exists to keep it honest.

> **At any commit on the `main` branch, the following flow completes with no manual intervention beyond what is shown:**
>
> ```bash
> git clone <repo>
> cd nodepress
> cp .env.example .env
> docker-compose up -d
> npm install
> npm run db:drizzle:push
> npm run build --workspace=packages/db
> npm run dev
> curl http://localhost:3000/wp/v2/posts
> # expected: [] (HTTP 200)
> ```
>
> **Target:** TTFA (Time to First API Call) < 5 minutes on a clean machine with warm Docker image cache.

TTFA is the operational metric. It is measured from `git clone` to the first HTTP 200 from `/wp/v2/posts`. A breach is any commit on `main` for which the flow above does not complete, or for which TTFA exceeds 5 minutes on reference hardware.

## Alternatives Considered

### A. `moduleResolution: "bundler"`

Eliminates the `.js` extension sufix in imports that NodeNext requires, which in turn would have prevented two of the seven errors in `e1b7fbf`.

**Discarded because:**

- `bundler` resolution breaks `node dist/index.js` direct invocation, which is how the server actually runs in production and in our Docker image.
- It silently forces a bundler onto consumers of `@nodepress/core` and `@nodepress/plugin-api`, including plugin authors we want to reach with a zero-build workflow (Sprint 3+).
- The `.js` sufix is a real ESM contract. The fix is to teach tooling about it (via `--import tsx` for CJS corners), not to hide it.

### B. Keep CI mockeado, add a README section

Status quo with a written warning. Cheapest to adopt.

**Discarded because:**

- The status quo is what failed. `e1b7fbf` proved that two days of green CI and a README are not enough.
- An invariant that lives in prose and not in CI is an aspiration, not a contract.

### C. A `scripts/quickstart.sh` bash script in the README

Guides the developer step-by-step and exits non-zero on the first failure.

**Discarded as a replacement, kept as a companion:**

- A script mitigates discoverability but does not enforce correctness across commits — a PR can still break the invariant silently if nobody runs the script.
- We keep the script as an instruction for humans (`npm run quickstart` is a scoped Sprint 2 ticket), but the enforcement lives in CI and in the PR protocol, not in the script.

## Consequences

### Positive

- **Zero-friction onboarding.** Any external developer or CTO can clone the repo and reach a working API call in under five minutes. Open-source adoption becomes viable.
- **Invariant is verifiable.** "Does `main` boot?" has a boolean answer every commit, not a subjective one.
- **Teaches the team to reason about operational correctness.** The invariant makes "this only works on my machine" an explicit protocol violation, not a shrug.
- **TTFA becomes a product metric.** Martín's burndown surfaces regressions in developer experience before they accumulate.

### Negative

- **CI wall-clock time grows by ~2 minutes per PR that touches tooling.** The `smoke-fresh-clone` workflow brings up Postgres, installs from a cold cache, runs `drizzle:push`, boots the server, and hits the endpoint. Acceptable price; isolated to the PRs that can break the invariant.
- **Postgres as a CI service dependency.** The workflow relies on a `services: postgres:` block in GitHub Actions. Failure modes include Docker Hub rate limiting and Postgres boot timeouts. Helena owns the workflow hardening.
- **Fresh-clone smoke work added to the human reviewer path.** PRs touching certain paths (§ Enforcement below) require the author to paste a fresh-clone smoke test output in the PR body. It is friction by design — the friction is the signal that the change is risky.

### Neutral

- **The `NODE_OPTIONS="--import tsx"` workaround for CJS tooling (introduced in `e1b7fbf`) is documented as an explicit contract, not a hack.** Every future tooling script that must bridge NodeNext and CJS follows the same pattern.
- **`drizzle:push` remains production-tech-debt.** Recovering `drizzle:generate + migrate` with a committed journal is a named Sprint 2 ticket. This ADR does not re-open that decision; it only records that the current state is known and scoped.

## Enforcement

The invariant is protected by three mechanisms, each addressing a different failure mode:

1. **CI job `smoke-fresh-clone`** (Helena, Sprint 1 week 2 hotfix, separate workflow from the main test matrix). Runs on every PR that modifies any path in the scope list below, and on every push to `main`. Executes the flow verbatim against a clean checkout and asserts the `curl` response. Hard fail → merge blocked. Hotfix deadline: Wednesday 2026-04-22, before the CLA Assistant session on Thursday 2026-04-23.
2. **Contributing guide rule R-5** (see `docs/guides/contributing.md` § Quickstart Invariant Protocol). Any PR that touches the scope list must include a fresh-clone smoke test output in the PR body. Reviewers block PRs that lack the documented smoke.
3. **TTFA in the weekly burndown** (Martín, from Monday 2026-04-21). Regressions in TTFA are surfaced in GitHub Discussions alongside velocity. A sustained TTFA > 5 min opens a ticket automatically.

### Scope of files that can break the invariant

The following paths are the surface area that has historically or by design touched the boot contract. A change to any of them triggers both the CI `smoke-fresh-clone` job and the R-5 PR smoke requirement:

- `packages/db/**` — schema, client, migrations, drizzle config wrappers.
- `drizzle.config.ts` — any variant at the repo root or in `packages/db`.
- `tsconfig*.json` — base and per-package overrides. The three Sprint 0 tsconfig fixes were the recurring signal we ignored.
- `package.json` — only the tooling scripts (`dev`, `build`, `db:*`, `quickstart`). Dependency bumps in unrelated packages do not trigger.
- `.env.example` — any variable added or renamed affects the smoke.
- `docker-compose.yml` — Postgres service definition is part of the invariant.
- `packages/server/src/index.ts` — server boot, `.env` loading, Fastify registration order.

Changes to test files, documentation, ADRs, or admin-only packages (`packages/admin/**`) do not trigger, since they cannot break the server boot contract.

## Rollback

The invariant can be rolled back trivially if it proves unworkable.

- **Revert path:** `git revert` of this ADR + removal of the CI workflow + deletion of the R-5 section in contributing.md. No code depends on the invariant's existence — it is a process contract, not a runtime artifact.
- **Partial rollback:** if only the PR-body smoke requirement (R-5) proves too heavy, keep the CI job and relax the human protocol. The CI job alone catches 5 of the 7 failure classes from `e1b7fbf`; the PR smoke catches the remaining 2 (e.g., first-time Docker pulls, cold `npm install` timing).

## References

- Commit `e1b7fbf` — `fix(db+server): auto-load .env + drizzle-kit works with NodeNext` (2026-04-18). Generating incident.
- [ADR-001: Architecture Overview](./001-architecture-overview.md) — NodeNext ESM decision that did not contemplate CJS tooling.
- [ADR-002: Folder Structure](./002-folder-structure.md) — monorepo workspaces.
- Post-mortem note in `.claude/memory/agents/tech-lead-roman/project_memory.md` § Meet 2026-04-18 (noche).
- Contributing rule R-5 in `docs/guides/contributing.md` § Quickstart Invariant Protocol — operationalises this ADR.
