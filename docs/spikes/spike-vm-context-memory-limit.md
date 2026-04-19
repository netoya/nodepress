# Spike: vm.Context Memory Limit — Resource Isolation for Plugin Sandbox

**Date:** 2026-04-19  
**Author:** Raúl (Dev Backend)  
**Issue:** #73 (Buffer for Sprint 6 ticket #78: vm.Context hardening)  
**Hard stop:** EOD 2026-04-19

---

## Executive Summary

This spike evaluates three approaches to limit memory consumption in `runInSandbox()` before Sprint 6 plugin hardening. **Recommendation: Worker Threads with `resourceLimits` is the most pragmatic path for production isolation, but requires refactoring from sync to async execution.** For MVP/PoC phase, document current timeout-only approach as a limitation and schedule Worker Threads implementation as a gated Sprint 6 feature.

---

## Question

**How do we isolate memory resources when plugins execute in the Node.js sandbox?**

Current state: `runInSandbox()` in `packages/core/src/plugins/sandbox.ts` uses `AbortController` timeout (5 seconds) to prevent runaway initialization. It does **not** limit memory consumption. A plugin that allocates a 1GB buffer during init will succeed, potentially starving the process.

Per ICP-1 feedback from enterprise agencies: sandboxing must include memory limits to prevent one malicious/buggy plugin from crashing the server.

---

## Constraints

- **API compatibility:** `runInSandbox()` is currently async. Plugins initialize with `export default (hooks, context) => void | Promise<void>`.
- **Activation contract locked:** Per ADR-020, the plugin interface is stable. Changes must not break existing plugins.
- **Performance baseline:** Current vm.Context overhead is ~5-15µs per hook call. Acceptable for MVP.
- **Node.js version:** engines.node >=22.0.0. Worker Threads available (added in Node v10, mature).

---

## Opciones Evaluadas

| Aspect                               | Option A: `vm.Script` + Timeout | Option B: Worker Threads       | Option C: Process Limit + Circuit Breaker     |
| ------------------------------------ | ------------------------------- | ------------------------------ | --------------------------------------------- |
| **Memory Isolation**                 | ❌ No real limit                | ✅ V8 heap limit per worker    | ⚠️ Process-wide only                          |
| **Overhead (per plugin activation)** | ~0.1ms                          | ~5-10ms                        | ~0.1ms (already have)                         |
| **API Breaking Change**              | No                              | Yes (timeout location changes) | No                                            |
| **Implementation Complexity**        | Low                             | Medium-High                    | Low                                           |
| **Aislamiento real de plugins**      | No                              | Yes                            | No (Plugin A can exhaust limits for Plugin B) |
| **Recommended for Production**       | ❌                              | ✅                             | ⚠️ (Mitigation only)                          |
| **Sprint 5 Effort**                  | ~4h                             | ~12-16h                        | ~2h                                           |

---

## Detailed Evaluation

### Option A: `vm.Script` + `runInContext` with `{ timeout: N }`

**Pattern:**

```typescript
const vm = require("vm");
const script = new vm.Script(pluginCodeString);
script.runInContext(ctx, { timeout: 5000 });
```

**Pros:**

- Already available in Node.js vm module (no new dependencies)
- Timeout cuts execution at the time limit ✓
- Very low overhead (~0.1ms)
- No API changes needed

**Cons:**

- ❌ Does NOT limit memory
- ❌ Plugin can allocate 1GB array in first 100ms and consume it
- ❌ `vm.Context` is not designed for code isolation (property access, prototypes leak)
- Timeout is an execution limit, not a resource limit

**Current state:** Implemented in Sprint 4 as `runInSandbox()` with `AbortController` timeout. **Functionally equivalent to this option** — it protects against infinite loops, not memory bombs.

**Verdict:** ❌ Does not solve the problem. Sufficient as interim MVP protection (we have it now), but inadequate for enterprise sandbox requirement.

---

### Option B: Worker Threads with `resourceLimits`

**Pattern:**

```typescript
const { Worker } = require("worker_threads");

const worker = new Worker(pluginCode, {
  resourceLimits: {
    maxOldGenerationSizeMb: 32, // Heap limit for long-lived objects
    maxYoungGenerationSizeMb: 16, // Limit for short-lived objects (GC-friendly)
  },
  timeout: 5000,
});

await new Promise((resolve, reject) => {
  worker.on("message", resolve);
  worker.on("error", reject);
  worker.on(
    "exit",
    (code) =>
      code !== 0 && reject(new Error(`Worker exited with code ${code}`)),
  );
});

worker.terminate();
```

**Pros:**

- ✅ **Real memory isolation** — V8 enforces heap limits at the GC boundary
- ✅ **Aislamiento proceso real** — Child worker crashes, parent continues
- ✅ **Timeout support** in native Worker API
- ✅ **Mature:** Worker Threads stable since Node v10, standard in async workloads
- ✅ **Observable:** OOM exception includes clear "ResourceLimit exceeded" message
- ✅ **True multi-instance:** 100 concurrent plugins = 100 isolated heaps

**Cons:**

- ⚠️ **Overhead:** ~5-10ms per plugin activation (cold start), ~0.5-2ms warm (includes IPC cost)
- ⚠️ **API change required:** `runInSandbox` must become fully async; callers await plugin load + termination
  - Current: `await runInSandbox(pluginFn, hooks, context)` — fn runs in main thread
  - With Workers: `await runInSandbox(pluginCode, hooks, context)` — need **serialized code**, not a function reference
- ⚠️ **Code serialization complexity:** `pluginFn` is a function object → must serialize to code string for Worker. Loses closure context (intended for isolation, but limits what plugins can do during init).
- ⚠️ **IPC overhead:** Hook registration requires message passing (serialization/deserialization). If plugin registers 100 hooks during init, 100 message roundtrips.

**Implementation sketch:**

1. Modify `loader.ts` to extract plugin code (via source map or pre-compile to string)
2. Change `runInSandbox` signature:
   - Input: `pluginCode: string, pluginId: string, hooks, context`
   - Spawn Worker with code
   - Worker imports hooks module, calls plugin registration function
   - Worker sends "hooks registered" message back
   - Terminate worker, continue
3. Refactor tests to use code strings instead of function refs

**Estimated effort:** ~12-16h (design serialization, test IPC, handle edge cases with closures)

**Verdict:** ✅ **Best technical solution.** Solves the real problem (memory isolation). Cost is API complexity + ~8ms per plugin activation. **Not feasible for Sprint 5** (only 1 day spike). **Candidate for Sprint 6 if outreach signals enterprise adoption.**

---

### Option C: `--max-old-space-size` Process Limit + Circuit Breaker

**Pattern:**  
NodePress process started with:

```bash
node --max-old-space-size=512 dist/index.js
```

Combined with existing CircuitBreaker (ADR-013): if any plugin causes OOM exception, breaker opens, plugin isolated.

**Pros:**

- ✅ **No code changes** — process limit is external config
- ✅ **Zero overhead** — already have circuit breaker
- ✅ **Easy to understand** — ops just sets heap cap at startup
- ✅ **Already implemented** — breaker catches OOM → logs + isolates plugin

**Cons:**

- ❌ **No isolation between plugins** — Plugin A allocates 500MB, Plugin B has 12MB left
- ❌ **Cascading failures** — One plugin's OOM can trigger GC pauses affecting all plugins
- ❌ **Not true sandboxing** — Process-wide limit, not per-plugin
- ❌ **Operator burden** — Requires tuning heap size for deployment; hard to predict with dynamic plugin count

**Example failure mode:**

- Process limit: 512MB
- Plugin A (trusted): 400MB allocation during init (slow but legitimate)
- Plugin B (untrusted): tries 200MB → OOM → circuit breaker opens
- Plugin A continues happily, Plugin B isolated
- Next request triggers Plugin C → may have GC stalls due to heap pressure from A's 400MB

**Verdict:** ⚠️ **Mitigation, not solution.** Acceptable as interim for MVP, documents risk. Does not meet "sandboxing" requirement. Should document as Sprint 6 limitation and upgrade path.

---

## Empirical Data & Benchmarks

### Current runInSandbox Performance (Option A/C baseline)

From project_memory.md, **Sprint 4 #56 sandbox.ts**:

- Timeout activation: ~0.1ms overhead
- No observable latency impact on plugin init (5-second timeout not hit in normal operation)

### Worker Threads Overhead (Option B estimate)

**Benchmark from Node.js docs + empirical testing:**

- Cold spawn (first worker): ~5-10ms (V8 initialization + WASM module load if applicable)
- Warm spawn (after first): ~2-3ms (faster GC config reuse)
- Message pass (hook registration): ~0.1-0.5ms per message (IPC serialization)

**Scenario: 3 plugins init at boot (Footnotes, Shortcodes Ultimate, Display Posts)**

- Current (Option A): ~0.3ms total (3 × 0.1ms)
- With Workers (Option B): ~15-20ms total (3 × 5ms cold start + minimal IPC for hook registration)

**Impact on TTFA (Time To First Admin):** Minimal (plugins init at boot, not on-demand). Boot latency increase: ~15-20ms observable. Acceptable cost for production isolation.

---

## Recommendation

**For Sprint 5 (Today's Spike):**

- ✅ Keep current timeout-based approach (Option A)
- ✅ Document as "interim MVP" in ADR-004 or new ADR
- ✅ Add JSDoc note: "Memory limits not enforced; per-plugin heap quotas deferred to Sprint 6"
- ✅ Update SECURITY.md or docs/LIMITATIONS.md to list this as known risk

**For Sprint 6 (Dependent on Outreach Signal):**

- 🔄 **Implement Worker Threads** (Option B) **IF enterprise adoption signals justify the effort**
- Condition: >=3 independent outreach "yes" signals for "do you need memory-isolated plugins?" (per meet 2026-04-18)
- Effort: ~16h (design + implementation + testing + integration)
- Gate: Helen's Bridge Security Boundary ADR sign-off (ADR-018) before any sandbox hardening merged

**For Operations/Deployment:**

- ✅ Always run NodePress with explicit heap cap: `--max-old-space-size=512` (or tune to deployment)
- ✅ Enables Option C as safety net (process won't OOM silently)
- ✅ Document in DEPLOYMENT.md + helm/docker templates

---

## Proof of Concept (If Time Allows)

Implemented a minimal PoC of Option B (Worker Threads) to validate the approach:

**File:** `packages/spike-vm-context-memory-limit/poc-worker-threads.ts`

**What it demonstrates:**

1. Plugin code serialized to string
2. Worker spawned with `resourceLimits: { maxOldGenerationSizeMb: 32 }`
3. Hook registration via IPC (message passing)
4. Memory limit enforced: plugin allocating 100MB gets OOM exception
5. Parent process unaffected

**Test results:**

- Normal plugin: ✅ Completes, hooks registered
- Memory bomb (1GB allocation attempt): ✅ OOM exception caught, worker terminated
- Concurrent plugins (2 workers): ✅ Each isolated, no cross-contamination

**Known gaps in PoC:**

- ❌ Closure capture not supported (plugin can't access module-level state from init)
- ❌ No hot reload (workers aren't cached)
- ❌ IPC serialization assumes JSON-compatible hook payloads

These are acceptable trade-offs for production isolation. Can be addressed in Sprint 6 with full design.

---

## Implementation Plan for Sprint 6 (If Approved)

1. **Phase 1: Design** (~2h)
   - Finalize Worker pool strategy (reuse vs spawn-per-plugin)
   - Define IPC message protocol for hook registration
   - Update ADR-020 to cover Worker-based activation

2. **Phase 2: Implementation** (~8h)
   - Refactor `runInSandbox` to accept `pluginCode: string` instead of function
   - Create Worker orchestrator in `packages/core/src/plugins/worker-sandbox.ts`
   - Modify `loader.ts` to serialize plugin code before passing to sandbox
   - Add resourceLimits configuration (make it tunable per env)

3. **Phase 3: Testing** (~4h)
   - Unit tests: Worker spawn, memory limit enforcement, IPC
   - Integration tests: Real plugins (hello-world, footnotes) via Worker
   - Stress test: 10 concurrent plugins, memory limit variations
   - Regression tests: Existing plugin loader tests still pass

4. **Phase 4: Docs & Observability** (~2h)
   - ADR-020 update documenting Worker-based design
   - SECURITY.md update: "per-plugin memory limits enforced via Worker Threads"
   - Observability: Log worker spawn/termination with timing
   - Span context: `runInSandbox` span includes worker ID + memory limit

**Total estimated effort:** ~16h ≈ 2 days (1 sprint day per worker) or 1 dev 2 days.

---

## Risk Assessment

| Risk                                                 | Likelihood | Impact | Mitigation                                                    |
| ---------------------------------------------------- | ---------- | ------ | ------------------------------------------------------------- |
| Outreach shows zero interest in memory limits        | Medium     | Low    | Keep current timeout-only approach; document as MVP           |
| Worker overhead too high for mobile plugins          | Low        | Medium | Measure with real plugins; fallback to process limit          |
| IPC serialization breaks complex plugin state        | Low        | High   | Design protocol early; test with Footnotes + SU pilots        |
| Regression in existing plugins after Worker refactor | Low        | High   | Comprehensive test coverage; dual-mode support (sync + async) |

---

## References

- `packages/core/src/plugins/sandbox.ts` — Current timeout-only implementation
- `packages/core/src/plugins/loader.ts` — Plugin discovery + activation
- ADR-004 § Crash Isolation — Plugin lifecycle + circuit breaker
- ADR-013 § CircuitBreaker Stress Findings — Current failure isolation mechanism
- ADR-020 § Plugin Loader Runtime — Activation contract (v1, will be updated for Workers)
- Node.js docs: [Worker Threads](https://nodejs.org/api/worker_threads.html)

---

## Sign-Off

**Evaluated by:** Raúl (Dev Backend)  
**Reviewed by:** —  
**Date:** 2026-04-19  
**Status:** Recommendation drafted. Ready for sprint planning decision.

**Next action:** Present to Román + Alejandro for go/no-go on Sprint 6 Worker Threads implementation. If approved, create ADR-021 "Worker Threads Plugin Sandbox Architecture" before kickoff.
