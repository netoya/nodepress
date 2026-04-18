import type { HookRegistry } from "../hooks/types.js";
import type { PluginContext } from "../hooks/types.js";

/**
 * Execute a plugin module function in an isolated sandbox with timeout protection.
 *
 * This function wraps plugin activation in an AbortSignal timeout (default 5 seconds).
 * If the plugin's initialization takes longer than the timeout, an error is thrown
 * and caught by the loader.
 *
 * Per ADR-004 § Crash Isolation, each plugin must be resilient against:
 * - Uncaught exceptions (handled by try/catch in loader)
 * - Long-running initialization (handled by timeout here)
 * - Resource leaks (plugins are responsible for cleanup via DisposableRegistry)
 *
 * @param pluginFn - The plugin's default export function
 * @param hooks - HookRegistry instance to pass to the plugin
 * @param context - PluginContext instance to pass to the plugin
 * @param timeoutMs - Timeout in milliseconds. Defaults to 5000 (5 seconds).
 * @throws If the plugin function doesn't settle before timeout
 */
export async function runInSandbox(
  pluginFn: (
    hooks: HookRegistry,
    context: PluginContext,
  ) => void | Promise<void>,
  hooks: HookRegistry,
  context: PluginContext,
  timeoutMs: number = 5000,
): Promise<void> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    // Await the plugin's initialization, respecting the timeout signal
    const result = pluginFn(hooks, context);
    if (result instanceof Promise) {
      // Create a race between plugin promise and timeout
      await Promise.race([
        result,
        new Promise<never>((_, reject) => {
          controller.signal.addEventListener("abort", () => {
            reject(
              new Error(
                `Plugin initialization timeout (${timeoutMs}ms exceeded)`,
              ),
            );
          });
        }),
      ]);
    }
  } finally {
    clearTimeout(timeoutId);
  }
}
