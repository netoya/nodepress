## Meet 2026-04-09 — Cómo llevar NodePress al siguiente paso

- **Sprint 0 arranca 2026-04-10:** 1 semana. Scaffolding monorepo, docker, CI, packages init. **Date:** 2026-04-09
- **Sprint 1:** 2 semanas. Backend: hooks + posts CRUD + REST. Frontend: admin shell + dashboard. En paralelo. **Date:** 2026-04-09
- **Sprints de 2 semanas** a partir de sprint 1. **Date:** 2026-04-09
- **DoD acordada:** TS strict, tests Vitest, lint/prettier verde, PR review, tests WP compat para endpoints, no deps circulares core↛db. **Date:** 2026-04-09
- **Acción Tomás:** Formalizar DoD en documento del repo, sprint 0 día 1. **Date:** 2026-04-09
- **Velocity desconocida:** Primera iteración, planificar conservador. **Date:** 2026-04-09
- **Roadmap sprints:** S0 scaffolding → S1 blog CRUD + admin shell → S2 roles + taxonomías → S3 plugin-api. **Date:** 2026-04-09

## Meet 2026-04-09 — Flujo de trabajo y documentación

- **GitHub Projects:** Herramienta única de tracking. Columnas: Backlog/Sprint/In Progress/Review/Done. Labels por componente. **Date:** 2026-04-09
- **PROJECT_STATUS.md creado:** En raíz del repo. Tracker vivo con decisiones, estados, acciones. Tomás actualiza en Sprint Review. **Date:** 2026-04-09
- **Daily asíncrono:** Issue diario en GitHub. No call. Ceremonies síncronas: Planning, Review+Retro. **Date:** 2026-04-09
- **Acciones Tomás:** Crear 26 issues esta noche. Mantener PROJECT_STATUS.md. **Date:** 2026-04-09
- **DoD Sprint 0:** npm run dev levanta, CI verde, packages buildean, typecheck limpio, npm test exit 0. **Date:** 2026-04-09

## Meet 2026-04-17 — Kickoff Sprint 1 y puesta al día

- **Sprint 0 cierre formal:** Actualizar PROJECT_STATUS.md a ✅ CERRADO tras merge de ci/db-migrations-cleanup. **Why:** estaba "EN CURSO" y los commits finales aparecían como "pending". **How to apply:** en cualquier Sprint Review futuro, cerrar estado en el doc antes de hablar de sprint siguiente. **Date:** 2026-04-17
- **Retro async obligatoria incluso en sprints de infra:** 3 preguntas (qué funcionó / qué frenó / qué probamos). **Why:** Alejandro priorizó proceso consistente sobre proceso "útil-cuando-conviene". **How to apply:** lanza retro async todo sprint, cierre viernes mediodía. **Date:** 2026-04-17
- **Daily async formato fijado:** 3 líneas por persona — qué mergé ayer, qué abro hoy, qué me bloquea. Canal en GitHub Discussions pinned al Sprint. Martín lo monta. Tomás sincroniza tablero. **Date:** 2026-04-17
- **Ausencia 2 días sin postear = check-in privado, no público.** **Why:** daily es detección de bloqueos, no control de presencia. **Date:** 2026-04-17
- **Demo objetivo Sprint 1 (30-04):** hook registrado programáticamente muta payload → POST /wp/v2/posts → render admin. Plugin loader fuera de scope. **Date:** 2026-04-17
- **Wireframes dashboard Lucas:** Tomás los persigue con Sofía, deadline viernes 2026-04-18. **Date:** 2026-04-17

## Sprint 1 día 1 — retro + pings (2026-04-17)

- **Retro Sprint 0 async lanzada:** `docs/process/retros/sprint-0-retro.md`. Participantes: Alejandro, Román, Ingrid, Lucas, Tomás, Martín, Helena. Cierre viernes 2026-04-18 12:00. Tomás consolida acciones viernes tarde. **Date:** 2026-04-17
- **Ping Sofía wireframes dashboard:** `docs/process/pings/2026-04-17-sofia-wireframes-dashboard.md`. Necesita wireframes 4 estados para #23 semana 2. Deadline viernes EOD. Canal: commit a `admin/docs/design/wireframes-dashboard.md`. Riesgo si no llegan: Lucas improvisa, hay rework. **Date:** 2026-04-17
- **Health check día 1 en PROJECT_STATUS.md:** 7 tickets DONE + tooling, ~80 tests verdes, spike #25 en curso. Sección nueva añadida antes del footer. **Date:** 2026-04-17

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

## R-2 Contract Freeze — formalizado 2026-04-18

- **Proceso escrito:** sección "Contract Freeze Protocol (R-2)" añadida a `docs/guides/contributing.md` antes del footer + entrada en Table of Contents.
- **Ejemplo histórico documentado:** HookEntry + PluginContext.addHook() — Román + Ingrid, 2026-04-17, habilitó entrega paralela #14 + #19.
- **Protocolo activo desde Sprint 1.** Cualquier contrato nuevo entre paquetes usa este formato. **Date:** 2026-04-18

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

## Post-mortem actions #6+#7 — 2026-04-18

- **DoD item 7 añadido:** clean-clone smoke test requerido en PR que toca tooling paths. **Date:** 2026-04-18
- **R-6 formalizado:** "Hotfix vs Scope Freeze Protocol" — hotfix restaurativo no requiere aprobación de trío. Regla activa desde Sprint 1. **Date:** 2026-04-18
- **Incident log creado:** `docs/process/incidents/2026-04-18-quickstart-broken.md` — clasificado como hotfix R-6. **Date:** 2026-04-18
- **Orden de inserción respetado:** R-5 de Román primero, luego R-6 + DoD update. Incident log independiente. **Date:** 2026-04-18

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

- **Sprint Goal Sprint 2 aprobado:** "NodePress operable en producción — migraciones historial, clean-clone <5 min, ADRs sellados, Tier 2 surface congelado." **Date:** 2026-04-18
- **Backlog Sprint 2 categorías:** Hardening, ADRs, Tier 2 Surface, Infra/CI, Frontend. Crear en GitHub antes del lunes 21-04. **Date:** 2026-04-18
- **Temperature check equipo:** lunes 21-04 individual + midpoint 28-04. Ritmo x6 Sprint 1 es ventana de riesgo burnout. **Date:** 2026-04-18
- **Retro Sprint 1:** lanzar asíncrona 30-04 al cierre demo, cerrar lunes 4-05. **Date:** 2026-04-18
- **Track frontend ausente de kickoff:** sync con Lucas lunes antes 10:00. Román facilita. **Date:** 2026-04-18
- **Protocolo scope freeze activo Sprint 2:** tickets nuevos requieren Román + Tomás + Martín co-sign. **Date:** 2026-04-18

## Sprint 2 — Trabajo ejecutado (2026-04-18)

- **ADR-009 context=edit implementado:** SerializeContext type, toWpPost/toWpPostAsync aceptan context param. context=edit retorna raw fields (title/content/excerpt), gateado por requireAdmin. **Date:** 2026-04-18
- **Nuevos tests:** 12 tests nuevos (7 context-edit integration + 5 serialize unit). Total: 231 tests verdes, 23 ficheros. **Date:** 2026-04-18
- **OpenAPI actualizado:** ?context param documentado en GET /wp/v2/posts y GET /wp/v2/posts/{id}. RenderedFieldEdit schema añadido. **Date:** 2026-04-18
- **CI cache mejorado:** ci.yml migra de manual actions/cache a cache: npm en setup-node. S2-infra-backlog cerrado. **Date:** 2026-04-18
- **PROJECT_STATUS.md:** Sección Sprint 2 completa (#28-#43), decisiones D-019..D-024 documentadas. **Date:** 2026-04-18
- **call-log-template.md:** Creado en docs/process/outreach/. 9 campos, checklist post-call. **Date:** 2026-04-18
- **Estado Sprint 2:** 16/16 tickets completados. 231 tests. 23 test files. CI 5 workflows activos. **Date:** 2026-04-18

## Meet 2026-04-18 — Planning Sprint 3 (roles, taxonomías, admin edit, CLI init)

- **Sprint Goal Sprint 3:** Auth roles reales, taxonomías WP-compat, admin editor, CLI serve+migrate, repo público 14-05 TTFA <5 min. **Date:** 2026-04-18
- **Proceso planning:** 05-05 AM planning + 05-05 PM revisión outreach signal + 06-05 ajuste backlog si hay cambio material. **Date:** 2026-04-18
- **Feature freeze 12-05 12:00 inamovible:** Tomás + Román enforzan. 2 días QA antes de repo público 14-05. **Date:** 2026-04-18
- **Temperature checks:** 05-05 antes del planning + 12-05 (freeze day). **Date:** 2026-04-18
- **14 tickets máximo + 2 buffer:** si Alejandro añade más, hay que quitar algo equivalente. Techo acordado con el equipo. **Date:** 2026-04-18
- **Retro Sprint 1 async:** lanzar 30-04, cerrar 04-05, consolidar 05-05 AM. **Date:** 2026-04-18
- **#23 dashboard visual → Sprint 4 opcional:** admin editor funcional tiene prioridad. **Date:** 2026-04-18

## Kickoff Sprint 4 — 2026-05-19

- **Sprint 4 arranca:** 2026-05-19 → 2026-05-30. Estado: 🟡 PLANNING. **Date:** 2026-05-19
- **Sprint Goal:** "NodePress extensible: primer plugin JS/TS real con vm.Context sandbox, ThemeEngine MVP, gestión post-lanzamiento de issues externos y primera iteración basada en feedback ICP-1." **Date:** 2026-05-19
- **P0 inamovibles Sprint 4:** vm.Context sandbox (ADR-004) + Plugin demo "Hello World" + ThemeEngine interface (ADR-021). **Date:** 2026-05-19
- **Velocity baseline:** Sprint 3 = 11/12. Sprint 4 = 10 tickets máx + 2 buffer. **Date:** 2026-05-19
- **Feature freeze Sprint 4:** 28-05 12:00. Tomás + Román enforzan. **Date:** 2026-05-19
- **Retro Sprint 3 async:** lanzar 17-05, cerrar 19-05 AM, consolidar antes del planning. **Date:** 2026-05-19
