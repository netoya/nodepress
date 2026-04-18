/**
 * @nodepress/plugin-api — public type contract.
 *
 * Declarative surface for the plugin loader, manifest schema, and lifecycle
 * contract. Implementation is scoped for Sprint 2+ per ADR-012. This file
 * contains types only — no runtime logic.
 *
 * ## Scope
 *
 * This package is the operator-facing side of the plugin system:
 * installation, discovery, load/unload, and crash-isolated activation. The
 * plugin-author-facing side (hook registration, disposables) lives in
 * `@nodepress/core` and is consumed here via {@link PluginContext}.
 *
 * ## Cross-references
 *
 * - ADR-001 § Plugin Loading Strategy (filesystem layout, manifest)
 * - ADR-003 § Tier 1 Native (runtime = Node.js vm.Context sandbox)
 * - ADR-004 § Installation / Activation / Deactivation
 * - ADR-005 § Hook System Semantics (filter vs action asymmetry)
 * - ADR-012 (this package's architecture decisions and open questions)
 */

import type { PluginContext } from "@nodepress/core";

// Re-export the core contracts that plugin authors and hosts interact with,
// so consumers only need a single import path to build a plugin host or to
// type a plugin's `activate(context)` signature.
export type { DisposableRegistry, PluginContext } from "@nodepress/core";

// ---------------------------------------------------------------------------
// Manifest (plugin.json)
// ---------------------------------------------------------------------------

/**
 * `plugin.json` structure. Replaces WordPress's PHP header comments as the
 * machine-readable source of plugin metadata (ADR-001 § Plugin Loading).
 *
 * All string fields are required unless marked optional. Version strings
 * should follow SemVer; the validator rejects non-compliant versions so the
 * registry can sort and compare them deterministically.
 */
export interface PluginManifest {
  /** Unique identifier. Used as the primary key in `plugin_registry`. */
  readonly slug: string;
  /** Human-readable name rendered in the admin panel. */
  readonly name: string;
  /** SemVer string. */
  readonly version: string;
  /** Optional description surfaced in the admin listing. */
  readonly description?: string;
  /**
   * Path to the compiled entry point relative to the plugin root, e.g.
   * `"dist/index.cjs"`. Per ADR-004 plugins are compiled to CJS for
   * `vm.Context` execution; the runtime loads this file, not the TS source.
   */
  readonly main: string;
  /** Slugs of other plugins that must be loaded first (topological order). */
  readonly dependencies?: readonly string[];
  /**
   * When true, the plugin receives the WordPress compatibility shim layer
   * on top of {@link PluginContext} (`add_action`, `add_filter`, etc.).
   * Defaults to `false` for new TS-native plugins.
   */
  readonly wpCompat?: boolean;
  /** Minimum NodePress version required (SemVer range). */
  readonly engines?: { readonly nodepress?: string };
}

// ---------------------------------------------------------------------------
// Plugin runtime contract
// ---------------------------------------------------------------------------

/**
 * Signature of a plugin's `activate` export. Receives a fresh
 * {@link PluginContext} owned by the framework; the context injects the
 * plugin's id into every hook registration and tracks disposables for
 * automatic cleanup on deactivation (ADR-004 § PluginContext).
 *
 * Implementations may be synchronous, but async is recommended so that any
 * asynchronous setup (DB warmup, external handshake) can be awaited by the
 * loader before the plugin is marked active.
 */
export type PluginActivate = (context: PluginContext) => void | Promise<void>;

/**
 * Signature of a plugin's optional `deactivate` export. The framework always
 * runs `context.disposeAll()` on deactivation regardless of whether this
 * hook is provided — plugins do not need to clean up what they registered
 * through the context. This hook is for bespoke teardown that cannot be
 * expressed as a disposable.
 */
export type PluginDeactivate = () => void | Promise<void>;

/**
 * In-memory representation of a loaded plugin. Produced by
 * {@link PluginLoader.load} from a {@link PluginManifest} + its CJS module.
 *
 * `activate` is always present (mandatory export); `deactivate` is optional
 * (ADR-004). The framework is responsible for calling them — plugin hosts
 * should not invoke these directly.
 */
export interface Plugin {
  readonly slug: string;
  readonly name: string;
  readonly version: string;
  readonly manifest: PluginManifest;
  readonly activate: PluginActivate;
  readonly deactivate?: PluginDeactivate;
}

// ---------------------------------------------------------------------------
// Loader
// ---------------------------------------------------------------------------

/**
 * Current lifecycle state of a loaded plugin, mirroring the WP admin states
 * plus NodePress's two-phase deactivation model (ADR-004 § Deactivation).
 */
export type PluginStatus = "inactive" | "active" | "draining" | "error";

/**
 * Discovers, loads, and unloads plugins. Implementations are responsible
 * for:
 *
 * 1. Reading and validating `plugin.json` against {@link PluginManifest}.
 * 2. Dynamically importing the compiled entry point (ADR-004 § Activation)
 *    with version+timestamp cache busting so reactivation picks up changes.
 * 3. Wrapping the plugin in a `vm.Context` sandbox (ADR-003 § Tier 1).
 * 4. Producing a {@link Plugin} record consumed by the lifecycle layer.
 * 5. Tearing everything down on `unload(slug)` — including any resources
 *    the runtime allocated on the plugin's behalf.
 */
export interface PluginLoader {
  /**
   * Load a plugin from a validated manifest. The loader resolves the
   * compiled entry point, verifies the exports, and returns the runtime
   * {@link Plugin}.
   *
   * Throws `PluginManifestError` if validation fails, or a generic load
   * error if the module cannot be imported. Errors are surfaced to the
   * admin panel via the `plugin_registry` table (ADR-004 § Installation).
   */
  load(manifest: PluginManifest): Promise<Plugin>;

  /**
   * Tear down a loaded plugin. Runs the optional `deactivate` hook, then
   * drains the plugin's {@link PluginContext} via
   * `context.disposeAll()`. Always removes every hook registered by the
   * plugin via `HookRegistry.removeAllByPlugin` regardless of whether
   * `deactivate` throws (ADR-004 § Hook Cleanup).
   *
   * Idempotent: unloading an already-unloaded slug resolves without error.
   */
  unload(slug: string): Promise<void>;

  /** Current lifecycle status of a loaded plugin. */
  status(slug: string): PluginStatus;
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

/**
 * Thrown when a `plugin.json` fails validation. The `issues` field is an
 * array of human-readable messages safe to surface in the admin panel; the
 * `path` points at the offending file.
 *
 * Concrete constructor is implementation-defined in Sprint 2 — this type is
 * just the structural contract consumers code against.
 */
export interface PluginManifestError extends Error {
  readonly name: "PluginManifestError";
  readonly path: string;
  readonly issues: readonly string[];
}
