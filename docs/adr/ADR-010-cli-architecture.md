# ADR-010: CLI Architecture — `@nodepress/cli`

- **Status:** Proposed
- **Date:** 2026-04-18
- **Author:** Román (Tech Lead)
- **Related:** ADR-001 (Architecture Overview), ADR-002 (Folder Structure), ADR-003 (PHP Compatibility — `port-plugin` command), ADR-004 (Plugin Lifecycle — `plugin build` command)

## Context

NodePress needs an operator-facing CLI that mirrors the ergonomics of `wp-cli` without inheriting its runtime model. The CLI is how an operator boots the server, applies migrations, seeds fixtures, installs plugins, imports from a legacy WordPress site, and scaffolds a TS port from a PHP plugin. Several planned commands are explicit pre-conditions of other roadmap items — `plugin build` gates the Sprint 2 plugin developer experience (ADR-004 § Plugin Compilation), `port-plugin` is the primary WP migration path (ADR-003 § Migration Tooling), and `import-wp` is a named Sprint 2 deliverable.

Sprint 1 left `packages/cli/src/index.ts` as a one-line `export {}` stub. That is deuda latente: every week without a declared shape increases the risk that callers in other packages grow ad-hoc scripts (one-off `tsx` invocations, npm script duplication), which will then need to be reconciled when the real CLI lands. This ADR commits the public type surface now so downstream code can target it without waiting for the implementation.

The implementation itself — argv parser, help renderer, built-in commands — is Sprint 2+ work. This ADR is a scoping document for that work, not a record of shipped behaviour.

## Decision

The CLI is a command registry with per-command handlers. The public types live in `packages/cli/src/types.ts`:

- **`Command<A, O>`** — `{ name, description, usage?, handler(args, opts) => ExitCode | Promise<ExitCode> }`. Generics let each command declare its own argument and option shape; registrations are type-safe end to end.
- **`CommandRegistry`** — `register(cmd)`, `get(name)`, `list()`, `run(argv) => Promise<ExitCode>`. Order-independent registration, name uniqueness enforced, unknown commands resolve with `1` after printing the help summary.
- **`BuiltinCommandName`** — string literal union catalogue of the planned commands: `serve`, `migrate`, `seed`, `plugin install`, `plugin build`, `import-wp`, `user`, `port-plugin`. The union exists now so built-in command modules can reference the exact name and typos surface at registration time.

Rationale for the shape:

- **Handler returns an exit code, not side-effecting `process.exit`.** The entry point is the only place allowed to call `process.exit`, so ordered shutdown (flushing pino, closing the Drizzle pool, releasing the vm.Context sandbox on plugin-bearing commands) happens in one place. This is a direct lesson from how badly legacy wp-cli behaves with long-running handlers.
- **Options and arguments are `Record<string, …>`, not parsed objects.** The CLI framework stays thin; each command parses and validates its own input. That keeps the parser swappable — a decision we explicitly defer (see Open Questions).
- **Plugins can register commands.** The registry's `register` method is the same contribution pattern plugins already use for hooks (ADR-004 § PluginContext). A plugin that ships `wp-content/plugins/foo/index.ts` will be able to add a `nodepress foo-bar` command without touching the CLI package. Implementation of that bridge is Sprint 3+ and depends on the plugin loader (ADR-012).

The skeleton is declarative types only — no argv parser is imported. Adding a parser is a Sprint 2 decision made with empirical data, not a scaffold-time commitment.

## Open Questions

- **Argv parser choice.** Candidates: `commander`, `yargs`, bespoke. The current type surface does not lock us in. Preference: evaluate at Sprint 2 kickoff with a 30-minute spike on `serve` + `plugin install` — the two commands that exercise subcommands and options.
- **Plugin-contributed commands.** The `register(cmd)` API is future-proof for plugin registrations, but the actual binding from `PluginContext` to the CLI registry (is the CLI process aware of active plugins? how does it sandbox them?) is not decided. Expected resolution: ADR bundled with Sprint 3 plugin loader work.
- **Output formatting.** Structured output (`--format=json`) for machine consumers vs. human-readable output. Convention TBD.
- **Config file loading.** Does `nodepress` read a `nodepress.config.ts` at invocation time (ergonomic) or rely on `.env` exclusively (operationally simple)? Leaning toward `.env` for v1, revisit with Helena once production deployments exist.
- **Exit codes catalogue.** A documented table of `ExitCode` values (1 = generic failure, 2 = validation error, 64 = sysexits-style misuse, …) to keep CI scripts stable across releases.

## References

- `packages/cli/src/types.ts` — frozen type surface
- ADR-001 § Stack — CLI positioning, wp-cli ergonomics target
- ADR-002 § cli package layout — command modules under `commands/`
- ADR-003 § Migration Tooling — `port-plugin` command contract (Sprint 2)
- ADR-004 § Plugin Compilation — `plugin build` command contract (Sprint 2)
