/**
 * @nodepress/cli — public entry point.
 *
 * This package currently exposes type contracts only. Runtime implementation
 * (argv parser, built-in commands, help renderer) is scoped for Sprint 2+ per
 * ADR-010. See {@link ./types.js} for the full declarative surface.
 */

export type {
  BuiltinCommandName,
  Command,
  CommandArgs,
  CommandOptions,
  CommandRegistry,
  ExitCode,
} from "./types.js";
