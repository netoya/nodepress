# Reunión: Kickoff Sprint 5 — Repo Público, CLA, Plugin Marketplace Signal, WP Import CLI, CLI Completo

**Fecha:** 2026-04-18
**Participantes:** Alejandro (CEO), Román (Tech Lead), Ingrid (Lead Backend), Lucas (Lead Frontend), Carmen (Dev Backend 1), Tomás (Scrum Master), Martín (Ops Manager)
**Duración estimada:** 90 minutos

---

## Preparación Individual

### Alejandro (CEO)

- Repo público 14-05 es evento de negocio, no deployment técnico. Win visible semana 1 post-launch innegociable.
- CLA + licencia dual son gates de apertura — sin ambos, el repo no abre a PRs externos.
- ICP-1 signal (#60) determina la prioridad real de Sprint 5 — debrief de los 15 calls ICP-1 es el input principal.
- Marketplace signal ≠ marketplace: validar interés con docs + topic + formulario, no construir infra.
- WP Import CLI: vector de adquisición más barato. Stub (#63) → funcional en Sprint 5.

### Román (Tech Lead)

- ADR-020/021 ya están Accepted en código, PROJECT_STATUS los marca Proposed — inconsistencia a resolver.
- WP Import arquitectura: SAX parser sobre DOM (performance), ADR-022 previo a código, candidatos sax vs saxes.
- CLI completo: evaluar commander/yargs con spike 0.5d — argv manual no escala con subcommands jerárquicos.
- publish-cli.yml sin approval gate — riesgo antes de repo público, Helena debe corregirlo.
- CODEOWNERS explícito antes de PRs externos (packages/core → Román+Ingrid, plugin-api → Román, admin → Lucas).

### Ingrid (Lead Backend)

- WP Import: MySQL dump serialización PHP, schema EAV → JSONB, IDs colisionantes, idempotencia con `--mode=reset|upsert`.
- Bug activo: paginación en memoria en GET /wp/v2/users — carga toda la tabla y pagina en JS. Fix: limit/offset en query.
- Gaps API para CMS real: POST /wp/v2/media, POST/PUT /wp/v2/terms, búsqueda en posts, /wp/v2/types, /wp/v2/statuses.
- OpenAPI desactualizada — contribuidores externos necesitan contrato claro.
- ADR-022 WP Import obligatorio antes de día 1 de código.

### Lucas (Lead Frontend)

- Admin base sólida: shell, dashboard 4 estados, editor completo, TaxonomySelector, 95 Vitest + 8 Playwright tests.
- Deuda visible para repo público: hash routing manual, browser.confirm() para delete, TODO comments expuestos.
- Sofía MIA desde Sprint 1 — wireframes del dashboard nunca llegaron tras ping 2026-04-17.
- Nico ausente de todos los sprints — necesita activación para UI de plugins en Sprint 5 si hay señal ICP.
- React Router v7 migración es prerequisito para /plugins + /apariencia pages.

### Carmen (Dev Backend 1)

- WP Import MVP: 4 días estimados (WXR, posts+terms+users+comments, dry-run e idempotencia). Sin media.
- Necesita spec clara antes de empezar — "CLI completo" es ambiguo sin lista de subcomandos.
- Plugin marketplace REST: GET /wp/v2/plugins + schema, 1-2 días si lista simple.
- Hotfix paginación /wp/v2/users: una hora con spec de Ingrid.

### Tomás (Scrum Master)

- Velocity tendencia: S1=13, S2=15, S3=11, S4=8. Dirección descendente. Techo Sprint 5: 8 tickets + 2 buffer.
- Retro Sprint 4 pendiente de lanzar — ningún kickoff arranca sin retro cerrada del sprint anterior.
- Feature freeze propuesto: 2026-06-11 12:00. Sprint: 2026-06-02 → 2026-06-13.
- P0 ordering antes de estimar — no cargar el backlog sin prioridades acordadas.

### Martín (Ops Manager)

- #60 y #61 son P0 heredados de Sprint 4, entran primero — 2 slots de los 10 disponibles ya ocupados.
- CLA: no hay confirmación de que esté operativo — bloquea todo PR externo.
- Velocity 80% en Sprint 4 — techo 10 tickets, no más.
- Marketplace depende del debrief ICP-1 — no se abre ticket hasta que #60 cierre.

---

## Conversación

**Tomás:** Antes de entrar en el backlog, quiero nombrar algo: la velocity de Sprint 4 fue 8/10. Es la primera vez que no cerramos todo. No es un drama — los dos diferidos fueron decisiones deliberadas, no bloqueos. Pero indica que llegamos al techo. Si este kickoff propone cargar 12 tickets, voy a pedir que lo reduzcamos. ¿Alguien objeta que empecemos fijando un techo antes de hablar de features?

**Martín:** Ninguna objeción. Los datos que tengo: velocidades S1-S4 son 13, 15, 11, 8. La tendencia es real aunque haya ruido. Mi propuesta operativa: 10 tickets tope, 15% buffer interno. Y los 2 que vienen de Sprint 4 — #60 y #61 — entran ya como deuda confirmada antes de abrir hueco a nada nuevo. Eso nos deja con 8 slots para features Sprint 5.

**Alejandro:** Acepto el techo. Lo que no acepto es que el techo nos impida cerrar el loop ICP-1 esta semana. El debrief de los 15 calls tiene que convertirse en decisión de backlog antes del día 2 del sprint — eso es #60, y Martín y yo lo resolvemos en las primeras 48 horas. El resto del equipo puede arrancar con lo que ya tiene especificado: WP Import CLI, CLI completo, CLA operativo.

**Román:** De acuerdo con la secuencia. Pero necesito que el equipo sepa que WP Import CLI no puede arrancar sin ADR-022. No es burocracia — WXR tiene edge cases que si no los acotamos en el ADR, Carmen va a implementar el happy path y Sprint 6 lo vamos a rehacer. Lo escribo yo el día 1 del sprint, antes del primer commit de código. Máximo medio día.

**Ingrid:** Y el ADR tiene que incluir explícitamente qué no importamos. Media/attachments — fuera. Custom post types — fuera, log warning. Serialización PHP de meta — fuera, skip con advertencia. Lo que sí: posts publicados + términos + usuarios + comentarios. Con esos cuatro el 70% de un blog WP estándar funciona y ya es suficiente para la demo del ICP-1.

**Carmen:** Con eso tengo suficiente para estimar. Posts + términos + usuarios + comentarios con dry-run e idempotencia — 4 días de implementación. Si añadimos media ya son 7 días y prefiero que no entre en Sprint 5.

**Tomás:** ¿Confirmamos: WP Import CLI = 1 ticket, scope mínimo que definió Ingrid, estimación 4 días? Sin media, con ADR-022 previo. ¿Alguien difiere?

**Lucas:** No difiero en el scope de Carmen, pero quiero apuntar algo: si WP Import funciona y un usuario importa 200 posts, el admin va a mostrarlos en una tabla con paginación que hoy funciona. Eso está OK. Lo que NO está OK es que si ese mismo usuario quiere editar posts recién importados, el editor va a guardar pero el selector de categorías no persiste en el backend — hay un TODO activo en PostEditorPage que lo documenta. ¿Ese TODO entra en Sprint 5 o lo ignoramos hasta que alguien lo reporte como bug?

**Ingrid:** Es un bug real. Lo que documenta ese TODO es que el endpoint PUT /wp/v2/posts no aplica las taxonomías recibidas en el body. Lo arreglé en Sprint 3 para la creación, pero la actualización quedó inconsistente. Una hora de fix, Carmen lo puede cerrar como parte del WP Import ticket sin abrirlo por separado.

**Carmen:** Confirmado. Lo incluyo en el ticket de WP Import como subtarea de "verificación de integración post-import".

**Martín:** Bien. Anotado. ¿Qué pasa con el CLA? Necesito saber si está operativo antes de mover cualquier otro ticket hacia arriba.

**Alejandro:** El CLA — acordé activarlo con Eduardo el 23-04. Helena no está en esta reunión pero necesito que alguien confirme esta semana que el webhook está activo en el repo antes de que abramos a PRs externos. Martín, ¿puedes coordinar eso con Helena hoy mismo y traerme confirmación antes del cierre del día?

**Martín:** Lo hago. Si Helena confirma antes de las 18:00, tenemos verde para el proceso de triage externo. Si no, el ticket #61 entra bloqueado hasta que lo despejemos.

**Román:** Y antes de que Helena complete eso, hay otro bloqueante para repo público que también es de CI: `publish-cli.yml` se dispara en tags `v*` sin approval gate. Cualquier commit con tag puede publicar a npm accidentalmente. Necesitamos un GitHub environment con approval manual — lo que hacen todos los proyectos serios. Helena también, mismo día.

**Tomás:** Dos acciones para Helena hoy: CLA webhook verificado + publish-cli approval gate. Martín coordina. ¿Algo más que sea bloqueante para repo público antes de hablar de features nuevas?

**Lucas:** Sí — tres cosas en el admin que un contribuidor externo va a reportar en las primeras 24 horas si no las arreglamos antes: el `browser.confirm()` para delete de posts, los TODO comments en PostEditorPage con frases como "backend silently ignores", y el hash routing manual. El `browser.confirm()` es accesibilidad y UX — 1 hora. Los TODO comments — los convierto en GitHub issues linkados — media hora. El hash routing — eso es un día de trabajo si lo migramos a React Router v7, y propongo que entre como ticket propio en Sprint 5.

**Román:** Los dos primeros — hazlo ahora, fuera del sprint, antes del repo público. Son deuda de pulido, no features. El React Router — de acuerdo que entre como ticket. Sin eso, el admin no escala con las páginas de plugins y apariencia que vienen.

**Alejandro:** ¿Cuánto tiempo necesitamos para React Router? Porque si hay un día de riesgo de regresión en el admin durante Sprint 5, necesito saberlo ahora, no cuando tenga un demo con un piloto.

**Lucas:** Un día de implementación, pero tengo dos días de tests para garantizar que no rompe nada. Con Marta en paralelo cubrimos sin parar las features nuevas.

**Tomás:** Lo anoto: ticket React Router migración, 3 días buffer incluido, Lucas + Marta. ¿Entramos ahora en marketplace signal?

**Alejandro:** Sí. Mi posición es clara: marketplace signal en Sprint 5 **no** es infra, no es registry, no es endpoints. Es esto: un GitHub topic `nodepress-plugin`, una sección en README con "escribir tu propio plugin", y un issue template "Submit your plugin". El `nodepress plugin list` que propuso Román — ese sí lo quiero porque es UX que el desarrollador ve desde día 1. Con eso medimos: si en 30 días hay 5 repos con el topic `nodepress-plugin` en GitHub, tenemos señal real. Si no, marketplace va a Sprint 7.

**Román:** El `plugin list` es un comando del CLI, no frontend. Lo implementa Carmen en 0.5 días — lee `plugins/` local, imprime metadata. Cero infra. Perfecto para Sprint 5.

**Ingrid:** Y si de los 15 calls ICP-1, Alejandro confirma que más de 5 mencionaron "instalar plugins de terceros", entonces Sprint 5 también incluye un diseño técnico del marketplace backend — solo el ADR, no implementación. Ese ADR lo escribimos Román y yo en día 2. Pero la implementación va a Sprint 6 o 7.

**Alejandro:** Correcto. Esa es la pregunta que le llevo al debrief ICP-1: cuántos de los 15 dijeron algo sobre plugins de terceros vs. plugins propios. Lo tengo en el día 2 del sprint.

**Martín:** Bien. Voy consolidando tickets. Tengo: #60 (backlog ICP-1, días 1-2), #61 (CLA + triage), WP Import CLI (ADR-022 + implementación), React Router migración, plugin list command, y browser.confirm()+TODO cleanup como pre-sprint. ¿Qué me falta?

**Tomás:** La retro de Sprint 4. No arrancamos el sprint sin ella. Propongo lanzarla hoy como doc async en `docs/process/retros/sprint-4-retro.md`, cierre lunes. El planning formal de Sprint 5 — después de que cierre la retro y se consolide #60.

**Alejandro:** ¿Y la licencia? Román me preguntó en su preparación. Package.json dice `GPL-3.0-or-later`, licensing.md dice "evaluándose". Eso no puede estar así cuando el repo sea público. Esta semana decido con Eduardo: o la licencia dual con pricing básico público, o cerramos en GPL-3.0 puro. El martes traigo la decisión.

**Román:** Y necesito esa decisión antes de definir el CONTRIBUTING.md definitivo. Las reglas para PRs externos sobre qué código aceptamos dependen del licensing model. Si es dual, plugins de terceros pueden ser MIT — si es GPL puro, todos los plugins deben ser GPL-compatibles. Eso tiene implicaciones en el ecosistema de marketplace.

**Ingrid:** Mientras tanto, una cosa que no podemos diferir: la paginación en memoria en GET `/wp/v2/users`. Si el repo es público y alguien lo despliega con datos reales, tiene un bug activo que explota con volumen. Es una línea de cambio — `db.select().from(users).limit().offset()`. Carmen, ¿puedes cerrarlo como hotfix esta semana, fuera del sprint?

**Carmen:** Sí. Dame la spec de los parámetros esperados y lo cierro hoy mismo.

**Ingrid:** Usa `page` y `per_page` como el resto de endpoints — ya está documentado en OpenAPI para categories. Replica exactamente ese patrón.

**Lucas:** Y sobre Nico — lleva cuatro sprints sin tickets. Si Sprint 5 incluye la UI de plugins o apariencia, necesito a Nico activo. Propongo asignarle la UI de gestión local de plugins si el signal ICP-1 confirma marketplace en el radar.

**Martín:** Lo coordino con Tomás en el planning. La activación de Nico depende de si el debrief ICP-1 (#60) da señal de marketplace. Si sí, Nico en Sprint 5. Si no, espera Sprint 6.

**Tomás:** Muy bien. Antes de cerrar, tengo que levantar una preocupación de proceso que nadie ha dicho pero todos han insinuado: llevamos cuatro sprints sin una retro que se cierre antes de empezar el siguiente. Sprint 3 → Sprint 4 lo hicimos bien (retro 17-05, cierre 19-05 AM). Sprint 4 → Sprint 5, hoy ya estamos en kickoff y la retro ni está lanzada. Propongo como regla del equipo: ningún kickoff arranca sin retro cerrada del sprint anterior. ¿Hay acuerdo?

**Alejandro:** Acuerdo. Tomás, lanza la retro. Timeline: retro Sprint 4 lanzada hoy, cierre lunes. Planning formal Sprint 5 — martes, después de que Alejandro traiga decisión de licencia y debrief ICP-1. Martín confirma CLA y publish-gate antes del planning.

**Román:** Una última cosa técnica antes de cerrar: PROJECT_STATUS marca ADR-020 y ADR-021 como Proposed. Están ambos Accepted — implementados en Sprint 3 y Sprint 4 respectivamente. Tomás, ¿puedes actualizar el status doc como parte del cierre del sprint? Es deuda de documentación, no técnica.

**Tomás:** Sí, lo corrijo hoy junto con el lanzamiento de la retro. Es parte del "cerrar el sprint limpiamente" que acabo de proponer como regla.

**Martín:** ¿Entonces el milestone principal de Sprint 5? Lo necesito en una frase para el tracking.

**Alejandro:** "NodePress adoptable: CLI funcional, importación WP real, repo abierto a contribuidores con CLA y licencia definida."

**Tomás:** Bien. Tengo lo que necesito para estructurar el sprint. ¿Cerramos?

---

## Puntos Importantes

1. **Techo Sprint 5: 10 tickets máximo** — velocity tendencia descendente (S4=8/10). 8 slots nuevos tras incluir #60 y #61 como deuda heredada. _(Tomás + Martín)_
2. **ADR-022 WP Import Strategy es bloqueante antes de código** — SAX parser, scope mínimo (posts+terms+users+comments), idempotencia, media y custom post types fuera. _(Román + Ingrid)_
3. **CLA webhook + publish-cli approval gate = pre-requisitos del repo público** — Helena los cierra esta semana, Martín coordina. _(Alejandro + Martín + Román)_
4. **Licencia dual vs GPL puro: decisión antes del planning** — Alejandro + Eduardo martes. Sin esto CONTRIBUTING.md no puede cerrarse. _(Alejandro + Román)_
5. **Plugin marketplace Sprint 5 = signal, no infra** — GitHub topic + README sección + `nodepress plugin list`. ADR de marketplace solo si ICP-1 confirma ≥5 calls con interés en plugins terceros. _(Alejandro + Román + Ingrid)_
6. **WP Import CLI: 4 días, scope mínimo acordado** — incluye fix bug taxonomías en PUT /wp/v2/posts como subtarea. _(Carmen + Ingrid)_
7. **React Router migración entra como ticket propio** — hash routing no escala. 3 días con tests. _(Lucas + Román)_
8. **Retro Sprint 4 pendiente — lanzar hoy, cerrar lunes** — nueva regla de equipo: ningún kickoff arranca sin retro cerrada. _(Tomás)_
9. **Hotfix: paginación en memoria GET /wp/v2/users** — Carmen cierra hoy, patrón page/per*page como /categories. *(Ingrid + Carmen)\_
10. **PROJECT_STATUS inconsistente con ADRs** — ADR-020/021 marcados Proposed, están Accepted. Tomás corrige hoy. _(Román + Tomás)_

---

## Conclusiones

### Decisiones tomadas

- **D-030:** Techo Sprint 5 = 10 tickets (8 nuevos + #60 + #61 heredados). _(Martín + Tomás)_
- **D-031:** ADR-022 WP Import Strategy — Román escribe día 1 del sprint antes de cualquier código. _(Román + Ingrid)_
- **D-032:** Scope WP Import CLI Sprint 5 = posts + terms + users + comments. Media, custom post types, plugin-meta PHP-serialized = fuera, log warning. _(Ingrid + Carmen)_
- **D-033:** Plugin marketplace Sprint 5 = signal only (topic + docs + `plugin list`). Infra/registry/endpoints = Sprint 6+ condicionado a ICP-1 signal. _(Alejandro + Román)_
- **D-034:** Licencia dual vs GPL puro — Alejandro decide con Eduardo antes del planning del martes. Sin decisión, el planning no arranca. _(Alejandro)_
- **D-035:** React Router v7 migración entra como ticket Sprint 5. _(Lucas + Román)_
- **D-036:** CLA webhook + publish-cli approval gate = bloqueantes del planning. Helena los cierra antes del martes. _(Martín)_
- **D-037:** Regla de proceso: ningún kickoff arranca sin retro del sprint anterior cerrada. _(Tomás + equipo)_
- **D-038:** Nico se activa en Sprint 5 solo si debrief ICP-1 confirma señal marketplace (≥5 mentions plugins terceros). _(Martín + Lucas)_

### Desacuerdos pendientes

Ninguno. Los temas de mayor tensión (scope WP Import, marketplace) se resolvieron con separación clara entre signal (Sprint 5) e infra (Sprint 6+).

---

## Acciones

| #   | Acción                                                                             | Responsable         | Plazo                 |
| --- | ---------------------------------------------------------------------------------- | ------------------- | --------------------- |
| 1   | Lanzar retro Sprint 4 async: `docs/process/retros/sprint-4-retro.md`               | Tomás               | Hoy 2026-04-18        |
| 2   | Corregir ADR-020 y ADR-021 en PROJECT_STATUS de Proposed → Accepted                | Tomás               | Hoy 2026-04-18        |
| 3   | Coordinar con Helena: CLA webhook activo + publish-cli.yml approval gate           | Martín              | Hoy EOD 2026-04-18    |
| 4   | Hotfix: paginación en memoria GET /wp/v2/users (limit/offset en query)             | Carmen              | Hoy 2026-04-18        |
| 5   | Fix pre-sprint: browser.confirm() → modal propio + TODO comments → GitHub issues   | Lucas               | Hoy/mañana pre-sprint |
| 6   | Debrief ICP-1: cuántos de 15 calls mencionaron plugins terceros vs propios         | Alejandro           | Martes 2026-04-20 AM  |
| 7   | Decisión licencia: dual (GPL+Commercial) vs GPL puro                               | Alejandro + Eduardo | Martes 2026-04-20     |
| 8   | Planning Sprint 5 formal (post retro cerrada + decisión licencia + CLA confirmado) | Tomás               | Martes 2026-04-20     |
| 9   | ADR-022 WP Import Strategy (scope, parser, idempotencia, exclusiones)              | Román               | Día 1 Sprint 5        |
| 10  | Tickets Sprint 5 formales en PROJECT_STATUS (#66-#73 aprox)                        | Martín              | Antes del planning    |
| 11  | CODEOWNERS: paths core/server/plugin-api/admin con reglas de review                | Román               | Día 1 Sprint 5        |
| 12  | Actualizar OpenAPI spec con surface actual (taxonomías, users/me, context=edit)    | Ingrid              | Sprint 5 semana 1     |
| 13  | Activar/briefear Nico si debrief ICP-1 confirma señal marketplace                  | Martín + Lucas      | Tras debrief (#6)     |

---

_Generado por /meet — Trinity_
