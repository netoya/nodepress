# ADR-013: Circuit Breaker Stress Test Findings

**Status:** Accepted

**Date:** 2026-04-18

**Author:** Raúl (Dev Backend)

**Issue:** #30 (Circuit breaker stress testing and race condition analysis)

---

## Context

The CircuitBreaker implementation (packages/core/src/hooks/CircuitBreaker.ts) was implemented as part of #20 to provide fail-fast isolation for misbehaving plugins. The implementation uses a naive `Map<pluginId, timestamps[]>` to track failure windows per plugin.

The initial test suite (11 unit tests) covers single-threaded scenarios with full control over time via fake timers. However, it does not stress-test concurrent failure recording, rapid-fire threshold detection, or multi-plugin isolation under realistic load. Issue #30 requested comprehensive stress testing and race condition analysis before the breaker ships.

Findings from stress tests (6 new tests, 17 total CircuitBreaker tests) and concurrent workload modeling are documented here.

---

## Findings

### Test 1: Concurrent Failure Recording (50 simultaneous calls)

**Result:** PASS (no data loss, no duplication)

**Observation:**  
Recorded 50 concurrent `recordFailure()` calls on the same `pluginId`. All 50 were accurately reflected in the breaker state. No failures were lost, and no duplicates appeared.

**Why it's safe:**  
Node.js runs on a single event loop thread. Even though we used `Promise.resolve()` to model "concurrent" calls, JavaScript's microtask queue serializes all operations. The `recordFailure` method does not yield control (no `await`, no callbacks), so all 50 mutations execute atomically in sequence from JavaScript's perspective.

**Code pattern verified:**

```typescript
// This sequence is atomic in Node.js:
const now = Date.now();
const timestamps = this.#failures.get(pluginId) ?? [];
const recent = timestamps.filter((t) => t > cutoff);
recent.push(now);
this.#failures.set(pluginId, recent);
```

No interleaving can occur between the `get`, mutate, and `set` steps.

---

### Test 2: Open Threshold Detection Under Load (100 hits in 1 second)

**Result:** PASS (circuit opens at >=5 failures, stays open within window)

**Observation:**  
Bombarded `recordFailure` with 100 calls for the same `pluginId`. The circuit opened immediately (threshold: 5 failures). Queried `isOpen()` at 10 offset points within the 60-second window; all returned `true`. After advancing past the 60-second boundary, the circuit closed.

**Implication:**  
The breaker's threshold is enforced correctly even under rapid-fire load. No overflow, no off-by-one errors. The 60-second window is correctly applied across all failure records.

---

### Test 3: PluginId Isolation (5 plugins, 10 failures each, parallel)

**Result:** PASS (complete isolation, no cross-contamination)

**Observation:**  
Registered 50 total failures across 5 distinct `pluginId` values (10 per plugin). Each plugin's circuit independently opened. Resetting one plugin did not affect the others.

**Pattern tested:**

```typescript
const plugins = ["a", "b", "c", "d", "e"];
for (const pluginId of plugins) {
  for (let i = 0; i < 10; i++) {
    breaker.recordFailure(pluginId);
  }
}
// All 5 are now open.
// Reset "a" => "a" closed, others still open.
```

**Implication:**  
The `Map<pluginId, ...>` design correctly isolates per-plugin state. No shared global state leaks between plugins. Safe for multi-plugin scenarios.

---

### Test 4: Auto-Reset Under Mixed Workload

**Result:** PASS (window-based reset works correctly; re-opens on new failures)

**Observation:**  
Phase 1: Accumulated 10 failures → circuit open.  
Phase 2: Advanced 61 seconds → circuit closed (old failures pruned).  
Phase 3: Recorded 1 new failure → circuit still closed (1 < 5 threshold).  
Phase 4: Recorded 4 more → circuit re-opened (5 at new time).  
Phase 5: Advanced 61 seconds → circuit closed again.

**Implication:**  
The sliding window implementation (prune timestamps older than 60 seconds) correctly resets the breaker even if it was previously open. The counter restarts cleanly from zero after window expiry. Repeated open/close cycles are safe.

---

### Test 5: HookRegistry Integration Under Load (100 applyFilters with 30% failure rate)

**Result:** PASS (plugin isolated after reaching threshold; filter skips are logged)

**Observation:**  
Registered a filter that fails 30% of the time (deterministic). Called `applyFilters` 100 times. After 5 failures were recorded, `isOpen()` returned `true`, and subsequent calls logged "[HookRegistry] filter plugin ... circuit-open, skipping" without executing the filter callback.

**Critical behavior verified:**

- Failures are correctly recorded in the breaker by `wrapSyncFilter`.
- Once the circuit opens, the filter callback is not invoked (short-circuit).
- The fail-safe return value (original input) is returned.

**Integration implication:**  
The breaker's integration with `HookRegistry.applyFilters` is working as designed. Plugins that exceed the failure threshold are automatically isolated from further execution, preventing cascading failures across the hook chain.

---

### Test 6: Memory Pressure Smoke Test (1000 pluginIds, 1 failure each)

**Result:** PASS (no crash, internal state remains bounded at 1000 entries)

**Observation:**  
Created 1000 distinct `pluginId` values, each with exactly 1 recorded failure (below the 5-failure threshold, so no circuits opened). Queried `isOpen()` for all 1000 plugins; all correctly returned `false`. Verified that querying a non-existent plugin doesn't pollute internal state.

**Trade-off noted:**  
The `Map<pluginId, timestamps[]>` grows unbounded with distinct plugin IDs. In this test, 1000 entries are created and retained (garbage collection does not happen). The implementation is PoC-grade and acceptable for Sprint 1, but production deployments with hundreds of plugins loading dynamically could accumulate thousands of stale entries.

**Current behavior:**  
Entries are pruned only during `isOpen()` checks (lazy cleanup of timestamps older than 60 seconds). Once a plugin has failures, its entry exists in the Map until a query expires all timestamps. A plugin that fails once and is never queried again will retain its entry indefinitely.

---

## Known Limitations & Race Conditions

### Limitation 1: No Distributed Consensus (Single Instance)

**Classification:** Expected for PoC.  
The breaker is per-Node.js process. In a multi-instance deployment, each process maintains its own breaker state. A plugin failing in Instance A will not isolate in Instance B unless both instances independently hit the threshold. Mitigation: Defer to distributed consensus (e.g., Redis) in Sprint 2.

### Limitation 2: Unbounded Map Growth

**Classification:** Expected for PoC, documented above.  
No automatic garbage collection of entries with stale timestamps. Old plugins accumulate in memory. Mitigation: Implement periodic GC (e.g., every 60 seconds, scan and delete empty entries) in a future release.

### Limitation 3: Fixed Threshold & Window (No Customization)

**Classification:** Design choice, OK for MVP.  
Threshold is hardcoded to 5 failures in 60 seconds. No per-plugin or per-hook customization. All plugins share the same policy. Mitigation: Add pluginId-specific configuration in ADR as a future enhancement (Sprint 2 or 3).

### Actual Race Conditions Found

**Classification:** None in single-threaded Node.js environment.

The single-threaded event loop serializes all operations. The `recordFailure` and `isOpen` methods do not yield control (no `await`, no callbacks), so there is no interleaving between read-modify-write steps. Even with 50 concurrent calls modeled via Promise microtasks, all mutations occur atomically.

**However**, this safety is fragile:

- If future code introduces `await` in `recordFailure` or `isOpen`, concurrent calls could be interleaved between the `get`, mutate, and `set` steps, causing race conditions (e.g., lost failures if two tasks both mutate `timestamps` and one overwrites the other's changes).
- If the code moves to Worker Threads or async I/O, explicit locking would be required.

**Recommendation:** Document this assumption in JSDoc and monitor for any future changes that add async boundaries.

---

## Future Work

### Priority 1 (Sprint 2)

1. **Per-Plugin Thresholds & Windows** (ADR follow-up)
   - Allow plugins to declare custom failure thresholds and time windows.
   - Enable different policies for different plugin types (e.g., stricter for core plugins).

2. **Automatic GC of Stale Entries**
   - Implement periodic cleanup of pluginId entries with all stale timestamps.
   - Run on a 60-second interval or on-demand after high cardinality scenarios.

### Priority 2 (Sprint 3 / Distributed)

3. **Distributed Consensus (Redis or etcd)**
   - Migrate from per-process Map to a shared backend for multi-instance deployments.
   - Ensures all instances agree on which plugins are isolated.

### Priority 3 (Future)

4. **Jitter on Reset**
   - Add random jitter to the 60-second window to prevent thundering herd on reset.
   - Example: reset at 60s ± 5s.

5. **Metrics & Observability**
   - Export metrics: failures per plugin, circuit opens/closes, durations in open state.
   - Integrate with Prometheus or similar.

---

## Recommendations

**Approved for Ship (Sprint 1):**  
The CircuitBreaker implementation passes all unit tests and stress tests. The single-threaded safety is validated. Documented limitations are acceptable for PoC stage.

**Actions Before Merge:**

1. ✅ All 17 CircuitBreaker tests pass (11 unit + 6 stress).
2. ✅ HookRegistry integration tests pass (no regressions in 16 existing tests).
3. ✅ Wrapper tests pass (15 tests, no regressions).
4. ✅ TypeScript strict mode, ESLint 0 errors.
5. ✅ Async safety assumption documented in JSDoc.

**Code Review Checklist:**

- [ ] Verify async-boundary assumption is documented in CircuitBreaker.ts JSDoc.
- [ ] Check that future changes to `recordFailure` / `isOpen` preserve the non-async contract.
- [ ] If Worker Threads are introduced, revisit locking strategy.

---

## Appendix: Test Summary

| Test                                           | Result         | Duration | Notes                       |
| ---------------------------------------------- | -------------- | -------- | --------------------------- |
| CircuitBreaker.test.ts (11 unit tests)         | PASS           | 7ms      | Baseline functionality      |
| CircuitBreaker.stress.test.ts (6 stress tests) | PASS           | 45ms     | Concurrent, load, isolation |
| wrappers.test.ts (15 integration tests)        | PASS           |          | No regressions              |
| HookRegistry.test.ts (16 integration tests)    | PASS           |          | No regressions              |
| **Total**                                      | **17/17 PASS** | **52ms** |                             |

---

## Sign-off

**Date:** 2026-04-18

**Signed by:**

- Román (Tech Lead)
- Raúl (Dev Backend 2)

**Rationale:** Empirical findings confirmed across the 6 stress tests and 11 baseline unit tests (17/17 green). The single-threaded event-loop safety assumption is validated under concurrent load, pluginId isolation holds across parallel workloads, and the HookRegistry integration short-circuits correctly on threshold breach. Known limitations (unbounded Map growth, per-process scope, fixed threshold/window) are explicitly documented and understood by the team; each has a scheduled follow-up (GC ticket S2-W1 assigned to Raúl per kickoff Sprint 2, distributed consensus in Sprint 3). No blocking gaps remain for PoC ship.

**Next Steps:** Merge #30, update project memory with findings, schedule Sprint 2 distributed consensus spike, and land the stale-entry GC ticket in Sprint 2 week 1.
