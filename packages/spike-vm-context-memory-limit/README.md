# Spike: vm.Context Memory Limit Options

**Issue:** #73 (buffer for Sprint 6 ticket #78: vm.Context hardening)  
**Hard stop:** EOD 2026-04-19  
**Status:** Complete — Recommendation drafted, PoC validated

## Overview

This spike evaluates three approaches to limit memory consumption in the plugin sandbox before Sprint 6 implementation:

1. **Option A:** `vm.Script` + timeout (current: insufficient)
2. **Option B:** Worker Threads with `resourceLimits` (recommended for production)
3. **Option C:** Process limit + circuit breaker (interim mitigation)

## Deliverables

- **Report:** `../../docs/spikes/spike-vm-context-memory-limit.md`
  - Executive summary
  - Detailed evaluation of all 3 options
  - Empirical benchmarks
  - Recommendation for Sprint 5 and Sprint 6
  - Risk assessment

- **Proof of Concept:** `src/poc-worker-threads.ts`
  - Demonstrates Option B (Worker Threads)
  - Tests normal plugin execution, memory limit enforcement, and isolation
  - Validates that Worker approach is technically viable

## Key Findings

### Recommendation Summary

**Sprint 5 (Today):**

- Keep current timeout-only approach
- Document as MVP limitation
- Add security risk note

**Sprint 6 (Gated by outreach signal):**

- If >=3 customer signals for "memory-isolated plugins": implement Worker Threads
- Effort: ~16h
- Design: serialize plugin code, spawn Worker with resourceLimits, IPC for hook registration

### Performance Trade-offs

- **Current (timeout only):** 0.1ms overhead, no memory isolation
- **Worker Threads:** 5-10ms overhead per plugin, real memory isolation
- **Boot latency impact:** ~15-20ms for 3 plugins (acceptable)

### Security Posture

- **Option A (current):** Malicious plugin can OOM the server
- **Option B (Workers):** Plugin OOM isolated to worker, parent safe
- **Option C (process limit):** Interim safety net if we add `--max-old-space-size=512`

## Proof of Concept Results

Run with: `npm run dev`

Expected output:

```
Test 1: Normal plugin within memory limits
✅ Test 1 PASS: Plugin loads, hooks registered

Test 2: Plugin exceeding memory limit (100MB > 32MB)
✅ Test 2 PASS: Correctly rejected with OOM exception

Test 3: Concurrent plugins (isolation test)
✅ Test 3 PASS: Both plugins isolated, no cross-contamination
```

All 3 scenarios demonstrate:

- ✅ Worker Threads can enforce V8 heap limits via `resourceLimits`
- ✅ OOM exception properly caught, parent process unaffected
- ✅ Concurrent plugins maintain isolation
- ⚠️ Code serialization required (no closure context in workers)

## Next Steps

1. Present findings to Román + Alejandro for Sprint 6 planning
2. If approved: Create ADR-021 "Worker Threads Plugin Sandbox Architecture"
3. If not approved: Document as Sprint 6+ future work with clear blockers

## References

- Spike report: `../../docs/spikes/spike-vm-context-memory-limit.md`
- PoC code: `src/poc-worker-threads.ts`
- Related ADRs:
  - ADR-004: Plugin Lifecycle & Crash Isolation
  - ADR-013: Circuit Breaker Stress Findings
  - ADR-020: Plugin Loader Runtime
  - ADR-018: Bridge Security Boundary (Helena)

## Architecture Notes

### Worker Threads with resourceLimits

V8 enforces the resource limit at the GC boundary:

- `maxOldGenerationSizeMb`: Limit for long-lived objects (default: unlimited)
- `maxYoungGenerationSizeMb`: Limit for short-lived objects (default: unlimited)

When limit exceeded: `RangeError: JavaScript heap out of memory`

IPC overhead: ~0.1-0.5ms per message (hook registration serialized)

### Code Serialization Challenge

Plugin code must be serialized to string before passing to Worker:

```typescript
// Current (sync function object)
await runInSandbox(pluginFn, hooks, context);

// With Workers (code string)
const pluginCode = fs.readFileSync(pluginFile, "utf8");
await runInSandbox(pluginCode, hooks, context);
```

This prevents plugins from capturing closure variables during init. Acceptable trade-off for isolation.

## Open Questions

1. Should we pool Workers (reuse across plugins) or spawn fresh per plugin?
   - **Current PoC:** Fresh spawn per plugin (simpler, observable cost)
   - **Production:** Pool if boot latency becomes issue

2. How do we handle plugin shutdown/cleanup with Workers?
   - **Current:** Worker terminates, no explicit cleanup call
   - **Future:** Hook into `context.disposeAll()` to signal worker cleanup

3. Should plugin code be cached or re-read from disk each boot?
   - **Current PoC:** Re-read (simpler, testable)
   - **Production:** Cache + watch for changes

---

**Authored by:** Raúl (Dev Backend)  
**Date:** 2026-04-19  
**Status:** Complete — awaiting sprint planning decision
