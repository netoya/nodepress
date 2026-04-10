## Meet 2026-04-09 — Ciclo de vida plugins Node vs PHP

- **Spike Sprint 1 ampliado:** (1) php-wasm con shortcode plugin WP real, (2) benchmark vm.Context con plugin 50 hooks. 2 días. **Date:** 2026-04-09
- **Raúl implementa:** `wrapSyncFilter` + `wrapAsyncAction` + circuit breaker (auto-desactiva plugin tras N errores). Sprint 1. **Date:** 2026-04-09
- **Plugins compilan a CJS:** vm.Module experimental, CJS es la opción segura. Build con esbuild/tsup. **Date:** 2026-04-09
- **vm.Context overhead:** ~5-15µs por llamada. 1-3ms por request con muchos hooks. Aceptable. **Date:** 2026-04-09
- **unhandledRejection escapa vm.Context:** Resuelto con wrappers + process.on handler. **Date:** 2026-04-09
- **while(true) no aislable con vm.Context:** Limitación documentada MVP. Worker Threads futuro. **Date:** 2026-04-09
