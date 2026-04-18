// Public API of @nodepress/core — hook system + plugin context
export type { DisposableRegistry } from "./hooks/index.js";
export { DisposableRegistryImpl } from "./hooks/index.js";

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
} from "./hooks/index.js";

export { DEFAULT_HOOK_PRIORITY } from "./hooks/index.js";

export { HookRegistryImpl, createHookRegistry } from "./hooks/index.js";
export type { CircuitBreaker } from "./hooks/index.js";
export {
  createCircuitBreaker,
  wrapAsyncAction,
  wrapSyncFilter,
} from "./hooks/index.js";
