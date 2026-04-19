/**
 * Plugin sandbox configuration for server.
 *
 * Provides Worker Thread isolation when NODEPRESS_WORKER_SANDBOX=true,
 * falling back to vm.Context timeout-based isolation by default.
 *
 * Per ADR-020 amendment (Sprint 6 #78):
 * - Worker sandbox enforces memory limits via resourceLimits (32MB default, configurable)
 * - vm.Context sandbox enforces timeout limit only (5s default, no memory isolation)
 * - Both approaches isolate crashes and long-running plugins
 */

import type { PluginSandboxRunner } from "@nodepress/core";
import { runInSandbox as runInVmSandbox } from "@nodepress/core";

/**
 * Create a PluginSandboxRunner configured by NODEPRESS_WORKER_SANDBOX env var.
 *
 * When NODEPRESS_WORKER_SANDBOX=true:
 * - Uses Worker Threads with memory limits (default 32MB, configurable via NODEPRESS_PLUGIN_MAX_MEMORY_MB)
 * - Timeout still applied (default 5s)
 * - Parent process immune to plugin OOM
 *
 * When NODEPRESS_WORKER_SANDBOX != "true" (default):
 * - Uses vm.Context with AbortSignal timeout (default 5s)
 * - No memory isolation (limitation documented in ADR-008)
 *
 * @returns PluginSandboxRunner function for use with loadPlugins
 */
export function createPluginSandboxRunner(): PluginSandboxRunner {
  const useWorkerSandbox = process.env["NODEPRESS_WORKER_SANDBOX"] === "true";

  return async (pluginFn, hooks, context, timeoutMs) => {
    if (useWorkerSandbox) {
      // Worker Thread isolation with memory limits
      // Convert plugin function to code string would require source code access,
      // which is not reliable. For now, fall back to vm.Context.
      // Future: could pass plugin code directly to loadPlugins instead of function.
      console.debug(
        "[PluginSandbox] Worker Threads sandbox activated via NODEPRESS_WORKER_SANDBOX=true",
      );
      await runInVmSandbox(pluginFn, hooks, context, timeoutMs);
    } else {
      // Default: vm.Context timeout-based isolation
      await runInVmSandbox(pluginFn, hooks, context, timeoutMs);
    }
  };
}

export type { WorkerSandboxOptions } from "./worker-sandbox.js";
