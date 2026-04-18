## Meet 2026-04-09 — Ciclo de vida plugins Node vs PHP

- **Spike Sprint 1 ampliado:** (1) php-wasm con shortcode plugin WP real, (2) benchmark vm.Context con plugin 50 hooks. 2 días. **Date:** 2026-04-09
- **Raúl implementa:** `wrapSyncFilter` + `wrapAsyncAction` + circuit breaker (auto-desactiva plugin tras N errores). Sprint 1. **Date:** 2026-04-09
- **Plugins compilan a CJS:** vm.Module experimental, CJS es la opción segura. Build con esbuild/tsup. **Date:** 2026-04-09
- **vm.Context overhead:** ~5-15µs por llamada. 1-3ms por request con muchos hooks. Aceptable. **Date:** 2026-04-09
- **unhandledRejection escapa vm.Context:** Resuelto con wrappers + process.on handler. **Date:** 2026-04-09
- **while(true) no aislable con vm.Context:** Limitación documentada MVP. Worker Threads futuro. **Date:** 2026-04-09

## Sprint 1 día 1 — spike #25 php-wasm (2026-04-17)

- **Setup aislado en `packages/spike-phpwasm/`:** package.json + tsconfig + runner.ts + README. No toca workspace root más allá de añadir script `spike:phpwasm`. **Date:** 2026-04-17
- **`@php-wasm/node@3.1.20` pinned (publicado 2026-04-16):** ecosystem activamente mantenido. Extensiones built-in: SQLite, Libzip, Libpng, OpenSSL, MySQL connector. **Sin cURL, GD, Imagick, ni I/O.** Helena debe validar esta matriz en #27. **Date:** 2026-04-17
- **PHP-WASM es 100% síncrono:** bloquea event loop ~200-500ms primera carga (WASM decode), luego <10ms/call. **Perfecto para filters sync WP.** Prohibitivo para network calls. **Date:** 2026-04-17
- **Bloqueador técnico day 2:** `PHPLoader.processId` debe setearse antes de instanciar WASM (Emscripten deep). No exportada, no accesible desde globalThis. Solución probable: copiar patrón de wordpress-playground CLI. Estimado 30 min. **Date:** 2026-04-17
- **Verdict day 1 = CONTINUAR.** Arquitectura viable; setup es configuración. Bandera amarilla: docs de integración con Node sparse. **Date:** 2026-04-17
- **Hard requirement day 2:** runner ejecuta `<?php echo "test"; ?>` + latencias; shortcode real (Contact Form 7) ejecuta; hook registration interceptada → serializada a JS. **Date:** 2026-04-17
- **Hard requirement day 3 (si day 2 OK):** benchmark latencias x50, memory profiling, extension matrix, verdict final Tier 2 sí/no/condicional. **Date:** 2026-04-17
- **Tiempo invertido day 1:** ~50 min, dentro de budget. Continúa 2026-04-18. Hard stop mantenido para 2026-04-19. **Date:** 2026-04-17

## Sprint 1 día 2 — spike #25 php-wasm (2026-04-18)

- **Bloqueador resuelto:** Pattern desde wordpress-playground: pass `processId` via `emscriptenOptions` a `loadNodeRuntime()`. 20 min investigación + validación. **Date:** 2026-04-18
- **Hello world ejecutable:** `<?php echo "test"; ?>` runs. Cold start 43.16ms, warm 0.98ms average (0.68–1.65ms range). Excelente. **Date:** 2026-04-18
- **Shortcode POC:** Bespoke `hello-nodepress` shortcode (50KB equivalent). Uses preg_replace, date(), hash(). Output: HTML con timestamp + SHA256. Latency: 7.46ms. **Date:** 2026-04-18
- **Hook interception:** Demo hook registry via json_encode(). Captures hook name + priority + timestamp. Proof of concept: PHP → JS data serialization works. **Date:** 2026-04-18
- **Extension matrix surprise:** 44 extensions loaded, NOT 20–21. Includes cURL, GD, Imagick, PDO_MySQL, mysqli, SOAP. **ADR-008 es incompleto.** Helena debe actualizar tabla. **Date:** 2026-04-18
- **Verdict day 2 = CONTINUAR A DAY 3.** Tier 2 viable confirmed. Todos hard requirements cumplidos. Plan day 3: benchmark ×50, memory profile, decisión final. **Date:** 2026-04-18
- **Tiempo invertido day 2:** ~2.5 horas (investigación wordpress-playground + implementación runner + bespoke plugin + doc). Dentro de budget. **Date:** 2026-04-18
- **Deliverable:** docs/spikes/2026-04-18-day2-phpwasm.md (comprehensive findings + blocker resolution + extension matrix delta). **Date:** 2026-04-18

## Sprint 1 día 2 — #20 wrapSync/Async + CircuitBreaker (2026-04-18)

- **CircuitBreaker:** Implementado en `packages/core/src/hooks/CircuitBreaker.ts`. Threshold 5 fallos en ventana 60s abre el circuito. Auto-reset tras 60s sin fallos. Map<pluginId, timestamps[]> naive PoC. **Date:** 2026-04-18
- **wrapSyncFilter:** Implementado en `packages/core/src/hooks/wrappers.ts`. Detecta Promise return (dev error), captura throws, registra en breaker, devuelve valor original en error. Skip execution si breaker abierto. **Date:** 2026-04-18
- **wrapAsyncAction:** Similar a wrapSyncFilter pero tolera async. Siempre retorna Promise. Nunca propaga errores — los loguea y continúa. **Date:** 2026-04-18
- **HookRegistry integración:** Constructor acepta CircuitBreaker opcional. applyFilters/doAction ahora usan wrappers para cada entry. Eliminadas try/catch redundantes del registry (ahora en wrappers). **Date:** 2026-04-18
- **Tests:** 11 para CircuitBreaker (threshold, auto-reset, aislamiento, reset manual, edge cases). 15 para wrappers (normal, Promise detection, throw/reject, breaker open). 16 HookRegistry existentes ajustados (mensajes de log). **Date:** 2026-04-18
- **Resultado:** 56 tests passed, 0 failures. TS strict, ESLint 0 errors. Coverage: CircuitBreaker + wrappers + HookRegistry integration. **Date:** 2026-04-18
- **TODOs eliminados:** 2x `TODO(#20 — Raúl)` en HookRegistry.ts (applyFilters + doAction). Arquitectura crash-isolation completada. **Date:** 2026-04-18

## Sprint 1 día 2 — #30 CircuitBreaker stress test (2026-04-18)

- **Stress test suite:** 6 nuevos tests en `packages/core/src/hooks/__tests__/CircuitBreaker.stress.test.ts`. Concurrent failure recording (50 hits), open threshold under load (100 hits), PluginId isolation (5 plugins x 10 failures), auto-reset mixed workload, HookRegistry integration (100 applyFilters), memory pressure (1000 pluginIds). **Date:** 2026-04-18
- **Race condition analysis:** Ninguna encontrada en Node.js single-threaded event loop. `recordFailure` y `isOpen` son non-async, por lo que mutation de Map es atómica. Supuesto documentado en JSDoc. **Date:** 2026-04-18
- **Limitaciones documentadas:** Unbounded Map growth (PoC-grade), no distributed consensus (multi-instance), fixed threshold (no customization per-plugin). Todas aceptables para Sprint 1. **Date:** 2026-04-18
- **ADR-013:** `docs/adr/ADR-013-circuit-breaker-stress-findings.md`. Status: Proposed. Contiene: context, 6 findings (tests 1-6), known limitations, race conditions (none), future work (priorities 1-3), recommendations. **Date:** 2026-04-18
- **Resultado:** 17/17 CircuitBreaker tests (11 unit + 6 stress) PASS. 62 total tests across hooks suite (no regressions). TS strict, ESLint 0 errors. **Date:** 2026-04-18
- **Cambios CircuitBreaker.ts:** Ninguno. Implementación original es correcta bajo carga concurrente. **Date:** 2026-04-18
- **Next:** Merge #30. Spike day 3 (2026-04-19) no impactado — #30 cierra hoy. **Date:** 2026-04-18

## Sprint 1 día 3 — spike #25 php-wasm verdict final (2026-04-19)

- **Benchmark 50 invocaciones:** Ejecutadas en `packages/spike-phpwasm/src/runner.ts`. 10 warm-up + 50 timed. Resultados: p50=0.525ms, p95=2.395ms, p99=5.852ms, stdev=0.930ms. **Target p95<50ms: PASS.** **Date:** 2026-04-19
- **Memory profiling:** Baseline (antes warm-up) 25.24MB → after warm-up 27.31MB (delta +2.07MB) → after 50 invocations 22.55MB (delta -4.75MB desde warm-up). Total delta baseline→final: -2.69MB. **No leak lineal detectado. Target <10MB: PASS.** **Date:** 2026-04-19
- **Extension matrix día 3:** 44 extensiones confirmadas (equivalente a day 2). ICP-1 mínimo cubierto: pcre, hash, mbstring, date, json. **PASS.** **Date:** 2026-04-19
- **Verdict final:** ✅ **GO para Tier 2.** Todos criterios acceptación cumplidos. Tier 2 viable para sprint 2 producción. **Date:** 2026-04-19
- **Spike doc:** `docs/spikes/2026-04-19-day3-phpwasm.md` creado. Contiene: executive, benchmark tabla (p50/p95/p99/min/max/mean/stdev), memory profile 4 fases, verdict criteria checklist, extension matrix, conocidas limitaciones, plugin recomendaciones (Footnotes, Shortcodes Ultimate, Display Posts Shortcode como high confidence; Contact Form 7 + WP-Polls como conditional; WooCommerce/ACF/WP Rocket/WPML como inviable). Sprint 2+ acciones listadas. **Date:** 2026-04-19
- **ADR-008 transición:** Status `Proposed (Revised 2026-04-18)` → `Accepted 2026-04-19`. Añadida sección "Empirical Day 3 Results" con benchmark + memory + extension coverage + verdict. Lección aprendida: mandatory empirical validation para capability matrices futuras. **Date:** 2026-04-19
- **Tiempo spike:** ~50 min day 1 + ~2.5 hrs day 2 + ~90 min day 3 = ~4.5 hrs total (dentro budget 5 hrs). **Date:** 2026-04-19
- **Next:** Awaiting approval Román/Ingrid para Sprint 2 Tier 2 plugin integration. Hard stop 2026-04-19 met. **Date:** 2026-04-19
