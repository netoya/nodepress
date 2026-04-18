/**
 * @nodepress/plugin-api — public entry point.
 *
 * This package currently exposes type contracts only. Runtime implementation
 * (manifest validator, vm.Context sandbox loader, lifecycle state machine)
 * is scoped for Sprint 2+ per ADR-012. See {@link ./types.js} for the full
 * declarative surface.
 *
 * Plugin-author facing types (`PluginContext`, `DisposableRegistry`) are
 * re-exported from `@nodepress/core` so consumers have a single import path
 * for writing a plugin or a plugin host.
 */

export type {
  DisposableRegistry,
  Plugin,
  PluginActivate,
  PluginContext,
  PluginDeactivate,
  PluginLoader,
  PluginManifest,
  PluginManifestError,
  PluginStatus,
} from "./types.js";
