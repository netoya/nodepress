# Retro Sprint 0 — Async (2026-04-10 → 2026-04-16)

> Retro cerrada **2026-04-18 mediodía**. Acciones consolidadas por Tomás.
>
> Participantes que contribuyeron: Alejandro, Román, Ingrid, Lucas, Helena.
> (Tomás facilita; Martín no aportó en esta ronda — ok, su perspectiva Ops queda cubierta por Alejandro.)

---

## 1. ¿Qué funcionó bien?

**Alejandro:**
- ICP y licensing cerrados día 1: desbloqueó messaging y decisión de repo público sin arrastrar deuda estratégica al Sprint 1.
- 14/14 cerradas en una semana con 13 roles alineados — señal de que el equipo escala y la utilización está sana.
- 4 ADRs aceptados antes de escribir código de producto: baja el riesgo de rework y da narrativa defendible frente a early adopters.

**Román:**
- ADRs 001-004 escritos y aceptados antes de arrancar Sprint 1 — cada decisión clave tiene un "porqué" trazable, lo que nos ahorra discusiones recurrentes.
- Orden de scaffolding (docker-compose → tsconfig.base → vitest.workspace → CI) fue el correcto: cada pieza apoyó a la siguiente sin retrabajo mayor.
- Colaboración con Helena en el CI: yo aporté constraints del stack (composite TS, workspaces), ella ejecutó la pipeline — división de responsabilidades limpia.

**Ingrid:**
- El schema Drizzle (posts, users, terms, options, comments, plugin_registry) salió limpio en un solo bloque: tipos correctos, índices donde tocan, sin columnas null-by-default innecesarias. La decisión de modelar desde WP schema hacia PG nos ahorró revisiones posteriores.
- La coordinación con Helena en CI fue directa — typecheck + lint + test en el pipeline desde el día 1. Cuando llegaron los cambios de imports ESM (.js extensions) el CI lo cazó antes de que nadie lo tocara en local.
- El cleanup de migraciones duplicadas en `ci/db-migrations-cleanup` fue más rápido de lo previsto porque el scope estaba claro: una migración canónica por tabla, sin historial roto, sin rollback.

**Lucas:**
- El scaffolding de admin/ con Vite + React 19 salió limpio y rápido — estructura de carpetas decidida desde el día 1, sin volver atrás. Lo repetiría igual.
- Los tokens CSS custom properties como base del design system: un cambio de valor en `:root` y toda la UI responde. Sofía puede ajustar brand sin tocar componentes.
- El fix del tsconfig DOM lib desbloqueó a todo el equipo frontend en horas — era una deuda chica con coste grande si se dejaba. Bien haberlo cerrado en Sprint 0.

**Helena:**
- El pipeline de CI (lint + typecheck + test) quedó verde desde el primer commit operativo. Ningún merge posterior lo rompió — eso no ocurre por accidente, ocurre porque Ingrid y yo acordamos el contrato de jobs antes de escribir una línea de YAML.
- Separar la responsabilidad: Ingrid dueña del schema Drizzle, yo dueña del pipeline. Sin solapamientos, sin coordinación de última hora. Cuando cada pieza tiene un único responsable, la integración es predecible.
- El `.env.example` y el docker-compose como contrato de entorno: cualquier miembro del equipo puede levantar el stack sin preguntar. Eso es infraestructura que no da problemas.

---

## 2. ¿Qué nos frenó?

**Alejandro:**
- Sprint de pura infra sin demo tangible: útil, pero caro en burn rate de 13 roles sin win visible para capitalizar fuera.
- Licencia dual aún sin CLA Assistant configurado: bloquea repo público y cualquier outreach hasta Sprint 2.

**Román:**
- Los 3 fixes de tsconfig (`allowImportingTsExtensions`, DOM lib, composite emit) fueron 100% evitables — añadí un flag "para CI" sin validar implicaciones semánticas (emit + composite). Lección documentada en memoria: nunca tocar flags de tsc sin leer la matriz completa de compatibilidad.
- Las migrations de Drizzle llegaron con ruido (imports sin `.js`, fixtures desalineados) y tuvimos que abrir rama dedicada `ci/db-migrations-cleanup` a mitad de sprint — señal de que el DoD de scaffolding no cubría "migrations ejecutables en CI limpio".

**Ingrid:**
- La dependencia de Román para levantar docker-compose bloqueó el start del schema hasta el día 3. No es un problema de Román — es un problema de secuencia: backend no debería arrancar bloqueado en infra. En Sprint 1 el entorno ya está levantado, pero hay que documentarlo como constraint de onboarding para futuros sprints.
- El path de migraciones quedó inconsistente entre lo que estaba en PROJECT_STATUS y lo que realmente generó el cleanup (`packages/db/drizzle/` vs `packages/db/src/`). Lo detecté yo, pero lo detecté tarde — después del merge. Falta un check explícito en el PR checklist: "¿rutas en PROJECT_STATUS coinciden con rutas reales?"

**Lucas:**
- El `allowImportingTsExtensions` nos dio una vuelta de más: activo en CI, luego revertido porque es incompatible con composite emit. Coste real: un ciclo de commit + debug que se evita con un ADR breve antes de tocar tsconfig.
- No tener wireframes de Sofía antes de arrancar frenó la definición del shell — sabemos el destino (sidebar, header, dashboard) pero sin spec visual tuve que congelar decisiones de layout hasta Sprint 1.

**Helena:**
- La ausencia de tsconfig raíz que cubra todos los packages bloqueó activar `projectService` en ESLint desde el arranque. Tuvimos que trabajar sin type-aware linting, que es exactamente donde se esconden los bugs más caros. Es deuda técnica que va a Sprint 2 pero no debería haber llegado hasta allí.
- Los flags de compatibilidad ESM/CJS (`allowImportingTsExtensions`, `MODULE_TYPELESS_PACKAGE_JSON`) consumieron tiempo de diagnóstico que no estaba presupuestado. El monorepo arrancó sin una decisión explícita sobre el module system de root — eso generó ruido en CI hasta que se normalizó.

---

## 3. ¿Qué queremos probar en Sprint 1?

**Alejandro:**
- Fijar el 30-04 como demo innegociable (hook → REST → admin) y medir velocity contra ese hito, no contra tickets cerrados.
- Ping semanal de Eduardo sobre señales de mercado durante el sprint para validar que lo que entregamos el 30-04 es lo que el ICP pagaría.

**Román:**
- **Pre-flight checklist para cambios de tooling** (tsconfig, vitest, build): antes de merge, correr matriz `build + typecheck + test` en los 3 packages canary (core, db, admin). Coste: 2 min por PR. Beneficio: ningún fix-on-fix como los 3 de tsconfig.
- **Congelar contratos de tipos cross-package el día 1 del sprint** (ya aplicado con Ingrid para HookEntry hoy) — propongo formalizarlo como práctica: cuando un ticket depende de otro, sesión de 30 min para firmar la interfaz antes de que ambos empiecen a codificar.

**Ingrid:**
- Spec OpenAPI escrita y validada con js-yaml antes de que Carmen toque una sola ruta. Lo hemos decidido ya, pero quiero que quede como experimento medible: si el PR de Carmen tiene 0 shape divergences respecto a spec, el proceso funciona. Si aparecen, revisamos dónde se rompió la cadena.
- Daily async en GitHub Discussions con el formato 3-líneas. Quiero ver si reduce los bloqueos no reportados — en Sprint 0 hubo al menos un caso donde alguien tenía un bloqueante que no llegó a mí hasta dos días después. Si el daily no reduce eso en Sprint 1, cambiamos el canal.

**Lucas:**
- Brief granular + cierre explícito antes de delegar a Marta: si los 6 componentes atómicos tienen props tipadas y casos de uso escritos antes de que ella arranque, el ciclo de review-corrección se comprime a cero.
- Demo end-to-end como criterio de done: el dashboard tiene que renderizar un post real vía mutación hook, no solo mocks. Si lo hacemos objetivo público del sprint, focalizamos mejor — menos WIP, más foco en que el render cierre.

**Helena:**
- Pre-commit hooks con husky: que lint y typecheck corran localmente antes del push, no solo en CI. Reducimos feedback loop y evitamos commits que hacen rojo el pipeline por errores triviales. Evaluación en retro Sprint 1.
- Coverage threshold activo no solo en `core` sino también en `db`: el schema de Drizzle es infraestructura crítica y `context.ts` entró al sprint en 0%. Las piezas sin cobertura son las que fallan en producción sin aviso.

---

## Acciones (consolidadas post-retro)

> Tomás (Scrum Master) — 2026-04-18 tarde. Patrones cruzados identificados.

| # | Acción | Responsable | Deadline | Fuente |
|---|--------|-------------|----------|--------|
| R-1 | Pre-flight checklist tooling (tsc/vitest/build): matriz canary en PR antes de merge | Helena + Román | Sprint 2 semana 1 | Román, Lucas, Helena |
| R-2 | Formalizar "contract-freeze 30 min" cuando 2 tickets comparten tipos: producir interfaz firmada antes de que ambos arranquen | Tomás (facilita) + Leads | A partir de hoy | Román, Ingrid |
| R-3 | OpenAPI/schema spec mandatory antes de delegar a Haiku (Carmen, Marta): 0 divergences en PR = proceso ok | Ingrid + Lucas | Continuo Sprint 1 | Ingrid, Lucas |
| R-4 | Añadir ítem al PR checklist: "rutas en PROJECT_STATUS coinciden con rutas reales del repo" | Tomás (doc) | Esta semana | Ingrid |
| R-5 | CLA Assistant configurado antes de go-public Sprint 2 cierre | Alejandro | 2026-05-14 | Alejandro |
| R-6 | Pre-commit hooks (husky + lint-staged) — evaluar impacto en velocity; si +reducción bloqueos, adopción formal | Helena | Sprint 1 cierre | Helena |
| R-7 | Coverage threshold activo también en `packages/db` (mínimo 75%) — schema crítico no puede ir sin red | Helena + Ingrid | Sprint 2 inicio | Helena |
| R-8 | Demo end-to-end 30-04 como hito público del sprint — velocity medido contra ese hito, no contra tickets | Alejandro + Tomás | 2026-04-30 | Alejandro, Lucas |
| R-9 | Ping semanal Eduardo sobre señales de mercado durante Sprint 1 | Alejandro | Viernes 2026-04-24 | Alejandro |

---

## Observaciones cruzadas (Tomás)

Tres patrones emergen de la retro:

1. **El stack ESM/CJS/composite-TS fue el principal chupatiempo.** 3 voces independientes (Román, Lucas, Helena) lo mencionan. La raíz: decisiones de tooling tomadas sin ADR. R-1 lo mitiga, pero también conviene una ADR breve de "module system" del root para cerrar el tema.
2. **La cadena spec → implementación salvó rework.** Ingrid + Lucas lo vieron claro con OpenAPI y brief-Marta respectivamente. R-3 lo eleva a disciplina de equipo — especialmente crítico cuando delegamos a Haikus.
3. **El sprint de infra tuvo valor pero alto burn rate percibido.** Alejandro lo señala de forma directa. R-8 da la respuesta: la demo del 30-04 es la conversión de infra en valor demostrable.

No detecto tensiones personales ni bloqueos emocionales. El equipo está en flow.

---

_Cerrado por Tomás (Scrum Master), 2026-04-18._
