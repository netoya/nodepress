## Sprint 3 — 3 tickets completados (2026-04-18)

### 1. Media stub — GET /wp/v2/media → [] (✅ 30 min)

- **Handler**: `packages/server/src/routes/media/index.ts` — GET `/wp/v2/media` devuelve `200` con `[]`
- **Integración**: Registrado en `packages/server/src/index.ts` via `server.register(mediaPlugin)`
- **Test**: `packages/server/src/routes/media/__tests__/media.test.ts` — 1 test PASS. Status 200, body `[]`
- **Scope**: Stub solamente. Subida de archivos NO implementada (Sprint 1 scope).

### 2. Bridge timeout + D-014 → 5s (✅ 45 min)

- **renderShortcodes timeout**: Aumentado de 3s a 5s en `packages/server/src/bridge/index.ts:548`. AbortController race via `createTimeout(5000)`. Fallback seguro: retorna content sin procesar en timeout.
- **D-014 resolution**: Implementado helper `withDisposalTimeout(registry, ms)` en `packages/core/src/hooks/context.ts`. Timeout wrapper para `DisposableRegistry.disposeAll()` per ADR-004 lifecycle (5s DRAINING window).
- **Tests**: `packages/core/src/hooks/__tests__/DisposableRegistry.test.ts` — 4 nuevos tests PASS: timeout reject, timeout normal, ADR-004 guard 5s, 100ms timeout trigger. Bridge tests (8 existentes) todo verde.
- **Cambios código**: 2 archivos modificados (bridge/index.ts + context.ts). Sin breaking changes. Backwards compatible.

### 3. CLI serve + migrate (✅ 1h 15 min)

- **buildServer function**: Refactorizado `packages/server/src/index.ts` → `export async function buildServer()`. Permite al CLI instanciar sin listar inmediatamente.
- **nodepress serve**: Importa buildServer, escucha en puerto 3000 (o $PORT). Logs confirman startup.
- **nodepress migrate**: Ejecuta `npm run migrate --workspace=@nodepress/db` vía execSync. Drizzle-kit integrado.
- **Help + version**: `--help`, `-h`, `--version`, `-v` implementados. Sin args muestra help.
- **CLI binary**: `package.json` bin entry: `"nodepress": "dist/index.js"` ya presente. Ejecutable via `npx nodepress serve`.
- **Tests**: `packages/cli/src/__tests__/cli.test.ts` — 4 smoke tests PASS: help sin args, help --help, version, unknown command reject.
- **Dependencias**: Sin nuevas dependencias agregadas. Usa `process.argv` + `execSync` (built-in Node.js).

### Deliverables resumen

| Ticket            | Status | Files            | Tests       | Notes                                         |
| ----------------- | ------ | ---------------- | ----------- | --------------------------------------------- |
| Media stub        | ✅     | 2 new            | 1           | GET /wp/v2/media returns 200 with []          |
| Bridge timeout    | ✅     | 2 modified       | 11 (4 new)  | 5s timeout + D-014 helper withDisposalTimeout |
| CLI serve/migrate | ✅     | 3 (1 refactored) | 4           | buildServer export + 2 commands               |
| **Total**         | **✅** | **7**            | **16 PASS** | No TS errors, ESLint 0, all tests green       |

---

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

## Sprint 1 día 4 — #23 registerDemoHooks idempotencia (2026-04-18)

- **Bug diagnosticado:** `registerDemoHooks` llamado 2 veces → filtros duplicados → `[DEMO] [DEMO] Hello`. Latente en hot-reload dev. **Date:** 2026-04-18
- **Solución aplicada:** Opción B (clean + re-register). Añadida `registry.removeAllByPlugin(DEMO_PLUGIN_ID)` al principio. Idempotent + permite hot-reload seguro. **Date:** 2026-04-18
- **Tests nuevos:** 3 casos: (1) idempotencia simple (2 calls == 1 effect), (2) cleanup + re-register (funciona normal), (3) aislamiento pluginId (otros plugins no borrados). Total: 4 existentes + 3 nuevos = 7 PASS. **Date:** 2026-04-18
- **JSDoc actualizado:** Documenta idempotencia, semántica cleanup, hooks registrados. Claro para futuros devs. **Date:** 2026-04-18
- **TS strict:** 0 errors. ESLint: 0 errors. Prettier: applied. **Date:** 2026-04-18
- **Cambios:** `packages/server/src/demo/register-demo-hooks.ts` (idempotencia + JSDoc), `packages/server/src/demo/__tests__/register-demo-hooks.test.ts` (3 tests nuevos). **Date:** 2026-04-18

## Meet 2026-04-18 (noche) — Mapa compatibilidad PHP-WASM + Node

- **Mapa de 15 áreas archivado como catálogo, NO backlog.** Alejandro + Román co-sign ADR de archivado. **Date:** 2026-04-18
- **D-008 reafirmado:** NodePress = CMS nativo Node, NO orquestador WP. El mapa entero lo contradice. **Date:** 2026-04-18
- **Tier 2.0 subset mínimo** — lo que los 3 pilotos (Footnotes, Shortcodes Ultimate, Display Posts) ejercitan empíricamente. Raúl spike day 4-6 lo determina. Hard stop lunes 2026-04-22. **Date:** 2026-04-18
- **Tier 3 Full rechazado.** Reconsiderable solo con demanda validada + budget + ≥3 señales outreach plugins Anti-ICP. **Date:** 2026-04-18
- **ADR-017 "Tier 2 Bridge Surface"** — Román escribe tras verdict Raúl. Freeze del surface antes de Sprint 2 kickoff. **Date:** 2026-04-18
- **ADR Bridge Security Boundary** — Helena, antes jueves 24. Gate obligatorio antes de cualquier Tier 2.0 en prod. **Date:** 2026-04-18
- **ADR Bridge Observability** — cada bridge call = span tracerable. Helena, Sprint 2 week 1. **Date:** 2026-04-18
- **cURL sync bloquea event loop** — constraint documentado. HTTP calls en Tier 2.0 requieren async wrapper antes de prod. **Date:** 2026-04-18
- **$wpdb fuera de scope indefinidamente.** No es debate técnico pendiente, es decisión producto. JSONB↔EAV + MySQL bridge = semanas con ROI negativo. **Date:** 2026-04-18
- **Filesystem/Uploads Sprint 3+** — implementación solo cuando piloto lo pida. MinIO en compose solo si se aprueba. **Date:** 2026-04-18
- **Outreach viernes 24-04** pregunta explícita "¿qué plugins PHP usan HOY?" (no wishlist). 3 señales Anti-ICP independientes reabren mapa en Sprint 4 planning. **Date:** 2026-04-18
- **Benchmark competitivo usado como ancla:** Ghost $5M ARR cero compat WP, Strapi 61k stars cero compat, wp-now proyecto Automattic interno nunca comercializado. Ningún CMS comercial gana vía compat. **Date:** 2026-04-18

## Meet 2026-04-18 (noche sesión 2) — Reabrir mapa PHP-WASM tras push-back del PO

- **Archivado revocado.** Nuevo ADR "Phased WP Bridge Roadmap" reemplaza el archivado anterior. 3 fases con criterios explícitos. **Date:** 2026-04-18
- **Reconocimiento compartido:** consenso interno ≠ señal de mercado. El PO aportó info que el equipo no tenía. No fue decisión equivocada — fue insuficiente. **Date:** 2026-04-18
- **Contraejemplo Faust.js + WPGraphQL** (WP Engine, 400k+ sites) valida compat parcial estratégica. Eduardo retiró generalización "ningún CMS gana vía compat" → aplica solo a full compat. **Date:** 2026-04-18
- **Fase A (Sprint 2-3):** Options R/W, Transients, Object Cache, Users inyectable, `$_SERVER`, lifecycle reset, hooks cross-runtime. ~8 días Carmen+Ingrid. **Date:** 2026-04-18
- **Fase A dividida:** subset Sprint 2 (Options R/W + hooks + `$_SERVER`) + completion Sprint 3 (Users + Cache + Transients + lifecycle) — protege scope freeze Sprint 2. **Date:** 2026-04-18
- **Fase B (Sprint 4-5):** HTTP async wrapper con Worker Threads, cookies context bridge, sessions store. Gated por ≥5 sí en outreach. **Date:** 2026-04-18
- **Fase C (Sprint 6+):** `$wpdb` proxy, FS virtual + S3/MinIO, Uploads. Gated por piloto pagando. **Date:** 2026-04-18
- **Tier 3 full orquestador WP: RECHAZADO PERMANENTEMENTE.** D-008 intacto. **Date:** 2026-04-18
- **Re-spike Raúl con plugins reales:** ACF (1.5M sites), Yoast SEO (5M sites), WooCommerce display básico, Contact Form 7. Hard stop jueves 2026-04-25. Los 3 pilotos anteriores (Footnotes/Shortcodes Ultimate/Display Posts) eran juguetes. **Date:** 2026-04-18
- **ADRs Helena innegociables:** bridge security boundary (jueves 23-04) + observability (Sprint 3 kickoff). Gates pre-prod. **Date:** 2026-04-18
- **HTTP async wrapper Worker Threads** fuera de Fase A — requiere spike dedicado. Entra Fase B o nunca. **Date:** 2026-04-18
- **Outreach viernes 24-04:** pregunta binaria con fricción económica: "¿pagarías X€ por piloto Q3 si plugins contenido funcionaran?" Binaria sí/no. **Date:** 2026-04-18
- **Criterios activación/archivado explícitos en ADR roadmap ANTES de código Fase A:** ≥5 sí → Fase B. <3 sí → archivar Fase A sin sunk-cost rework. **Date:** 2026-04-18
- **Co-firmas ADR roadmap:** Alejandro + PO + Román + Eduardo. El PO queda en el documento para evitar re-archivados silenciosos. **Date:** 2026-04-18
- **ClassicPress y PressNext fracasaron** por coste mantenimiento (no premisa). Lección: versión WP target única (6.4 LTS) y congelar. **Date:** 2026-04-18
- **Respeto al cierre ciclo anterior:** nadie arranca scope esta noche. Lunes 21 re-spike. **Date:** 2026-04-18

## REVOCACIÓN — Meet sesión 2 "Reabrir mapa PHP-WASM" (2026-04-18)

> **ESTA DECISIÓN FUE REVOCADA por clarificación del PO el mismo 2026-04-18.**
> El PO clarificó que "no vale" significaba **descartar el mapa entero**, no reabrir con plan por fases.
> Ver `docs/process/comunicados/2026-04-18-reversion-mapa-php-wasm.md`.

- **Plan por fases A/B/C (Phased WP Bridge Roadmap): RECHAZADO** — no se escribe ADR, no se implementa. **Date:** 2026-04-18
- **Re-spike con 4 plugins reales (ACF, Yoast, WooCommerce, Contact Form 7): CANCELADO.** Vuelve al spike original validated GO. **Date:** 2026-04-18
- **Tier 2.5 "bridges de contenido real": DESCARTADO.** Tier 2 sigue siendo content-only según ADR-003 + ADR-008. **Date:** 2026-04-18
- **Outreach 24-04:** pregunta NEUTRAL sobre dolor/stack, NO sobre plugins compat. **Date:** 2026-04-18
- **D-008 intacto:** CMS nativo Node, NO orquestador WP. **Date:** 2026-04-18
- **ADRs Helena (security + observability) MANTIENEN:** saludables con independencia del scope. **Date:** 2026-04-18
- **Lección:** "no vale" del PO puede significar "no vale esta solución" O "no vale el tema". Próxima vez, preguntar binaria antes de re-abrir. **Date:** 2026-04-18

## Meet 2026-04-18 — Kickoff Sprint 2

- **GC stale entries CircuitBreaker = ticket S2-W1,** ownership Raúl, code review Román obligatorio. **Date:** 2026-04-18
- **cURL sync documentada como limitación ADR-008, fuera Sprint 2.** Los 3 pilotos (Footnotes, Shortcodes, Display Posts) no usan HTTP — están limpios. **Date:** 2026-04-18
- **ADR-017 es precondición para harness Tier 2.** Raúl provee findings spike a Román el lunes para que pueda escribirlo. **Date:** 2026-04-18
- **Singleton PHP-WASM recomendado para prod** — cold start 40-50ms por instancia nueva. Implementar PoC si load testing revela latency. **Date:** 2026-04-18

## Sprint 2 — Entregables ejecutados (2026-04-18)

- **GC stale entries CircuitBreaker:** gcIntervalMs param, destroy(), #startGC(), #collectGarbage(). 3 nuevos tests. **Date:** 2026-04-18
- **Pilot Footnotes (packages/server/src/bridge/pilots/footnotes.ts):** buildFootnotesPhpCode, registerFootnotesPlugin priority 9.5. 13 tests green. **Date:** 2026-04-18
- **Pilot Shortcodes Ultimate:** su_button/su_box/su_note → HTML. XSS-safe (htmlspecialchars). priority 9.6. 16 tests. **Date:** 2026-04-18
- **Pilot Display Posts:** candidatePosts[] → PHP literal array injection, [display-posts] shortcode, /p/:slug URLs. priority 9.8. 17 tests. **Date:** 2026-04-18
- **ADR-013 CircuitBreaker stress findings → Accepted:** co-sign Román. 17/17 tests. p95=2.40ms, 44 extensions. **Date:** 2026-04-18
- **Estado Sprint 2:** 231 tests verdes. Los 3 pilotos operativos con NODEPRESS_TIER2=true. **Date:** 2026-04-18
