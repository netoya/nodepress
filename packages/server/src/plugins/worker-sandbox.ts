import { Worker } from "node:worker_threads";

/**
 * Options for Worker sandbox execution.
 */
export interface WorkerSandboxOptions {
  /**
   * Maximum old generation heap size in MB.
   * Default: 32 (appropriate for typical plugin initialization)
   */
  maxMemoryMb?: number;

  /**
   * Initialization timeout in milliseconds.
   * Default: 5000 (5 seconds)
   */
  timeoutMs?: number;
}

/**
 * Worker sandbox wrapper: executes plugin code in an isolated Worker Thread
 * with enforced memory limits via V8 resourceLimits.
 *
 * Provides real memory isolation: a plugin allocating >maxMemoryMb during
 * initialization will trigger OOM exception in the worker, leaving the
 * parent process unaffected.
 *
 * @param pluginCode - Plugin code as a string (typically fs.readFileSync result)
 * @param sandboxGlobals - Object containing hooks, context, and other globals
 * @param opts - Sandbox options (memory limit, timeout)
 * @throws {Error} If plugin initialization exceeds timeout or throws
 * @throws {Error} If worker thread creation fails
 *
 * Per ADR-020 amendment (Sprint 6 #78):
 * - Activated via NODEPRESS_WORKER_SANDBOX=true env var (default OFF)
 * - Preserves backward compatibility: when OFF, falls back to vm.Context
 * - Memory limit per plugin activation (not cached)
 */
export async function runInWorkerSandbox(
  pluginCode: string,
  sandboxGlobals: Record<string, unknown>,
  opts?: WorkerSandboxOptions,
): Promise<void> {
  const maxMemoryMb = opts?.maxMemoryMb ?? 32;
  const timeoutMs = opts?.timeoutMs ?? 5000;

  // Worker inline code: import worker_threads, receive plugin code + globals,
  // execute plugin in vm.runInNewContext, send result back via parentPort
  const workerCode = `
    import { parentPort, workerData } from 'node:worker_threads';
    import { runInNewContext } from 'node:vm';

    const { pluginCode, globals } = workerData;

    (async () => {
      try {
        // Wrap plugin code in async IIFE to allow top-level await
        const wrappedCode = '(async () => {' + pluginCode + '})()';
        // Execute plugin in isolated context with provided globals
        const result = runInNewContext(wrappedCode, globals, {
          filename: '<plugin-sandbox>',
          timeout: 5000, // extra safety: internal vm timeout
        });
        // Await the Promise (errors in async code are now caught)
        await result;
        parentPort.postMessage({ success: true });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        parentPort.postMessage({
          success: false,
          error: message,
          stack: err instanceof Error ? err.stack : undefined,
        });
      }
    })();
  `;

  return new Promise((resolve, reject) => {
    try {
      const worker = new Worker(workerCode, {
        eval: true,
        resourceLimits: {
          maxOldGenerationSizeMb: maxMemoryMb,
        },
        workerData: {
          pluginCode,
          globals: sandboxGlobals,
        },
      });

      let completed = false;
      const timeoutId = setTimeout(() => {
        if (!completed) {
          completed = true;
          worker.terminate();
          reject(
            new Error(
              `Plugin initialization timeout (${timeoutMs}ms) — Worker terminated`,
            ),
          );
        }
      }, timeoutMs);

      worker.on(
        "message",
        (msg: { success: boolean; error?: string; stack?: string }) => {
          if (completed) return;
          clearTimeout(timeoutId);
          completed = true;
          worker.terminate();

          if (msg.success) {
            resolve();
          } else {
            const err = new Error(msg.error ?? "Unknown error in worker");
            if (msg.stack) {
              (err as Error & { originalStack?: string }).originalStack =
                msg.stack;
            }
            reject(err);
          }
        },
      );

      worker.on("error", (err: Error) => {
        if (completed) return;
        clearTimeout(timeoutId);
        completed = true;
        worker.terminate();
        reject(new Error(`Worker thread error: ${err.message}`));
      });

      worker.on("exit", (code: number) => {
        if (completed) return;
        clearTimeout(timeoutId);
        completed = true;

        if (code !== 0) {
          reject(
            new Error(
              `Worker exited with code ${code} (likely OOM or fatal error)`,
            ),
          );
        }
      });
    } catch (err) {
      reject(
        new Error(
          `Failed to create Worker: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );
    }
  });
}
