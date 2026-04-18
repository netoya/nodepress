# Contributing to NodePress

> Decisions documented here were made on 2026-04-09. See ADRs for architecture decisions.

---

## Table of Contents

1. [Git Flow](#git-flow)
2. [Branch Naming](#branch-naming)
3. [Pull Request Policy](#pull-request-policy)
4. [Definition of Done](#definition-of-done)
5. [Commit Convention](#commit-convention)
6. [Ceremonies](#ceremonies)
7. [Architecture Decision Records](#architecture-decision-records)
8. [Contract Freeze Protocol (R-2)](#contract-freeze-protocol-r-2)
9. [Quickstart Invariant Protocol (R-5)](#quickstart-invariant-protocol-r-5)
10. [Hotfix vs Scope Freeze Protocol (R-6)](#hotfix-vs-scope-freeze-protocol-r-6)

---

## Git Flow

NodePress uses **trunk-based development** (simplified).

- `main` is always green. It is a protected branch — no direct pushes.
- All work happens on short-lived branches cut from `main`.
- Branches must be merged or abandoned within **3 days**. If a branch lives longer, it needs a review from Román before continuing.
- **Squash merge** is the only merge strategy. One PR = one commit on `main`.
- There are no `develop` or `release` branches until the project reaches beta.

### Rationale

Trunk-based development keeps integration pain minimal and `main` always deployable. Long-lived branches are a symptom of work that is too large — break it down.

---

## Branch Naming

| Type             | Pattern                          | Example                       |
| ---------------- | -------------------------------- | ----------------------------- |
| Feature          | `feat/NP-XXX-short-description`  | `feat/NP-042-hook-registry`   |
| Bug fix          | `fix/NP-XXX-short-description`   | `fix/NP-107-filter-priority`  |
| Spike / research | `spike/NP-XXX-short-description` | `spike/NP-015-php-wasm-bench` |

- `NP-XXX` maps to the GitHub issue number.
- Use lowercase kebab-case for the description.
- Keep descriptions short (3–5 words max).

---

## Pull Request Policy

### Review requirements

Every PR requires at least **one approving review** from a team member who is not the author.

**Tiered review — critical packages require Román's approval:**

| Package               | Reviewer required     |
| --------------------- | --------------------- |
| `packages/core`       | Román (mandatory)     |
| `packages/plugin-api` | Román (mandatory)     |
| All other packages    | Any peer (1 approval) |

### Size limit

**Maximum 400 lines of code changed per PR**, excluding test files. PRs that exceed this limit will be returned to the author for splitting.

If a feature genuinely cannot be split (rare), open a discussion with Román before submitting.

### Stale reviews

If a PR has no review after **2 days**, Tomás escalates it in the next daily update. Do not let reviews block others — reviewing is part of the work.

### PR checklist

Before requesting review, confirm:

- [ ] Branch is up to date with `main`
- [ ] All CI checks pass
- [ ] The PR description links to the GitHub issue (`Closes NP-XXX`)
- [ ] Definition of Done criteria are met (see below)
- [ ] LOC delta is within the 400-line limit

---

## Definition of Done

A task is done when all of the following are true:

1. **TypeScript strict** — zero type errors (`npx tsc --noEmit`)
2. **Tests pass** — Vitest covers the happy path; hook ordering tests are required if the change touches the hook system
3. **Linter and formatter are green** — `npx eslint .` and `npx prettier --check .` exit 0
4. **PR approved** — at least one reviewer has approved (tiered rules above apply)
5. **REST endpoint compatibility** — if the change adds or modifies a REST endpoint, an integration test verifying WP REST API v2 compatibility is included
6. **No circular dependencies** — `packages/core` must not import from `packages/db` or any higher-level package. Verified with `npx madge --circular`
7. **Clean-clone smoke test** — if the PR touches tooling paths (`packages/db/**`, `drizzle.config.ts`, `tsconfig*`, `.env.example`, `docker-compose*`), a clean-clone smoke test must be executed and its output documented in the PR body. See [Quickstart Invariant Protocol (R-5)](#quickstart-invariant-protocol-r-5).

---

## Commit Convention

NodePress uses [Conventional Commits](https://www.conventionalcommits.org/). All commits must be in **English**.

### Format

```
<type>[(scope)]: <short description>

[optional body]

[optional footer: Closes NP-XXX]
```

### Types

| Type       | When to use                                 |
| ---------- | ------------------------------------------- |
| `feat`     | New feature or capability                   |
| `fix`      | Bug fix                                     |
| `chore`    | Maintenance, dependencies, config           |
| `docs`     | Documentation only                          |
| `test`     | Adding or updating tests                    |
| `refactor` | Code restructuring without behaviour change |

### Scope (optional)

Use the package or area affected: `core`, `db`, `server`, `plugin-api`, `admin`, `cli`, `theme-engine`.

### Examples

```
feat(core): implement HookRegistry with priority ordering
fix(plugin-api): prevent filter from returning undefined on sync wrap
chore: upgrade Vitest to 2.1.0
docs(guides): add contributing guide
test(core): add hook ordering integration tests
refactor(db): extract connection pool to separate module
```

Since we squash on merge, the squashed commit message should follow this format. PRs with a descriptive title that matches the convention make squashing straightforward.

---

## Ceremonies

All ceremonies are kept lightweight. This is a PoC-stage project — we optimize for output over process.

### Daily (async)

- **Format:** GitHub issue comment (not a call)
- **Deadline:** Before 10:00 each workday
- **Template:**
  ```
  Yesterday: ...
  Today: ...
  Blocked: ... (or "nothing")
  ```
- If blocked, tag the person who can unblock. Do not wait for the next ceremony.

### Sprint Planning

- **When:** Start of each sprint
- **Duration:** 1 hour (synchronous)
- **Output:** Sprint issues populated in GitHub Projects, each with owner and estimate

### Sprint Review

- **When:** End of each sprint
- **Duration:** 30 minutes
- **Format:** Demo of completed work + update `PROJECT_STATUS.md` in the root of the repo

### Retrospective

- **When:** Immediately after Sprint Review
- **Duration:** 45 minutes
- **Format:** Start / Stop / Continue — three items per category, actionable outcomes only

---

## Architecture Decision Records

An ADR is **required** for any decision that affects more than one module or package.

### When to write one

- Choosing or replacing a dependency
- Changing a cross-cutting pattern (error handling, auth, plugin lifecycle)
- Introducing a new architectural boundary
- Deciding not to support something that was previously considered

If in doubt, write the ADR. A short ADR that turns out to be unnecessary costs less than a missing ADR that causes confusion six weeks later.

### Format

```markdown
# ADR-NNN: Title

**Status:** Draft | Accepted | Superseded by ADR-NNN
**Date:** YYYY-MM-DD
**Author:** Name

## Context

What problem are we solving? What constraints exist?

## Decision

What did we decide?

## Consequences

What does this enable? What does it rule out or make harder?
```

### Location

ADRs live in `docs/adr/NNN-title.md`. Use zero-padded three-digit numbers (`001`, `002`, ...).

### Immutability

Once an ADR is accepted, it is **immutable**. Do not edit it. If a decision changes, write a new ADR with status `Supersedes ADR-NNN` and update the old ADR's status line to `Superseded by ADR-NNN`.

---

## Issue and Project Tracking

- **GitHub Projects** is the single source of truth for task tracking.
- Every branch maps to an issue (`NP-XXX`).
- Issues use labels for package: `core`, `db`, `server`, `plugin-api`, `admin`, `cli`.
- Each sprint has a milestone. Velocity is tracked from Sprint 0.
- Do not use external tools (Notion, Linear, etc.) until we have four sprints of data and a demonstrated need.

---

## Contract Freeze Protocol (R-2)

> Adopted 2026-04-18 after Sprint 1 day 1 experience. Formalises a practice the team was already running.

When two or more tickets share public types, both owners need to agree on those types **before** either starts coding. This 30-minute session is the mechanism for that agreement.

### When to trigger

A contract-freeze session is required when any of the following is true:

- Two or more open tickets share public types (interfaces, API signatures, event payloads).
- A new package exposes an API consumed by another package within the same sprint.
- A PR modifies a type that an already-accepted ADR depends on.

If unsure, lean toward triggering. A 30-minute alignment costs less than a mid-sprint interface mismatch.

### How it runs

- **Duration:** 30 minutes, hard stop.
- **Participants:** Leads of the affected packages + Tech Lead as facilitator.
- **Output:** One committed file — a types definition file or an ADR draft — that both sides sign off on before either starts implementation.
- **Format:** Async-first (GitHub Discussion or Slack thread). Escalate to a sync call if no agreement after 24 hours.

### What "frozen" means

- The contract cannot change without a new freeze session or a new ADR.
- PRs that violate the frozen contract are blocked in review until the contract is renegotiated.
- The contract file path must appear in the description of every ticket that depends on it.

### Anti-patterns

- Designing the contract while implementing the first ticket — this breaks parallel delivery.
- Delegating the contract to whoever starts first.
- Skipping the session because the contract "seems obvious." Obvious contracts still benefit from 30 minutes of shared understanding.

### Historical examples

| Date       | Contract                                | Participants   | Outcome                                  |
| ---------- | --------------------------------------- | -------------- | ---------------------------------------- |
| 2026-04-17 | `HookEntry` + `PluginContext.addHook()` | Román + Ingrid | Unblocked parallel delivery of #14 + #19 |

---

## Quickstart Invariant Protocol (R-5)

> Adopted 2026-04-18 after the e1b7fbf post-mortem. Enforces ADR-014.

Any PR that touches the following paths requires a **fresh-clone smoke test** documented in the PR body:

- `packages/db/**`
- `drizzle.config.ts`
- `tsconfig*.json`
- `package.json` scripts for tooling
- `.env.example`
- `docker-compose.yml`
- `packages/server/src/index.ts`

### What "fresh-clone smoke test" means

From a throwaway working copy (not your main clone):

```bash
git worktree add /tmp/nodepress-smoke <your-branch>
cd /tmp/nodepress-smoke
cp .env.example .env
docker-compose up -d
npm install
npm run db:drizzle:push
npm run build --workspace=packages/db
npm run dev &
sleep 10
curl -sSf http://localhost:3000/wp/v2/posts
kill %1
git worktree remove /tmp/nodepress-smoke
```

### PR body format

Paste the output under a section titled `## Fresh-clone smoke`. Include:

- `$ curl ...` command + response.
- Total wall-clock time from `git worktree add` to `curl` success.

### Anti-patterns

- "Works on my main clone" — irrelevant. A hot env hides 6 of 7 known failure classes.
- "CI passes" — necessary but not sufficient. CI checks the automated path; PR smoke is the human path.
- Skipping the smoke because the change seems unrelated to tooling. Touching `.env.example` to add a variable is enough.

---

## Hotfix vs Scope Freeze Protocol (R-6)

> Adopted 2026-04-18 after the e1b7fbf post-mortem. Clarifies when new work can
> enter a frozen sprint.

### The distinction

**Scope freeze** prevents new features from entering a sprint mid-flight.
Any new ticket requires approval from Martín + Román + Tomás.

**Hotfix** restores a broken invariant that should have held when the sprint
was planned. A hotfix does **not** require scope freeze approval — it
restores what the sprint implicitly promised.

### What qualifies as hotfix

- Quickstart invariant broken (ADR-014): `git clone → docker-compose → npm run dev` fails.
- Main branch CI is red for reasons unrelated to the active ticket.
- A previously-accepted ADR's decision is silently violated by current code.
- Security or data-loss risk discovered in main.

### What does NOT qualify as hotfix (= needs scope freeze approval)

- "While I was here, I also fixed X." — no.
- Test improvements, refactors, rename cleanup — plan for next sprint.
- Adding features under the guise of a fix.

### How it runs

1. Identify the broken invariant explicitly in the PR body.
2. Paste the repro (pre-fix state) + the fix rationale.
3. Merge with a single-reviewer (any lead) — no trio approval required.
4. Post-merge, Tomás logs the hotfix in the sprint's incident log.

### Historical example

- 2026-04-18, commit e1b7fbf: developer quickstart invariant restoration.
  7 errors in a clean clone. Not scope creep — invariant repair.

---

_Last updated: 2026-04-18 — R-6 hotfix vs scope freeze protocol added (Tomás, post-mortem e1b7fbf)._
