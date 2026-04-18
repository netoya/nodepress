## Meet 2026-04-09 — Cómo llevar NodePress al siguiente paso

- **Sprint 0 (Ingrid):** Schema Drizzle para posts y users en packages/db. Días 3-5 (depende de docker-compose de Román). **Date:** 2026-04-09
- **Sprint 1 (Ingrid):** Content engine posts CRUD + 5 endpoints REST WP-compatible + test harness WP API conformance. Carmen ayuda con rutas. **Date:** 2026-04-09
- **Auth simplificado sprint 1:** Bearer token = admin. No implementar roles/capabilities hasta sprint 2. **Date:** 2026-04-09
- **Core no importa de DB:** Regla no negociable. server importa core + db, nunca al revés. **Date:** 2026-04-09
- **Contrato API:** WP REST API Handbook como spec. Lucas mockea contra eso. **Date:** 2026-04-09
- **JSONB typing:** Definir PostMeta, UserCapabilities como interfaces TS estrictas antes de queries. **Date:** 2026-04-09

## Meet 2026-04-09 — Compatibilidad plugins PHP WordPress

- **$wpdb es el bloqueante:** Plugins con SQL directo contra MySQL sin solución viable en PG. **Date:** 2026-04-09
- **Filtros síncronos + PHP:** 5-50ms overhead por IPC crossing. Inaceptable para php-fpm, aceptable para php-wasm en shortcodes. **Date:** 2026-04-09
- **Tier 2 php-wasm:** Solo lógica de contenido. Sin acceso DB. Plugins que necesitan DB → portado JS. **Date:** 2026-04-09
- **CLI port-plugin:** Roadmap Sprint 2. Ingrid + Román definen spec. **Date:** 2026-04-09

## Meet 2026-04-09 — nodepress-wp-plugin-server

- **Plugin-server Tier 3 Future:** No en roadmap activo. Solo si demanda enterprise real. **Date:** 2026-04-09
- **Schema mapping PG→MySQL:** JSONB→EAV es semanas de trabajo. Serialización PHP en Node requerida. **Date:** 2026-04-09
- **Bidireccional descartado v1:** Read-only MySQL para PHP. Plugins que mutan datos (WooCommerce) excluidos. **Date:** 2026-04-09
- **Base recomendada:** PHP custom mínimo con shims, NO WP core stripped. **Date:** 2026-04-09

## Meet 2026-04-09 — Ciclo de vida plugins Node vs PHP

- **Ingrid diseña PluginContext + DisposableRegistry** (types.ts). Sprint 1 semana 1. **Date:** 2026-04-09
- **Hook cleanup:** `pluginId` en HookEntry + `removeAllByPlugin()`. Propuesta de Ingrid adoptada. **Date:** 2026-04-09
- **`plugin_registry` table:** slug PK, name, version, status, activated_at, error_log, meta JSONB. Sprint 1. **Date:** 2026-04-09
- **Dispose timeout:** 5s por plugin. Si cuelga, kill + log + alerta. **Date:** 2026-04-09
- **Filtros sync + Promise detection:** `wrapSyncFilter` devuelve valor sin modificar si callback retorna Promise. **Date:** 2026-04-09
- **Estado DRAINING:** Inflight completan antes de dispose. Timeout 10s. **Date:** 2026-04-09

## Sprint 1 día 1 — contrato de hooks

- **Q1 — HookRegistry recibe FilterEntry construida:** Aprobado sin cambios. `PluginContext` como único inyector de `pluginId` mantiene el invariante de seguridad. Cualquier alternativa que acepte `fn` + `opts` directamente en el registry permitiría construir entries con `pluginId` arbitrario. **Date:** 2026-04-17
- **Q2 — `applyFilters<T, R = T>` cerrado a `R = T` en v1:** Aplicado. El registry no puede verificar coherencia de tipos en una cadena de entries heterogéneas. Silenciosa desviación de tipo en runtime supera el beneficio teórico. Reabierto si aparece caso documentado con ADR. Cambio aplicado en `types.ts` — `applyFilters<T>` devuelve `T`. **Date:** 2026-04-17
- **Q3 — `addHook` en PluginContext:** Mantenido. ADR-005 lo documenta explícitamente como soporte para plugins portados. Alias tipado, coste mínimo, win de compatibilidad real. **Date:** 2026-04-17
- **DisposableRegistry creada en context.ts:** `register(dispose)` + `disposeAll(): Promise<void>`. `PluginContext extends DisposableRegistry`. Re-exportada desde hooks/index.ts. Typecheck verde. **Date:** 2026-04-17

## Session Todos
- move-migrations-to-drizzle: done
- clean-duplicate-migrations: done

## Meet 2026-04-17 — Kickoff Sprint 1 y puesta al día

- **Filters sync, actions async — asimetría WP mantenida:** ADR-005 la documenta Román. **Why:** compat WP es la tesis. **How to apply:** tipos en PluginContext deben reflejar asimetría, no forzar Promise<T> en filters. **Date:** 2026-04-17
- **Orden ataque Sprint 1:** día 1-2 #19 PluginContext types + #18 Auth (paralelos, infra pequeña) → día 2-3 spec OpenAPI → día 3+ Carmen arranca #15+#16 contra spec → #17 test harness corriendo ANTES de endpoints "completos". **Date:** 2026-04-17
- **Spec OpenAPI obligatoria antes de que Carmen toque código:** Carmen es Haiku, ambigüedad en spec = código fuera de WP compat. Yo escribo spec, yo reviso PR. **Date:** 2026-04-17
- **Test harness WP conformance debe correr ANTES de marcar endpoints completos, no después.** **Why:** detectar incompat al final = rework de días. **Date:** 2026-04-17
- **Corrección ruta migración plugin_registry en PROJECT_STATUS:** quedó en packages/db/drizzle/ tras cleanup (no en packages/db/src/). **Date:** 2026-04-17
- **Contrato HookEntry con Román:** { pluginId, priority, fn }. Sesión 30 min post-kickoff para congelar firma. **Date:** 2026-04-17
- **Cualquier desvío de semántica WP requiere ADR.** Aplicable a API design también: si endpoint devuelve shape no-WP, ADR obligatoria. **Date:** 2026-04-17
