import { readdir } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { existsSync } from "node:fs";
import type { HookRegistry } from "../hooks/types.js";
import type { PluginContext } from "../hooks/types.js";
import { runInSandbox } from "./sandbox.js";

/**
 * Plugin module shape — implements the activation contract.
 * Each plugin must export a default function that accepts HookRegistry and
 * PluginContext and returns void or Promise<void>.
 *
 * Per ADR-020: "Each plugin module must `export default (hooks: HookRegistry,
 * context: PluginContext) => void | Promise<void>`."
 */
export interface PluginModule {
  default: (
    hooks: HookRegistry,
    context: PluginContext,
  ) => void | Promise<void>;
}

/**
 * Load and activate plugins from a configured directory.
 *
 * Discovery behavior (ADR-020):
 * - Directory resolved from `NODEPRESS_PLUGINS_DIR` env var, or defaults to `./plugins`
 * - A missing directory is treated as valid empty result (preserves ADR-014 Quickstart Invariant)
 * - Scans immediate subdirectories for `plugin.json` (manifest-based plugins)
 * - Also accepts loose `.js` files at the root for single-file plugins (demo use case)
 *
 * Activation contract:
 * - Each module's default export is called with (hooks, context)
 * - The loader awaits the result (plugins may be async during registration)
 * - Failed modules are logged and skipped; the process continues
 *
 * @param hooks - The HookRegistry to pass to plugins
 * @param context - The PluginContext to pass to plugins
 * @param pluginsDir - Optional override for the plugins directory. If omitted,
 *                     uses NODEPRESS_PLUGINS_DIR env var or defaults to "./plugins"
 * @returns Array of successfully loaded plugin filenames
 */
export async function loadPlugins(
  hooks: HookRegistry,
  context: PluginContext,
  pluginsDir?: string,
): Promise<string[]> {
  const dir = pluginsDir ?? process.env["NODEPRESS_PLUGINS_DIR"] ?? "./plugins";

  // ADR-014: absent plugin directory is a valid no-op, not an error
  if (!existsSync(dir)) {
    console.info(`[PluginLoader] plugin directory not found: ${dir}`);
    return [];
  }

  // Scan the directory for .js files (post-compilation output)
  let files: string[];
  try {
    files = (await readdir(dir)).filter((f) => f.endsWith(".js"));
  } catch (err) {
    console.error(`[PluginLoader] failed to read directory ${dir}:`, err);
    return [];
  }

  if (files.length === 0) {
    console.info(`[PluginLoader] no .js files found in ${dir}`);
    return [];
  }

  const loaded: string[] = [];

  for (const file of files) {
    try {
      // ADR-020: use pathToFileURL for NodeNext ESM resolution
      const url = pathToFileURL(`${dir}/${file}`).href;
      const mod = (await import(url)) as unknown;

      // Type guard: check that default export exists and is a function
      if (
        mod &&
        typeof mod === "object" &&
        "default" in mod &&
        typeof (mod as PluginModule).default === "function"
      ) {
        const pluginModule = mod as PluginModule;
        // Run plugin in sandbox with 5 second timeout to prevent hangs
        await runInSandbox(pluginModule.default, hooks, context, 5000);
        loaded.push(file);
        console.info(`[PluginLoader] loaded ${file}`);
      } else {
        console.warn(
          `[PluginLoader] ${file} does not export a default function`,
        );
      }
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : typeof err === "string"
            ? err
            : String(err);
      console.error(`[PluginLoader] failed to load ${file}: ${message}`);
    }
  }

  return loaded;
}
