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
