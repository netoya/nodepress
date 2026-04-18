/**
 * @nodepress/cli — public type contract.
 *
 * Declarative surface for the NodePress CLI. Implementation is scoped for
 * Sprint 2+ (see ADR-010). This file contains types only — no runtime logic.
 *
 * The CLI is the operator-facing entry point: serve the HTTP app, run
 * migrations, seed fixtures, manage plugins, import from WordPress, port a
 * PHP plugin to a TS scaffold. It mirrors WP-CLI semantics where it makes
 * sense without being bound to its command structure (ADR-001 § Stack).
 *
 * ## Design notes
 *
 * - Commands are registered, not hard-coded. A plugin-provided command is a
 *   first-class extension point (aligned with ADR-004 § PluginContext). The
 *   registration API is deliberately decoupled from any specific argv parser
 *   so that we can swap the parser (commander, yargs, bespoke) without
 *   breaking downstream registrations. Parser choice is an Open Question in
 *   ADR-010.
 * - Handlers return a numeric exit code. The CLI entry point forwards it to
 *   `process.exit`. A rejected promise or thrown error maps to exit code 1
 *   with a structured error log.
 * - Arguments and options are typed per command. The generics on
 *   {@link Command} let each command declare its own shape so registrations
 *   are type-safe end to end.
 */

// ---------------------------------------------------------------------------
// Command contract
// ---------------------------------------------------------------------------

/**
 * Positional arguments parsed from argv. Key order is preserved from the
 * command definition; values are strings as received from the shell.
 *
 * Commands that need stronger typing should parse and validate inside their
 * own handler — the CLI framework does not coerce.
 */
export type CommandArgs = Readonly<Record<string, string>>;

/**
 * Named options (flags) parsed from argv.
 *
 * Values are the raw strings from argv, `true` for boolean flags present
 * without a value, or `undefined` when the option is not provided.
 */
export type CommandOptions = Readonly<
  Record<string, string | boolean | undefined>
>;

/**
 * Exit code returned by a command handler. The CLI entry point forwards this
 * value to `process.exit`. Conventionally: `0` = success, non-zero = failure.
 */
export type ExitCode = number;

/**
 * A single CLI command.
 *
 * @typeParam A - Shape of positional arguments. Defaults to {@link CommandArgs}.
 * @typeParam O - Shape of named options. Defaults to {@link CommandOptions}.
 */
export interface Command<
  A extends CommandArgs = CommandArgs,
  O extends CommandOptions = CommandOptions,
> {
  /**
   * Command name as typed by the user. Supports nested names via
   * whitespace, e.g. `"plugin install"`. Names must be unique per registry.
   */
  readonly name: string;

  /** One-line description rendered by `--help`. */
  readonly description: string;

  /**
   * Optional usage string shown in detailed help, e.g.
   * `"plugin install <slug> [--activate]"`. When omitted, the registry
   * derives a minimal usage line from {@link name}.
   */
  readonly usage?: string;

  /**
   * Execute the command. Implementations should avoid calling `process.exit`
   * directly — return an {@link ExitCode} instead so the entry point can
   * perform ordered shutdown (close DB pools, flush logs, etc.).
   */
  handler(args: A, opts: O): Promise<ExitCode> | ExitCode;
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

/**
 * Central registry for CLI commands. The concrete implementation discovers
 * built-in commands at startup and exposes `register` for plugin-provided
 * extensions (ADR-004 § PluginContext — same contribution pattern).
 *
 * Implementations must enforce name uniqueness; duplicate registrations
 * should throw with a message that points at the conflicting registration
 * site.
 */
export interface CommandRegistry {
  /**
   * Register a command. Throws if a command with the same name is already
   * registered. Registrations are order-independent; help output sorts
   * alphabetically.
   */
  register(cmd: Command): void;

  /**
   * Look up a command by its registered name. Returns `undefined` when the
   * name is not registered. Consumers should not rely on reference equality
   * with the original registration.
   */
  get(name: string): Command | undefined;

  /**
   * Snapshot of all registered commands. Order is implementation-defined but
   * stable within a single process lifetime — typically alphabetical by
   * {@link Command.name}.
   */
  list(): readonly Command[];

  /**
   * Parse `argv` (minus the `node` and script entries), dispatch to the
   * matching command, and resolve with its exit code. Unknown commands
   * resolve with exit code `1` after printing the help summary.
   *
   * `argv` defaults to `process.argv.slice(2)` in the CLI entry point; the
   * method accepts it explicitly so it can be tested in isolation.
   */
  run(argv: readonly string[]): Promise<ExitCode>;
}

// ---------------------------------------------------------------------------
// Planned commands (Sprint 2+ — types only)
// ---------------------------------------------------------------------------

/**
 * Catalogue of command names planned for Sprint 2+. Kept as a string literal
 * union so built-in command modules can reference the exact name and the
 * compiler flags typos at registration time.
 *
 * | Name             | Purpose                                                        |
 * | ---------------- | -------------------------------------------------------------- |
 * | `serve`          | Boot the Fastify server (delegates to `@nodepress/server`).    |
 * | `migrate`        | Run pending Drizzle migrations.                                |
 * | `seed`           | Apply development seed data.                                   |
 * | `plugin install` | Install a plugin from the filesystem or registry.              |
 * | `plugin build`   | Compile a plugin's TypeScript sources to CJS (ADR-004).        |
 * | `import-wp`      | Import posts/terms/users from a WordPress MySQL dump.          |
 * | `user`           | Administer users (create, assign role, reset password).        |
 * | `port-plugin`    | Generate a TS scaffold from a PHP plugin (ADR-003 § Migration).|
 */
export type BuiltinCommandName =
  | "serve"
  | "migrate"
  | "seed"
  | "plugin install"
  | "plugin build"
  | "import-wp"
  | "user"
  | "port-plugin";
