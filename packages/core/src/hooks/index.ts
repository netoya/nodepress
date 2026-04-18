/**
 * Public entry point for the hook system. Re-exports the frozen type contract
 * (see `./types.ts`). The `HookRegistry` implementation is intentionally not
 * exported from this module yet — it ships in #14.
 */
export type { DisposableRegistry } from "./context.js";
export { DisposableRegistryImpl } from "./context.js";

export type {
  ActionCallback,
  ActionEntry,
  FilterCallback,
  FilterEntry,
  HookEntry,
  HookPriority,
  HookRegistry,
  HookType,
  PluginContext,
} from "./types.js";

export { DEFAULT_HOOK_PRIORITY } from "./types.js";
