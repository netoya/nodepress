# Project Memory — tech-lead-roman @ NodePress

> Decisiones, contexto y aprendizajes específicos de este proyecto.

---

## Decisions

- **2026-04-09:** ADR-001 Architecture Overview — stack definido: Node.js/TS + Fastify + PostgreSQL + Drizzle ORM + React admin. Hook system event-driven con prioridades numéricas WP-compatible.
- **2026-04-09:** ADR-002 Folder structure — monorepo con workspaces: core, plugins, themes, admin, cli.

## Context

- Proyecto en fase PoC. Objetivo: compatibilidad con ecosistema WP (hooks, REST API v2, roles).
- PostgreSQL elegido sobre MySQL: mejor JSON support, better concurrency, extensiones.

## Lessons

- **2026-04-16:** Root `README.md` authored in English. License referenced as
  declared in `package.json` (GPL-3.0-or-later); `docs/business/licensing.md`
  notes dual-license evaluation is open — README links to it instead of
  freezing the decision.
- **2026-04-16:** `allowImportingTsExtensions` is incompatible with
  `composite: true` + emit (which is our setup in `tsconfig.base.json`:
  `declaration`, `declarationMap`, `sourceMap`, `outDir`). TS requires
  `noEmit` or `emitDeclarationOnly` alongside that flag. CI broke in PR #17
  after a previous commit added it "for CI". The flag was unnecessary — zero
  `.ts` imports exist in the repo (imports already use `.js` per NodeNext).
  Removed the flag from `tsconfig.base.json`. Rule: never add tsc flags
  without validating the full semantic implications (emit vs noEmit,
  composite, moduleResolution).

## Meet 2026-04-09 — Cómo llevar NodePress al siguiente paso

- **Sprint 0 (Román):** docker-compose.yml, tsconfig.base.json, vitest.workspace.ts, .env.example. Días 1-2. CI con Helena días 3-5. **Date:** 2026-04-09
- **Sprint 1 (Román):** Hook system (HookRegistry) en packages/core/src/hooks/ con cobertura 100%. **Date:** 2026-04-09
- **Auth simplificado sprint 1:** Bearer token = admin. Roles WP-compatible en sprint 2+. **Date:** 2026-04-09
- **Core no importa de DB:** Regla arquitectónica no negociable, parte de DoD. **Date:** 2026-04-09
- **Admin sidebar estático sprint 1:** Diseñar protocolo extensión plugins antes de sprint 3. **Date:** 2026-04-09
- **Orden implementación:** db → core → server → plugin-api → theme-engine → cli. Admin en paralelo. **Date:** 2026-04-09
- **vm.Context benchmark:** Necesario antes de sprint 3 (plugin-api). **Date:** 2026-04-09

## Meet 2026-04-09 — Compatibilidad plugins PHP WordPress

- **ADR-001 se mantiene** para runtime core. No hay PHP bridge como arquitectura base. **Date:** 2026-04-09
- **ADR-003 pendiente:** "PHP Compatibility Strategy" — Tier 1 JS/TS nativo, Tier 2 php-wasm (lógica contenido, sin DB), sin Tier 3. A escribir post-spike. **Date:** 2026-04-09
- **Spike php-wasm:** Raúl ejecuta, Román supervisa. 2 días Sprint 1. Shortcode plugin WP real. **Date:** 2026-04-09
- **CLI `nodepress port-plugin`:** En roadmap Sprint 2. Analiza PHP, genera scaffold JS. **Date:** 2026-04-09
- **php-wasm bridge:** Shim PHP intercepta add_action/add_filter → serializa → HookRegistry JS. Doble crossing aceptable para shortcodes (microsegundos WASM). **Date:** 2026-04-09
- **Línea clara Tier 2:** Solo lógica de contenido pura. Sin I/O, sin DB, sin networking. Plugins con DB → portado JS obligatorio. **Date:** 2026-04-09

## Meet 2026-04-09 — nodepress-wp-plugin-server

- **Plugin-server documentado como Tier 3 Future en ADR-003.** No aprobado, no en roadmap activo. **Date:** 2026-04-09
- **Diseño si se activa:** PHP custom mínimo (NO WP core), shims 300 líneas, $wpdb wrapper MySQL, solo acciones (no filtros síncronos), sync PG→MySQL unidireccional. **Date:** 2026-04-09
- **Estimación:** 7-8 semanas senior. No antes de Sprint 3 + demanda enterprise concreta. **Date:** 2026-04-09
- **Bloqueador técnico:** apply_filters síncrono + HTTP no viable. v1 solo do_action (async). **Date:** 2026-04-09
- **Pre-requisitos Helena:** ADR nuevo, threat model, DR coordinado, CVE pipeline. **Date:** 2026-04-09

## Meet 2026-04-09 — Ciclo de vida plugins Node vs PHP

- **Instalación:** `plugins/` filesystem + `options.active_plugins` (boot) + `plugin_registry` table (admin). **Date:** 2026-04-09
- **Activación sin restart:** `dynamic import()` + cache busting versión+timestamp. Worker Threads solo dev. **Date:** 2026-04-09
- **PluginContext = DisposableRegistry:** Hooks, timers, listeners, connections se registran y limpian automáticamente. Timeout 5s. **Date:** 2026-04-09
- **Hook cleanup:** `pluginId` en HookEntry + `removeAllByPlugin()`. Cleanup incondicional. **Date:** 2026-04-09
- **Crash isolation:** `wrapSyncFilter` (detecta Promise, fail-safe) + `wrapAsyncAction` (try/catch). Circuit breaker auto-desactiva. **Date:** 2026-04-09
- **vm.Context para TODOS los plugins.** 1-3ms overhead aceptable. Uniformidad sobre optimización. **Date:** 2026-04-09
- **Plugins compilan a CJS** para vm.Context. `nodepress plugin build` con esbuild en CLI. **Date:** 2026-04-09
- **Estado DRAINING:** Desactivación no instantánea. Inflight requests completan, timeout 10s. **Date:** 2026-04-09
- **Estado en memoria:** Efímero, no sobrevive restart ni deactivate. Sin globals. **Date:** 2026-04-09

## Meet 2026-04-09 — Flujo de trabajo y documentación

- **Trunk-based dev:** main protegida, feat/NP-XXX branches < 3 días, squash merge. **Date:** 2026-04-09
- **PR review tiered:** core + plugin-api → Román obligatorio. Resto → peer. Max 400 LOC. **Date:** 2026-04-09
- **ADR-003 + ADR-004:** Escribir esta semana (Sprint 0). Antes de Sprint 1. **Date:** 2026-04-09
- **contributing.md + PR template:** Sprint 0 día 1-2. **Date:** 2026-04-09
- **docs/ estructura:** adr/, design/, api/, guides/, status/. **Date:** 2026-04-09

## Meet 2026-04-17 — Kickoff Sprint 1 y puesta al día

- **Filters sync, actions async — asimetría WP intencional:** ADR-005 a escribir esta semana. **Why:** compat WP es la tesis; forzar todo a async rompería plugins portados. **How to apply:** mantener la asimetría en HookRegistry y en wrapping de Raúl. **Date:** 2026-04-17
- **Contrato HookEntry + PluginContext.addHook() se congela día 1 con Ingrid:** 30 min sesión post-kickoff. Firma y semántica antes de que Raúl toque #20. **Why:** #14, #19, #20 enlazados — divergencia temprana = rework en cadena. **Date:** 2026-04-17
- **HookEntry forma acordada con Ingrid:** { pluginId, priority, fn }. removeAllByPlugin() parte del contrato público. **Date:** 2026-04-17
- **Raúl primeros 2-3 días = spike php-wasm (#25)** mientras espera contrato para #20. Hard stop día 3 si no hay resultado. **Date:** 2026-04-17
- **Cualquier desvío de semántica WP requiere ADR** antes de implementar. Regla impuesta por Alejandro. **How to apply:** en code review, si detecto desvío sin ADR, bloqueo merge. **Date:** 2026-04-17
- **Testing bar HookRegistry:** 100% coverage, ordering prioridades, removeAllByPlugin, property-based test add→remove→add idempotente. **Date:** 2026-04-17
- **Merge ci/db-migrations-cleanup → main es bloqueante para Sprint 1.** Lo ejecuto yo tras kickoff, squash. **Date:** 2026-04-17

## Sprint 1 día 1 — HookRegistry implementation (2026-04-17)

- **Estructura de datos HookRegistry:** 2 Map<string, Entry[]> separados (filters/actions). Listas ordenadas por priority asc con **inserción estable FIFO** en add\*. Hot path itera data pre-ordenada. **Date:** 2026-04-17
- **Error handling actual = try/catch + console.warn:** un filter/action que lanza no rompe el pipeline. Es placeholder. **Why:** resilience mínima; wrapSyncFilter + wrapAsyncAction + circuit breaker completo llegan con #20 (Raúl). **Date:** 2026-04-17
- **Logger inyectable pendiente:** `console.warn` hoy; abstraer en Sprint 2. TODO inline. **Date:** 2026-04-17
- **Tests 17/17 verdes:** 10 escenarios del brief + variantes (ordering, removeAllByPlugin, idempotencia manual 5 ciclos). `fast-check` no disponible — sustituido por bucle manual. **Date:** 2026-04-17
- **Coverage no medido formalmente:** `@vitest/coverage-v8` no instalado. Helena debe añadirlo junto al flat config ESLint. **Date:** 2026-04-17
- **Factory `createHookRegistry()` expuesta junto con la clase:** permite testing aislado sin estado global. **Date:** 2026-04-17
- **Admin package tests rotos (13 fallos pre-existentes):** `toBeInTheDocument` sin setup `@testing-library/jest-dom`. Ticket para Lucas/Marta — no bloqueo de core. **Date:** 2026-04-17

## Meet 2026-04-18 — equipo continuemos (Sprint 1 semana 2)

- **Scope congelado Sprint 1 — NO abrir Sprint 2 por adelantado:** hardening selectivo + prep quirúrgica. **Why:** 92% done con ritmo x6 es ventana peligrosa para scope creep. **Date:** 2026-04-18
- **/posts list + editor básico entran en Sprint 1** como completude demo: textarea sin bloques. Lucas + Marta. Filtros Martín+Román+Tomás para aprobar. **Date:** 2026-04-18
- **3 tickets hardening backend:** #28 integration tests Postgres real, #29 coverage db INSERT/SELECT/UPDATE, #30 stress circuit breaker concurrent. Ingrid. **Date:** 2026-04-18
- **Skeleton + ADR stub en cli/theme-engine/plugin-api** (3 paquetes con index.ts de 1 línea). Román, antes del viernes 2026-04-24. **Date:** 2026-04-18
- **Protocolo scope freeze activado:** tickets nuevos en Sprint 1 requieren Román + Tomás + Martín. Sin excepción. **Date:** 2026-04-18
- **CLA Assistant jueves 2026-04-23** (90 min Alejandro + Eduardo). Bloquea outreach. **Date:** 2026-04-18
- **Outreach privado arranca viernes 2026-04-24:** 15 calls CTOs ICP-1 con demo grabada, 10 días. Pregunta única: "¿Qué tendría que hacer NodePress para que migraseis un cliente piloto en Q3?" **Date:** 2026-04-18
- **ADRs 005-009 a Accepted antes viernes 24-04.** Sesión asíncrona miércoles. **Date:** 2026-04-18
- **R-2 (contract-freeze) formalizada en apéndice contributing.md** antes lunes 21-04. Tomás. **Date:** 2026-04-18
- **Burndown real cada lunes en GitHub Discussions** desde 21-04. Martín. **Date:** 2026-04-18
- **Messaging A/B test parqueado** a cierre Sprint — un frente abierto cada vez. **Date:** 2026-04-18
- **Temperature check equipo: sin señales burnout hoy** — Tomás sondea cada 3-4 días, no asume que flow = sostenible. **Date:** 2026-04-18

## Sprint 1 sem 2 día 0 — ADRs Accepted + skeletons (2026-04-18)

- **ADR-005 → Accepted (2026-04-18).** Semántica frozen, registry implementado (#14), types congelados. Sign-off propio: yo soy el autor.
- **ADR-009 ya estaba Accepted** (Carmen la creó así al aplicar Option A). Sin cambios.
- **ADR-006/007/008 quedan Proposed hoy:** 006/007 requieren sign-off explícito de Ingrid antes del viernes; 008 esperando verdict spike day 3. No los toco en esta ventana — son decisiones que no me pertenecen solo.
- **3 paquetes vacíos cerrados arquitectónicamente sin implementar:** `packages/cli/`, `packages/theme-engine/`, `packages/plugin-api/` pasan de `export {}` a surface de tipos completa (`types.ts` + `index.ts`). Decisión: commit de contratos ahora = congelar antes de que otros paquetes crezcan shims ad-hoc. Implementación real a Sprint 2+ (cli) / Sprint 3+ (theme-engine). **Date:** 2026-04-18
- **0 deps nuevas añadidas en el skeleton.** Intentional: `commander` o equivalente entra como decisión Sprint 2 con spike empírico, no scaffold-time commitment. Argv parser listado como Open Question en ADR-010. **Date:** 2026-04-18
- **plugin-api depende de @nodepress/core** (package.json + project reference en tsconfig). Re-exporta `PluginContext` + `DisposableRegistry` verbatim — un único import path para plugin authors y plugin hosts. **Date:** 2026-04-18
- **theme-engine deliberadamente desacoplado de core** en esta fase. El `Renderer` aplicará filtros vía `HookRegistry` en Sprint 3, pero cómo recibe la referencia (injection vs context vs singleton) es Open Question — no congelo el acoplamiento hoy. **Date:** 2026-04-18
- **ADR-010 (cli), ADR-011 (theme-engine), ADR-012 (plugin-api) creados en Proposed.** Cada ADR es scoping doc para el Sprint que implementa, no record de shipped behaviour. Estructura coherente con ADRs 005-009: Status, Context, Decision, Open Questions, References. **Date:** 2026-04-18
- **Regla latente:** sprints futuros — nunca dejar un paquete declarado en monorepo con solo `export {}` más de un sprint. Es deuda latente que se convierte en contrato vacuum para los paquetes vecinos. **Date:** 2026-04-18
- **Typecheck 3 paquetes nuevos: verde.** `tsc -b --force packages/cli packages/theme-engine packages/plugin-api` compila limpio. Los 9 errores pre-existentes en `packages/server/src/__tests__` y `routes/posts/__tests__` son de las last waves (demo-end-to-end.test.ts, posts.real-db.test.ts) — no introducidos por este trabajo. Tickets pendientes para Ingrid/Carmen. **Date:** 2026-04-18

## Meet 2026-04-18 (noche) — Post-mortem e1b7fbf quickstart roto

- **Diagnóstico:** 7 errores en cadena al arrancar desde clean clone. Ninguno detectado en 2 días por CI mockeado. Fallo SISTÉMICO, no personal. **Date:** 2026-04-18
- **Causa raíz arquitectónica:** ADR-001 NodeNext ESM no validó operacionalmente vs drizzle-kit CJS. Los 3 fixes tsconfig Sprint 0 fueron señal recurrente ignorada. **Date:** 2026-04-18
- **Causa raíz táctica:** migration manual `plugin_registry.sql` (Sprint 0 #21) silenció síntoma — sin journal, drizzle-kit no reconocía el dir como snapshot válido. **Date:** 2026-04-18
- **NodeNext se mantiene.** Workaround `NODE_OPTIONS="--import tsx"` para tooling CJS queda documentado en ADR-014. **Date:** 2026-04-18
- **CI verde ≠ proyecto arrancable:** "108 tests verdes" generó falso confort. Coverage sobre mocks no certifica sistema real. **Date:** 2026-04-18
- **Scope freeze NO aplica a hotfix restaurativo:** restaurar invariante ≠ feature nueva. Regla formalizada por Tomás. **Date:** 2026-04-18
- **TTFA (Time to First API Call) <5 min:** métrica operativa oficial desde este meet. Integrada en burndown semanal de Martín. **Date:** 2026-04-18
- **CI `smoke-fresh-clone` es hotfix bloqueante antes del jueves 23-04** (CLA Assistant con Eduardo). Helena ejecuta miércoles 22. **Date:** 2026-04-18
- **ADR-014 "Developer Quickstart Invariant"** — contrato escrito: `git clone && cp .env.example .env && docker-compose up -d && npm i && npm run db:drizzle:push && npm run dev` pasa en cualquier commit main. Román, jueves. **Date:** 2026-04-18
- **ADR-015 "Tooling runtime boundary"** — Sprint 2. Separación runtime / CI / developer tools con contratos explícitos. **Date:** 2026-04-18
- **Sprint 2 ticket:** recuperar `drizzle:generate + migrate` con journal comiteado. Ingrid brief + Carmen ejec. **Date:** 2026-04-18
- **`drizzle:push` es deuda de prod** — historial migraciones perdido hoy para desbloquear. **Date:** 2026-04-18
- **Regla contributing.md:** PRs que tocan packages/db/**, drizzle.config.ts, tsconfig\*, .env.example exigen smoke fresh-clone en PR body. **Date:\*\* 2026-04-18
- **DoD updated:** "Clean-clone test executed, documented in PR body". **Date:** 2026-04-18
- **Señal equipo sana:** 4 de 5 participantes asumieron responsabilidad sin ser forzados. Tomás indicador de madurez. **Date:** 2026-04-18
- **Martín asume fallo de governance:** commit no pasó por trío (Martín+Román+Tomás) pese a protocolo aprobado esa mañana. No se repite. **Date:** 2026-04-18

## Sprint 1 sem 2 día 0 noche — ADR-014 + R-5 entregados (2026-04-18)

- **ADR-014 "Developer Quickstart Invariant" creado en `Proposed`.** Invariante textual + flujo bash verbatim + TTFA <5 min como métrica operativa. Contrato verificable: cualquier commit en `main` pasa `git clone → curl http://localhost:3000/wp/v2/posts` sin intervención manual. **Date:** 2026-04-18
- **Alternativas registradas y descartadas con rationale:** `moduleResolution: "bundler"` (rompe `node dist/index.js` + fuerza bundler a consumers), CI mockeado (status quo, falló probadamente), script `quickstart.sh` (mitiga pero no garantiza — se mantiene como companion). **Date:** 2026-04-18
- **Scope de archivos que rompen el invariante congelado en ADR-014:** `packages/db/**`, `drizzle.config.ts`, `tsconfig*.json`, `package.json` (scripts tooling), `.env.example`, `docker-compose.yml`, `packages/server/src/index.ts`. Es el mismo scope que R-5 y el CI job de Helena — triángulo consistente. **Date:** 2026-04-18
- **Enforcement triángulo:** (1) CI `smoke-fresh-clone` (Helena, miércoles 22-04 antes CLA session), (2) R-5 en contributing.md (fresh-clone smoke en PR body), (3) TTFA en burndown semanal de Martín desde lunes 21-04. Tres mecanismos, tres modos de fallo distintos. **Date:** 2026-04-18
- **Workaround `NODE_OPTIONS="--import tsx"` queda documentado en ADR-014 como contrato explícito, no hack.** Todo script futuro que bridge NodeNext ↔ CJS sigue el mismo patrón. **Date:** 2026-04-18
- **`drizzle:push` sigue siendo deuda de prod** — ADR-014 lo reconoce pero no reabre la decisión; recuperar `drizzle:generate + migrate` con journal comiteado es ticket Sprint 2. **Date:** 2026-04-18
- **R-5 añadida a contributing.md** después de R-2, TOC actualizado (entrada 9), footer firmado Román. Formato coherente con R-2: when to trigger → how it runs → PR body format → anti-patterns. **Date:** 2026-04-18
- **Rollback trivial documentado en ADR-014:** si el invariante prueba ser inviable, revert + delete CI workflow + delete R-5 section. Partial rollback: mantener CI (cubre 5/7 failure classes), relajar R-5 humano. Opción registrada por si Tomás/Martín detectan fricción excesiva tras 2 semanas. **Date:** 2026-04-18
- **Sign-off propio en `Proposed`** — el ADR pasa a `Accepted` tras la primera ronda de CI `smoke-fresh-clone` verde en `main`, no antes. Evita certificar un contrato que aún no ha corrido una vez. **Date:** 2026-04-18

## Sprint 1 sem 2 día 0 noche — Demo boot gap cerrado (2026-04-18)

- **Gap cerrado:** hooks `pre_save_post` + `the_content` vivían solo en el test E2E. Ahora se registran al boot del server vía `NODEPRESS_DEMO_MODE=true`. **Date:** 2026-04-18
- **Ubicación elegida: `packages/server/src/demo/register-demo-hooks.ts` (NO `scripts/`).** Rationale: (1) respeta `rootDir: src` del tsconfig del server — un archivo en `scripts/` cross-package quedaría fuera del compilation scope y rompería `node dist/index.js` en prod, violando ADR-014; (2) resolución ESM NodeNext limpia con `./demo/register-demo-hooks.js`, sin path hacks relativos `../../../`; (3) coherente con D-006 — core no sabe del server, y el módulo demo es un consumer de `@nodepress/core`, pertenece al server. **Date:** 2026-04-18
- **Dynamic import condicional:** `if (process.env["NODEPRESS_DEMO_MODE"] === "true") { const { registerDemoHooks } = await import("./demo/register-demo-hooks.js") }`. Hot path limpio cuando DEMO_MODE=false — el módulo demo ni siquiera se carga. **Date:** 2026-04-18
- **`DEMO_PLUGIN_ID = "demo-plugin"` exportado** para que un futuro hot-reload pueda hacer `registry.removeAllByPlugin(DEMO_PLUGIN_ID)`. Coste cero, ganancia de reversibilidad. **Date:** 2026-04-18
- **Idempotencia NO garantizada deliberadamente:** documentado en JSDoc. Llamar `registerDemoHooks` dos veces registra los filtros dos veces. Contrato explícito > trampa silenciosa. **Date:** 2026-04-18
- **Tests 4/4 verdes en `src/demo/__tests__/register-demo-hooks.test.ts`:** hasFilter antes/después, aplicación correcta de ambos filtros, cleanup por pluginId. Full workspace: 119 passed / 1 skip pre-existente / 2 todos pre-existentes. **Date:** 2026-04-18
- **TypeScript error pre-existente confirmado** en `packages/db/src/seeds/__tests__/seeds.test.ts:40:31` (TS2554) — no tocado por este trabajo, ya documentado en memoria como ticket pendiente de la wave `ingrid`. **Date:** 2026-04-18
- **Docs demo-30-04-plan.md actualizado:** reemplazado placeholder "Register a hook at runtime" por flujo bash real con `NODEPRESS_DEMO_MODE=true npm run dev` + curl + output esperado. Alineado con R-5 (reproducibilidad fresh-clone). **Date:** 2026-04-18
- **.env.example documenta el flag** con default `false` — coherente con invariante Quickstart (ADR-014): clean clone arranca sin hooks extra. **Date:** 2026-04-18
- **Lección latente:** cuando un comportamiento vive "solo en el test" y se quiere exponer al runtime real, la tentación es duplicar en `scripts/`. Correcto: promover a módulo del paquete con tsconfig `include`, con dynamic import gated por env para no contaminar el hot path. **Date:** 2026-04-18

## Sprint 1 sem 2 día 0 noche — ADR-016 Demo Lifecycle Contract (2026-04-18)

- **Contexto:** la grabación del video demo 2026-04-18 tomó 4 iteraciones — cada una destapando una nueva clase de error (SPA nav no awaited, CORS en demo mode, slug collision 409, hooks duplicados por hot-reload). Diagnóstico propio post-whack-a-mole: el demo nunca tuvo lifecycle especificado. Cada clase de error se descubrió DURANTE la grabación, no durante el desarrollo. **Date:** 2026-04-18
- **ADR-016 "Demo Lifecycle Contract" creado en `Proposed`.** Formaliza que el demo es **artefacto de producto**, no script de un solo uso. Voz contract-style coherente con ADR-014 — el contrato son las 3 propiedades, todos los mecanismos derivan de ahí. **Date:** 2026-04-18
- **3 invariantes congeladas:** (1) Reproducibility — `demo:reset` es el entry point; (2) Idempotency — hooks dedup por pluginId, slugs auto-suffix WP-style, seeds upsert; (3) Determinism — sin timestamps volátiles en DOM visible, snapshots solo post-reset. **Date:** 2026-04-18
- **Obligaciones derivadas que cierran las 3 clases de error del incidente:** backend POST/PUT auto-suffix slug (cerró Carmen), hooks idempotentes vía `removeAllByPlugin` (cerró Raúl — mi nota previa "idempotencia NO garantizada deliberadamente" del commit anterior queda superseded), `demo:reset` como step 1 del script (cerró Marta). Los 3 fixes paralelos + este ADR cierran la clase de error — sin ADR, repetimos en el siguiente demo. **Date:** 2026-04-18
- **Alternativas descartadas con rationale explícito:** single-use script (no CI-validable), timestamp en título (oculta bug de dominio real que muerde plugins programáticos en prod), reset DB skip auto-suffix (enmascara bug portable). Cada rechazo documenta una trampa que el equipo podría caer sin este record. **Date:** 2026-04-18
- **Enforcement triángulo similar a ADR-014:** (1) `record-demo-video.sh` con `demo:reset` como step 1 obligatorio, (2) R-5 extendida — PRs tocando `packages/server/src/demo/**` o `scripts/record-*` exigen video regrabado en PR body, (3) CI futuro `demo-video-smoke` post-Sprint 1. Tres mecanismos, tres modos de fallo distintos — misma lógica de redundancia que ADR-014. **Date:** 2026-04-18
- **Scope congelado:** el ADR vive dentro de Sprint 1 scope-freeze porque cierra una clase de error ya producida, no añade feature. Alineado con la regla que Tomás formalizó: restaurar invariante ≠ feature nueva. **Date:** 2026-04-18
- **Sign-off en `Proposed` hasta que pase el primer run limpio end-to-end del script post-merge.** Mismo patrón que ADR-014 — no certifico un contrato antes de verlo correr una vez. **Date:** 2026-04-18
- **Lección arquitectónica consolidada:** cualquier artefacto que el equipo use repetidamente (demo, quickstart, smoke) necesita lifecycle contract explícito antes del primer uso recurrente. Happy-path único = bug class latente. Regla cross-project: en tech_memory. **Date:** 2026-04-18
- **Regla latente cross-project (añadir a tech_memory en próximo ciclo):** "Si un artefacto de dev/demo/testing se va a ejecutar más de una vez, diseñar reset + idempotencia + determinismo desde el inicio. El coste es lineal al diseñarlo; exponencial al retrofitarlo tras N iteraciones fallidas." **Date:** 2026-04-18

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

- **ADR-013 → Accepted hoy EOD 18-04.** Firma Román. GC stale entries = ticket S2-W1 Raúl. **Date:** 2026-04-18
- **ADRs 010/011/012 permanecen Proposed** — no aceptar contratos sin implementación. Theme engine y plugin-api loader real son Sprint 3+. **Date:** 2026-04-18
- **ADR-015 Tooling runtime boundary:** Sprint 2 semana 1. No toca bridge php-wasm — capa tooling independiente. **Date:** 2026-04-18
- **ADR-017 Tier 2 Bridge Surface:** escribir lunes 21-04 tras findings Raúl. Sin ADR firmado, nadie escribe código bridge. **Date:** 2026-04-18
- **ADR bridge security boundary (Helena):** independiente de ADR-015. Confirmado que no hay dependencia. **Date:** 2026-04-18
- **cURL sync fuera de Sprint 2:** CF7 requiere ADR nuevo + señal outreach antes de entrar al backlog. **Date:** 2026-04-18

## Sprint 2 — Entregables ejecutados (2026-04-18)

- **ADR-013 → Accepted:** CircuitBreaker stress findings firmados Román+Raúl. GC ticket S2-W1. **Date:** 2026-04-18
- **ADR-014 → Accepted:** Developer quickstart invariant. Condición cumplida: smoke-fresh-clone CI operativo. **Date:** 2026-04-18
- **ADR-015 Tooling runtime boundary → Accepted:** 3 lanes (NodeNext app, tsx scripts, NODE_OPTIONS CJS). drizzle-kit = Lane C. **Date:** 2026-04-18
- **ADR-016 Demo lifecycle contract → Accepted:** 3 invariantes implementados, demo 30-04 grabada OK. **Date:** 2026-04-18
- **ADR-017 Tier 2 Bridge Surface → Accepted:** renderShortcodes contract, BridgeInput/BridgeOutput, singleton PHP-WASM, mutex. **Date:** 2026-04-18
- **ADR-018 Bridge security boundary → Accepted (co-sign Helena):** RCE/SSRF/DoS/XSS mitigados. stubs en bootstrap con ≥90% test coverage. **Date:** 2026-04-18
- **ADR-019 Bridge observability → Accepted (co-sign Ingrid+Helena):** BridgeSpan, console.log JSON, OTel-ready. **Date:** 2026-04-18
- **ADR-009 context=edit implementado:** SerializeContext type, toWpPost/toWpPostAsync branching, requireAdmin gate. **Date:** 2026-04-18
- **OpenAPI actualizado:** ?context param documentado GET /wp/v2/posts + GET /wp/v2/posts/{id}. RenderedFieldEdit schema. **Date:** 2026-04-18
- **Estado Sprint 2:** 16/16 tickets done. ADRs 001-009 + 013-019 Accepted (16 total). 231 tests verdes. **Date:** 2026-04-18

## Sprint 2 completado (2026-04-18)

- **16/16 tickets cerrados.** 241 tests. 16 ADRs (ADR-001 a ADR-019). Bridge Tier 2 php-wasm + 3 pilots en verde.
- **ADR-009 implemented:** `SerializeContext = "view" | "edit"`, raw fields gated a `context=edit` + requireAdmin. Commit 942dc8e.
- **Skeleton packages:** cli, theme-engine, plugin-api — index.ts de 1 línea. ADR-010/011/012 en Proposed.

## Meet 2026-04-18 — Planning Sprint 3 (roles, taxonomías, admin edit, CLI init)

- **ADRs 010/011/012 gate:** deben estar Accepted antes de 05-05 11:00. Román coordina; ADR-012 necesita firma Alejandro. **Date:** 2026-04-18
- **ADR-020 Plugin Loader Runtime + ADR-021 Theme↔Core:** Román redacta en Sprint 3 (días 2 y 3 respectivamente). **Date:** 2026-04-18
- **Taxonomías WP-compat mínima sin jerarquía Sprint 3:** jerarquía documentada como deuda en ADR. Ingrid spec → Carmen implementa. **Date:** 2026-04-18
- **CLI `serve` + `migrate`:** P0 para TTFA <5 min fresh clone. Raúl implementa (~2 días). Helena CI step npm publish. **Date:** 2026-04-18
- **`disposeAll` D-014 context.ts:60 + timeout bridge renderShortcodes:** Raúl, mismo patrón AbortSignal 5s. **Date:** 2026-04-18
- **Feature freeze 12-05 12:00:** Román + Tomás enforzan. **Date:** 2026-04-18
- **Schema DB ya tiene roles/capabilities:** `roles text[]` + `capabilities jsonb` en tabla users — #44 solo necesita leer lo que existe. **Date:** 2026-04-18
