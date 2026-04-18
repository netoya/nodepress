/**
 * Public entry point for the hook system. Re-exports the frozen type contract
 * (see `./types.ts`), HookRegistry implementation with circuit breaker
 * resilience (see `./HookRegistry.ts`), and wrapper utilities for crash
 * isolation (see `./wrappers.ts` and `./CircuitBreaker.ts`).
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

// Registry and circuit breaker — ADR-004, ADR-005
export { HookRegistryImpl, createHookRegistry } from "./HookRegistry.js";
export type { CircuitBreaker } from "./CircuitBreaker.js";
export { createCircuitBreaker } from "./CircuitBreaker.js";
export { wrapAsyncAction, wrapSyncFilter } from "./wrappers.js";
