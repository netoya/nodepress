# Contributing to NodePress

Thank you for your interest in contributing! This guide covers everything you need to get started.

## Contributor License Agreement (CLA)

**Before your first pull request can be merged, you must sign our CLA.**

NodePress uses a dual license model (GPL-3.0 community + commercial). The CLA grants the project the right to distribute your contributions under both licenses. CLA Assistant will prompt you automatically when you open a PR.

If you have questions about the CLA, open an issue with the label `cla-question`.

## Getting Started

### Prerequisites

- Node.js ≥ 20
- Docker + Docker Compose (for PostgreSQL)
- Git

### Setup

```bash
git clone https://github.com/netoya/nodepress.git
cd nodepress
npm install
cp .env.example .env
docker-compose up -d
npm run dev
```

### Running tests

```bash
npm test                    # all packages
npm test -- --project=core  # single package
```

## Workflow

We follow trunk-based development with short-lived feature branches.

### Branch naming

```
feat/<short-description>
fix/<short-description>
docs/<short-description>
chore/<short-description>
```

### Commit messages

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(core): add filter priority support
fix(server): correct pagination offset calculation
docs: update CONTRIBUTING with CLA instructions
```

### Pull Requests

1. Fork the repo and create a branch from `main`
2. Make your changes — keep PRs focused (one concern per PR)
3. Ensure `npm test` and `npm run lint` pass locally
4. Open a PR — CLA Assistant will prompt you to sign if you haven't
5. A CODEOWNER will review within 48 hours (see [CODEOWNERS](.github/CODEOWNERS))

Fill in the PR template — the DoD checklist is there for a reason.

## Code Standards

- **Language:** TypeScript strict — no `any`, no `@ts-ignore` without explanation
- **Comments:** English. Explain the _why_, not the _what_
- **Tests:** Vitest. New features require tests. Bug fixes require a regression test
- **Formatting:** Prettier + ESLint (configured in `eslint.config.mjs`). Run `npm run lint` before pushing

## Package Structure

| Package                 | Owner          | Description                     |
| ----------------------- | -------------- | ------------------------------- |
| `packages/core`         | @netoya/roman  | Hook system (actions + filters) |
| `packages/plugin-api`   | @netoya/roman  | Plugin registration API         |
| `packages/server`       | @netoya/ingrid | REST API (WP-compatible)        |
| `packages/db`           | @netoya/ingrid | Drizzle ORM schema + migrations |
| `packages/cli`          | @netoya/roman  | CLI (`nodepress` command)       |
| `packages/theme-engine` | @netoya/roman  | Theme rendering engine          |
| `admin/`                | @netoya/lucas  | React admin panel               |

See [CODEOWNERS](.github/CODEOWNERS) for review requirements per path.

## Reporting Issues

- **Bugs:** Open a GitHub Issue with the `bug` label. Include NodePress version, Node version, and reproduction steps
- **Security vulnerabilities:** Do **not** open a public issue. Email **security@nodepress.dev** (pending) or use GitHub's private security reporting
- **Feature requests:** Open an issue with the `enhancement` label. Describe the use case, not just the solution

## Questions

- Open a Discussion on GitHub for general questions
- Issues are for bugs and tracked work — not questions

---

_NodePress — GPL-3.0-or-later (community) · Commercial License available_
_See [docs/business/licensing.md](docs/business/licensing.md) for licensing rationale._
