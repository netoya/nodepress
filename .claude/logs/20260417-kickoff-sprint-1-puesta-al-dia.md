# Reunión: Puesta al día y kickoff Sprint 1

**Fecha:** 2026-04-17
**Participantes:** Tomás (Scrum Master), Alejandro (CEO), Román (Tech Lead), Ingrid (Lead Backend), Lucas (Lead Frontend), Martín (Ops Manager)
**Duración estimada:** 50 minutos

---

## Preparación Individual

### Tomás (Scrum Master)
- Cierre formal de Sprint 0 pendiente: PROJECT_STATUS.md dice "EN CURSO" y task log tiene commits "pending"
- Rama `ci/db-migrations-cleanup` no mergeada a main — deuda inmediata antes de arrancar Sprint 1
- No hay retro de Sprint 0 registrada. Aunque fue infra, es el primer sprint del equipo
- Daily async acordado (D-018) pero sin evidencia de rodaje
- Velocity desconocida — Sprint 0 fue de 1 semana, el de 2 semanas arranca a ciegas

### Alejandro (CEO)
- Sprint 0 cerrado limpio, el tono está puesto. Dual License y 3 ICPs firmados
- Prioridad innegociable: HookRegistry (#14). Sin eso, el plugin system es humo
- Demo objetivo Sprint 1 (30-04): `POST /wp/v2/posts` + hook mutando payload + render en admin
- Repo en silencio externo, CLA Assistant pendiente. Go-public al cierre de Sprint 2
- Riesgo "todo o nada": PoC con 13 roles es caro, necesita win visible el 30-04

### Román (Tech Lead)
- Merge `ci/db-migrations-cleanup` → main antes de arrancar. Él lo hace, 15 min
- Contrato de `HookEntry` y `PluginContext.addHook()` congelado hoy — sesión 30 min con Ingrid tras el kickoff
- Raúl bloqueado por #14+#19; mientras, arranca spike php-wasm (#25) primeros 2-3 días
- `packages/core/src/index.ts` está vacío (`export {}`). Greenfield total para HookRegistry
- Testing bar: 100% coverage, ordering por prioridad, `removeAllByPlugin`, property-based test de idempotencia

### Ingrid (Lead Backend)
- Orden: #19 PluginContext types → #18 Auth → #15+#16 CRUD+REST (Carmen) → #17 Test harness en paralelo
- Spec OpenAPI antes de que Carmen toque código (Carmen es Haiku — specs quirúrgicas)
- Test harness debe correr ANTES de marcar endpoints "completos", no después
- Nota: PROJECT_STATUS apunta migración #21 a `packages/db/src/` pero realmente está en `packages/db/drizzle/` — corregir
- D-006 no negociable: core no importa de db. Cualquier PR que lo viole, bloqueo

### Lucas (Lead Frontend)
- Arranca hoy, sin dependencia del backend: #22 shell + MSW contra spec WP
- `admin/src/` está limpio (App, main, tokens.css) — canvas sin deuda
- Marta (Haiku) con brief cerrado de 6 componentes: Button, Badge, Card, Spinner, EmptyState, ErrorBoundary
- Dashboard 4 estados en semana 2, pero necesita wireframes de Sofía antes
- Instalar Radix UI, Zustand, React Query, MSW — lo hace él, bloqueo cero

### Martín (Ops)
- 13 tickets TODO en 14 días, capacity ~9 días efectivos por persona con 15% buffer
- Mapping GitHub Issues ↔ tickets PROJECT_STATUS: confirmar numeración 1-a-1
- Spikes #25-27 sin hard stop: si día 3 no hay resultado, se congela
- Sin baseline de velocity — primer burndown será estimación, no predicción
- Reporte semanal del viernes 2026-04-16 no entregado. Gap a cerrar

---

## Conversación

**Tomás:** Buenos días, equipo. Hoy arranca Sprint 1, pero antes de saltar a los tickets me gustaría que cerremos Sprint 0 en condiciones. PROJECT_STATUS.md sigue diciendo "EN CURSO" y el task log tiene dos commits marcados como "pending". ¿Cómo vemos el cierre?

**Alejandro:** Cerrado. Las 14 tareas están en verde, el demo que pedí el 9 está funcionando — `packages/server/src/index.ts` responde "Hello NodePress" en el 3000. Eso para mí es cierre. Actualiza el documento, Tomás, y seguimos.

**Román:** Matizo una cosa antes de declararlo cerrado. La rama `ci/db-migrations-cleanup` tiene 5 commits por delante de main y no está mergeada. Los últimos fixes — limpieza de migraciones a `packages/db/drizzle/`, normalización ESM, composite tsconfig — viven ahí. Si arrancamos Sprint 1 sin merge, cualquiera que haga PR nuevo arranca de una base que no es la que hemos estado puliendo esta semana.

**Tomás:** Exacto, ese es mi segundo punto. ¿Quién lo mergea y cuándo?

**Román:** Yo, en cuanto salgamos de la reunión. 15 minutos. PR a main, squash merge, lo apruebo yo mismo porque es deuda mía y de Ingrid. A la una ya está en main.

**Ingrid:** De acuerdo con el merge. Pero corrige una cosa del PROJECT_STATUS antes: la nota del ticket #21 dice que la migración está en `packages/db/src/20260413_create_plugin_registry.sql` y eso ya no es verdad. Después del cleanup quedó en `packages/db/drizzle/`. Pequeño, pero genera confusión si lo lee alguien nuevo.

**Tomás:** Apuntado, lo arreglo cuando actualice el doc. Segundo tema: ¿hacemos retro de Sprint 0 o lo damos por visto?

**Alejandro:** Retro de 15 minutos, no más. Fue scaffolding, pero el equipo acaba de ejecutar su primer sprint junto. Saltarse la retro es decirle al equipo que el proceso no importa cuando va bien. Luego cuando duela, no tienen hábito.

**Tomás:** Perfecto. La saco en un async en el canal después del kickoff: tres preguntas — qué funcionó, qué frenó, qué probamos en Sprint 1. Cierro el async el viernes a mediodía.

**Martín:** Añado una cosa al cierre de Sprint 0. Mi reporte semanal del viernes 16 no salió. Lo asumo — estaba metiendo labels y milestones en GitHub y se me pasó. Lo unifico con el status update de hoy: cierre Sprint 0 + arranque Sprint 1 en un solo post. Pero necesito que me confirméis que los 14 tickets en PROJECT_STATUS se mapean 1-a-1 con los Issues que creé en GitHub. Si hay desalineamiento, el tracking durante el sprint se rompe.

**Román:** Yo los revisé cuando los creaste. Estaban alineados. Pero sí, una revisión rápida hoy no sobra — con #21 ya done, los números bailan un poco.

**Martín:** Lo hago yo esta mañana. Te paso una tabla de mapeo a mediodía. Si hay discrepancia, la corrijo en GitHub, no en el status — el status es fuente única.

**Tomás:** Bien. Pasemos a Sprint 1. Román, ¿cómo lo vas a atacar desde arquitectura?

**Román:** Hay un problema de dependencias que quiero exponer antes de que se convierta en bloqueo. El ticket #14 — HookRegistry — es mío. El #19 — PluginContext + DisposableRegistry types — es de Ingrid. El #20 — wrapSyncFilter, wrapAsyncAction, circuit breaker — es de Raúl. Los tres son el corazón del sistema de plugins y están enlazados. Si #14 y #19 divergen en el contrato, #20 se construye sobre arena. Mi propuesta: Ingrid y yo cerramos la firma pública de `HookEntry { pluginId, priority, fn }` y `PluginContext.addHook()` hoy tras esta reunión, 30 minutos. A partir de ese momento ambos tickets avanzan en paralelo contra la misma interfaz.

**Ingrid:** De acuerdo, pero añado un punto. No es solo firmar la interfaz — hay que decidir la semántica. Filters son síncronos por contrato WP, actions pueden ser async. ¿Mantenemos esa asimetría o la forzamos toda a async? Esto afecta al wrapping que Raúl implemente después.

**Román:** Asimetría. Es lo que hace WordPress y es lo que todos los plugins portados van a esperar. Filters sync, actions async. Si forzamos todo a async rompemos compatibilidad para ganar "consistencia", y la compat es lo que estamos vendiendo. ADR-005 lo documento yo esta semana.

**Alejandro:** Ahí es donde quería llegar. Compatibilidad WP no es una feature, es la tesis del proyecto. Cualquier decisión que sacrifique compat para ganar "elegancia interna" la quiero ver en una ADR con nombres y justificación, no en un commit silencioso.

**Román:** Anotado. ADR obligatoria para cualquier desvío de semántica WP.

**Tomás:** ¿Y Raúl? Si #14 y #19 arrancan en paralelo hoy pero él no puede tocar #20 hasta que exista la interfaz, ¿qué hace los primeros 2-3 días?

**Román:** Spike php-wasm (#25). Está programado para Sprint 1 de todas formas, y adelantar 2 días no le hace daño a nadie. Si el spike termina antes de que yo tenga HookRegistry listo, pasa al #27 con Helena. Y cuando el contrato esté cerrado — digamos jueves esta semana — se incorpora a #20.

**Martín:** Timeboxing para los spikes. #25 es 2 días, #27 es 2 días. Si al día 3 de cada spike no hay resultado concreto — matriz, benchmark, conclusión binaria — se congela. No quiero spikes abiertos que se coman el Sprint.

**Román:** De acuerdo. Hard stop. Yo lo superviso con Raúl.

**Ingrid:** Sobre mis tickets. Propongo este orden: día 1-2, #19 PluginContext types y #18 Auth simplificado en paralelo — son infra pequeña. Día 2, spec OpenAPI de los 5 endpoints REST. Día 3 en adelante, Carmen arranca #15+#16 contra la spec. En paralelo yo monto #17 test harness. Quiero que el harness esté corriendo ANTES de que los endpoints estén "completos". Si lo dejo para el final, descubro incompatibilidades WP cuando es demasiado tarde.

**Alejandro:** Eso me tranquiliza. ¿Y la spec la escribes contra el WP REST API Handbook directamente?

**Ingrid:** Sí. Los shapes y paginación (`X-WP-Total`, `X-WP-TotalPages`, `_links`) están fijados por WordPress. No reinvento nada. Lucas puede mockear contra esa misma spec sin pedirme nada.

**Lucas:** Eso iba a preguntar. Con eso confirmado, arranco hoy. Shell del admin (#22) en semana 1 — sidebar estático, header, layout. Marta en paralelo con el design system atómico: Button, Badge, Card, Spinner, EmptyState, ErrorBoundary. Le paso brief cerrado antes de que termine la tarde, Haiku necesita ambigüedad cero. En semana 2, conecto React Query contra MSW mockando `GET /wp/v2/posts` y los 4 estados del dashboard.

**Román:** ¿Dependencia con Sofía?

**Lucas:** Sí, una. Los wireframes del dashboard detallado los necesito antes de arrancar semana 2. Los del shell ya los tengo de Sprint 0. Sofía, si está escuchando este async: confirma si los wireframes del dashboard están al caer o si los improvise y luego los reajustamos. Prefiero esperar medio día y hacer una pasada buena.

**Tomás:** Lo llevo yo a Sofía esta tarde. Que confirme fecha antes del viernes para que Lucas pueda planificar semana 2 con seguridad.

**Alejandro:** Un tema de negocio antes de que cerremos. El demo objetivo que quiero ver el 30 de abril: un plugin ejemplo — aunque sea uno de juguete — registra un hook que muta el payload de un post, el post se crea vía `POST /wp/v2/posts` por REST, y el dashboard del admin lo muestra mutado. Si conseguimos eso, tenemos el primer demo real para enseñar a early adopters. ¿Es realista?

**Román:** Depende de si "plugin ejemplo" está dentro del scope o fuera. Si es fuera, un test de integración vale. Si es un plugin real cargado dinámicamente, eso es plugin-api (Sprint 3). Mi propuesta: un hook registrado programáticamente dentro del mismo proceso — sin cargar desde archivo — que demuestre el flujo end-to-end. Eso sí es Sprint 1.

**Alejandro:** Me vale. Lo importante es que el hook se dispare con datos reales y el efecto sea visible. No necesito plugin loader para el demo.

**Tomás:** Perfecto, demo objetivo Sprint 1 fijado. Último punto: ¿tenemos daily async en marcha o empezamos desde cero?

**Ingrid:** Para mí "daily async" funciona si tiene formato. Si es "contad qué hicisteis", se convierte en ruido. Propongo tres líneas por persona: qué mergé ayer, qué abro hoy, qué me bloquea.

**Martín:** Y un canal dedicado. En el repo, GitHub Discussions, pinned al Sprint 1. Yo lo monto hoy.

**Tomás:** Cerrado. Yo sincronizo el estado en el tablero de Projects con los check-ins del daily. Si alguien no postea dos días seguidos, le pregunto en privado — no en público. No es tracking de presencia, es detección de bloqueos.

**Lucas:** Una cosa más. Necesito tu bendición para meter Radix UI, Zustand, React Query y MSW al `admin/package.json`. Están decididos en D-015, pero hoy no están instalados. Lo hago yo esta tarde.

**Román:** Adelante. Son las decididas, no hay discusión. Eso sí — pin versions, no rangos. Y lock file actualizado.

**Lucas:** Hecho.

**Alejandro:** Cierro yo. Sprint 1 objetivo: demo funcional de hook + CRUD + admin el 30-04. Innegociables: HookRegistry de Román con tests 100%, test harness WP compat de Ingrid desde día 3, auth simplificado, core no importa de db. Spikes con hard stop al día 3. Daily async con formato. Y Tomás saca retro de Sprint 0 hoy mismo. ¿Algo más?

**Tomás:** Nada más. Gracias equipo. Yo actualizo PROJECT_STATUS.md con el cierre Sprint 0 en cuanto Román mergee la rama. Y lanzo la retro async esta tarde.

**Román:** Venga, me voy a mergear esa rama.

---

## Puntos Importantes

1. **Sprint 0 se da por cerrado** tras merge de `ci/db-migrations-cleanup` a main y actualización de PROJECT_STATUS.md. (Alejandro + Tomás)
2. **Merge de `ci/db-migrations-cleanup` → main es bloqueante** para arrancar Sprint 1. Román lo hace hoy. (Román)
3. **Retro de Sprint 0 se hace async**, 3 preguntas, cierre viernes mediodía. No se salta aunque fuera sprint de infra. (Alejandro + Tomás)
4. **Contrato `HookEntry` + `PluginContext.addHook()` se congela HOY** en sesión de 30 min Román+Ingrid. Bloquea #14, #19 y #20. (Román + Ingrid)
5. **Filters sync, actions async — se mantiene la asimetría WP**. ADR-005 a cargo de Román esta semana. (Román)
6. **Cualquier desvío de semántica WP requiere ADR** — la compat es la tesis del proyecto, no una feature opcional. (Alejandro)
7. **Raúl arranca spike php-wasm (#25) días 1-3** mientras espera el contrato para #20. (Román)
8. **Spikes con hard stop en día 3**: si no hay resultado concreto, se congelan. (Martín + Román)
9. **Ingrid escribe spec OpenAPI antes de que Carmen toque código** — Haikus necesitan contratos sin ambigüedad. (Ingrid)
10. **Test harness WP conformance (#17) corre ANTES de marcar endpoints completos**, no después. (Ingrid)
11. **Demo objetivo Sprint 1 (30-04):** hook registrado programáticamente muta payload → `POST /wp/v2/posts` vía REST → render en admin. Plugin loader NO está en scope. (Alejandro + Román)
12. **Lucas arranca hoy frontend sin dependencias** del backend vía MSW contra WP REST Handbook spec. (Lucas)
13. **Daily async formato 3 líneas**: qué mergé, qué abro, qué me bloquea. Canal en GitHub Discussions. (Ingrid + Martín + Tomás)
14. **Mapping tickets #14-#27 ↔ GitHub Issues** lo revisa Martín esta mañana; el status es la fuente única de verdad. (Martín)

## Conclusiones

- Consenso unánime en cerrar Sprint 0 hoy y arrancar Sprint 1 con la rama de cleanup mergeada en main.
- Sin desacuerdos técnicos: orden de implementación, asimetría sync/async de filters/actions y scope del demo del 30-04 aprobados de un pase.
- Riesgo principal identificado y mitigado: dependencia #14→#19→#20 resuelta con sesión de diseño hoy + adelanto del spike #25 para Raúl.
- Nueva regla implícita: cualquier desvío de compat WP se documenta en ADR antes de implementarse.

## Acciones

| #   | Acción                                                                                  | Responsable       | Plazo                   |
| --- | --------------------------------------------------------------------------------------- | ----------------- | ----------------------- |
| 1   | Merge `ci/db-migrations-cleanup` → main (squash)                                        | Román             | Hoy (2026-04-17) ~13h   |
| 2   | Actualizar PROJECT_STATUS.md: Sprint 0 ✅ CERRADO + corregir ruta migración #21          | Tomás             | Hoy, tras merge         |
| 3   | Sesión de diseño `HookEntry` + `PluginContext.addHook()` (firma + semántica)             | Román + Ingrid    | Hoy, tras kickoff       |
| 4   | ADR-005: semántica filters sync vs actions async                                         | Román             | Viernes 2026-04-24      |
| 5   | Retro Sprint 0 async (qué funcionó / qué frenó / qué probamos Sprint 1)                  | Tomás             | Cierre viernes 18 a mediodía |
| 6   | Revisar y corregir mapping tickets #14-#27 ↔ GitHub Issues                               | Martín            | Hoy mediodía            |
| 7   | Arrancar #14 HookRegistry en `packages/core/src/hooks/`                                  | Román             | Desde hoy               |
| 8   | Arrancar #19 PluginContext + DisposableRegistry types                                    | Ingrid            | Desde hoy               |
| 9   | Spike #25 php-wasm (timeboxed 3 días, hard stop)                                         | Raúl (sup. Román) | 2026-04-17 → 2026-04-21 |
| 10  | Spike #27 matriz extensiones PHP (timeboxed 3 días, hard stop)                           | Helena            | Sprint 1 semana 1       |
| 11  | Auth simplificado Bearer=admin (#18)                                                     | Ingrid            | Semana 1                |
| 12  | Spec OpenAPI 5 endpoints posts REST (antes de que Carmen toque código)                   | Ingrid            | Día 2-3                 |
| 13  | Content engine + REST (#15, #16) contra spec                                             | Carmen (rev. Ingrid) | Semana 1-2            |
| 14  | Test harness WP API conformance (#17) corriendo desde día 3                              | Ingrid            | Semana 1                |
| 15  | Montar daily async en GitHub Discussions (pinned Sprint 1, formato 3 líneas)             | Martín            | Hoy                     |
| 16  | Admin shell #22 + instalación Radix UI/Zustand/React Query/MSW pinned                    | Lucas             | Desde hoy               |
| 17  | Brief cerrado design system atómico (6 componentes) para Marta                           | Lucas             | Hoy EOD                 |
| 18  | Confirmar wireframes dashboard detallado                                                 | Sofía (vía Tomás) | Antes viernes 2026-04-18|
| 19  | Reporte unificado cierre Sprint 0 + arranque Sprint 1                                    | Martín            | Hoy                     |
| 20  | Circuit breaker: decidir política de fallos que desactivan plugin (al atacar #20)        | Raúl + Ingrid     | Cuando arranque #20     |

---

_Generado por /meet — Trinity_
