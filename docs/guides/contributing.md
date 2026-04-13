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

_Last updated: 2026-04-09 — decisions from the workflow meeting (Tomás, Román, Martín)._
