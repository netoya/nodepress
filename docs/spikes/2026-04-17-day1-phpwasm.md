# Spike #25 — PHP-WASM: Day 1 Findings

**Date:** 2026-04-17  
**Owner:** Raúl  
**Supervised by:** Román  
**Status:** EXPLORATORY — Setup blocker identified, architecture viable

---

## Estado del Ecosistema

### Package Status
- **Latest:** `@php-wasm/node@3.1.20` (published 2026-04-16)
- **Supported PHP versions:** 7.4, 8.0, 8.1, 8.2, 8.3, 8.4
- **Package size:** ~31 MB (unpacked)
- **Dependencies:** 20 packages including Express, fast-xml-parser, wasm-feature-detect

### Built-in PHP Extensions
- SQLite (sync database access)
- Libzip (archive operations)
- Libpng (image reading)
- OpenSSL (crypto)
- MySQL (connector, limited)
- CLI (command-line interface)

**Notable absences:**
- No GD / Imagick (image manipulation)
- No cURL (network requests)
- No PDO MySQL (only built-in MySQL extension)
- No filesystem write access without explicit bridge

### Known Limitations

| Constraint | Impact | Workaround |
|---|---|---|
| Synchronous only | Blocks event loop during PHP execution | Acceptable for <10ms content logic |
| No I/O by default | Filesystem / network blocked | Provide controlled bridges from JS |
| No native extensions | gd, imagick, curl unavailable | Use JS equivalents |
| WASM memory limit | ~2-4GB per instance | Multiple instances for isolation |
| Initialization overhead | First load requires WASM decode | ~200-500ms, cached thereafter |

---

## Setup Técnico — Bloqueadores Encontrados

### Attempt 1: Direct ESM Import
**Status:** ❌ Failed  
**Issue:** `PHPLoader.processId` not exported from module

```typescript
import { loadNodeRuntime, PHPLoader } from "@php-wasm/node";
// Error: PHPLoader does not export
```

### Attempt 2: Dynamic Import + Global Set
**Status:** ❌ Failed — Loader not accessible from globalThis  
**Issue:** PHPLoader is scoped within the WASM module compilation context

```typescript
(globalThis as any).PHPLoader = { processId: process.pid };
// Still throws: "PHPLoader.processId must be set before init"
```

### Root Cause
The @php-wasm/node package expects the PHP-WASM loader to be initialized by the package's internal entry point. The processId is checked at WASM instantiation time (deep in the compiled Emscripten code), before any user code can set it. This is a configuration issue in the build/loader, not an architectural blocker.

### Next Steps for Day 2
1. Inspect wordpress-playground CLI — they use @php-wasm/node successfully; their entry point likely has the correct initialization sequence
2. Try alternative approach: Use @php-wasm/universal with browser-compatible runtime first to validate logic
3. Contact wordpress-playground team — ask for Node.js example or debug sequence
4. Fallback: Evaluate if running PHP-WASM in a subprocess (Worker thread) works better

---

## Deliverable: Spike Structure Created

```
packages/spike-phpwasm/
├── package.json              # @php-wasm/node@3.1.20 + @php-wasm/universal
├── tsconfig.json             # Extends base config
├── README.md                 # Quick-start guide
├── src/
│   └── runner.ts             # Bootstrap code (setup debugging in progress)
└── test/
    └── (empty, for Day 2)
```

**Added to root package.json:**
```json
"spike:phpwasm": "npm run dev --workspace=packages/spike-phpwasm"
```

---

## Preguntas Abiertas (Días 2–3)

1. **PHPLoader initialization:** What is the correct sequence?
   - WordPress Playground CLI source code analysis
   - Email contact with maintainers if needed

2. **Shortcode execution latency:** Overhead for real WP shortcode?
   - Target: <20ms per invocation (ADR-003)
   - Includes WASM call + PHP execution + deserialization

3. **Memory footprint:** How much RAM per PHP instance?
   - Baseline WASM module: ~70MB
   - Per-request overhead: TBD

4. **Hook bridge serialization:** Efficiently serialize WP hook payloads?
   - Filter args: string, array, object (serializable)
   - Callbacks: PHP closures → cannot serialize, need strategy

5. **Database access:** Shortcodes that read options() work?
   - Options: bridge function wp_get_option() → JS → PG
   - Meta queries: flatten JSONB
   - Post/user reads: same approach

---

## Verdict: Día 1

### ✅ Continues to Day 2
**Reason:** Architecture is sound, no insurmountable blockers found.
- Ecosystem exists and is actively maintained (commit yesterday)
- Extensions cover most stateless content operations
- Setup issue is configuration, not capability

### 🚩 Flag: Setup Complexity
- Node.js integration has subtle initialization order requirements
- Documentation for Node.js use is minimal
- Mitigation: inspect wordpress-playground source or reach out

### 📋 Day 2 Criteria (must achieve)
1. PHP runner loads and executes trivial code (echo "test")
2. Measure load time + execution latency
3. Real WP shortcode plugin executes (Contact Form 7 or similar)
4. Hook registration intercepted and serialized to JS

### 📋 Day 3 Criteria (if Day 2 succeeds)
1. Full latency benchmark (50 hook firings)
2. Memory profiling (before/after plugin load)
3. Extension matrix: which PHP plugins match WASM capabilities
4. Final recommendation: Tier 2 viable (yes/no/conditional)

---

## References

- ADR-003: PHP Compatibility Strategy
- [@php-wasm/node NPM](https://www.npmjs.com/package/@php-wasm/node)
- [wordpress-playground GitHub](https://github.com/WordPress/wordpress-playground)
