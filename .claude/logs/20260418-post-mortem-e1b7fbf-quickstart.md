# Reunión: Post-mortem commit e1b7fbf — Developer Quickstart roto

**Fecha:** 2026-04-18 (noche)
**Participantes:** Tomás (Scrum Master), Ingrid (Lead Backend), Helena (IT Manager), Román (Tech Lead), Martín (Ops Manager)
**Duración estimada:** 45 minutos

---

## Preparación Individual

### Tomás (Scrum Master)

- R-1 diseñado para `build + typecheck + test`, NO para "arranca desde cero". Gap de diseño, no de personas.
- R-4 cubre coherencia de rutas documentales, no ejecución.
- Narrativa "108 tests verdes" es alerta — CI verde ≠ proyecto arrancable por nuevo contribuidor.
- Propuesta DoD: "Clean-clone test executed, documented in PR body".
- Preocupación: la reunión puede derivar a buscar culpables. Hay que reformular: fallo de sistema, no de persona.

### Ingrid (Lead Backend)

- **Causa raíz #1:** migration manual `plugin_registry.sql` en #21 — silenció síntoma de drizzle-kit vs NodeNext con SQL a mano, sin journal.
- **Causa raíz #2:** ADR-001 NodeNext ESM nunca se validó operacionalmente contra drizzle-kit CJS.
- **Causa raíz #3:** `.env` no era parte del contrato de arranque — supuesto implícito roto.
- Propuesta: `npm run smoke:fresh-clone` con Testcontainers — 90s, cacha los 6 errores.
- Riesgo: el walk-up de `.env` en client.ts rompe silencioso si movemos el paquete.

### Helena (IT)

- R-1 falló porque mezcló "CI verde" con "funciona desde cero".
- CI actual: typecheck + lint + test. Sin Postgres. Sin migrate. Sin curl. Los 7 errores eran invisibles **por diseño**.
- Propuesta: job `smoke-fresh-clone` en CI con services Postgres → migrate → server boot → curl /posts. Falla = rojo.
- PR template: añadir "smoke-fresh-clone pasa en CI" como check.
- Riesgo reputacional: primer issue post-público sería "no arranca".

### Román (Tech Lead)

- **Asumo la cadena como fallo arquitectónico mío.** ADR-001 y ADR-002 no mencionaron tooling CJS ni contratos quickstart. Tres fixes de Sprint 0 (`allowImportingTsExtensions`, DOM lib, composite emit) ya eran señal recurrente que ignoré.
- Recomendación: mantener NodeNext + documentar contrato `NODE_OPTIONS="--import tsx"` para tooling CJS.
- Propuesta ADR-014: "Developer Quickstart Invariant" — contrato escrito verificable en CI.
- Regla contributing.md: cambios a `packages/db/**`, `drizzle.config.ts`, `tsconfig*.json`, `.env.example` exigen smoke fresh-clone en PR body.
- ADR meta pendiente: "Tooling runtime boundary" — runtime vs CI vs developer tools.

### Martín (Ops)

- Coste real: 45 min developer perdidos = 0.8% capacity Sprint 1 quemado en fricción.
- Outreach privado arranca viernes 24 — si CTO ICP-1 clona antes del fix, no-go instant.
- Propuesta métrica TTFA (Time to First API Call) < 5 min desde `git clone`.
- Accountability: este commit no pasó por filtro trío (Martín + Román + Tomás). Yo no lo vi. No se repite.
- CLA Assistant jueves 23 — repo roto a esa sesión sería señal pésima internamente.

---

## Conversación

**Tomás:** Antes de empezar, un encuadre explícito: lo que vamos a analizar es fallo de sistema, no de personas. Si alguien se siente atacado en los próximos 40 minutos, levantad la mano y paro. Comienzo con la pregunta que llevo preparada: si yo llego mañana al repo sin haber tocado nada, ¿en qué paso falla, y cuánto tardamos en saberlo?

**Ingrid:** Falla en el primer `npm run db:migrate`. Y lo sabríamos inmediatamente — en 30 segundos. El problema es que nadie ha hecho eso en los últimos dos días. Yo arranqué mi entorno hace semanas, Román lo tiene caliente, Lucas usa MSW, Carmen mockea la DB. Literalmente ningún humano del equipo probó el arranque desde cero esta semana.

**Román:** Matizo — el error no es solo que nadie lo probara. Es que el sistema no nos obligaba a probarlo. Y eso es responsabilidad arquitectónica mía. ADR-001 fijó NodeNext ESM. ADR-002 fijó el layout monorepo. Ninguno dijo ni una palabra sobre cómo el toolchain CJS — drizzle-kit — atraviesa esa frontera. Cuando la rama `ci/db-migrations-cleanup` del Sprint 0 normalizó las extensiones `.js`, la correctísima para runtime Node ESM, el detonante quedó instalado. Yo aprobé ese merge. Los tres fixes de tsconfig que hicimos después ya eran la misma clase de error repitiéndose. No escuché la señal.

**Helena:** Yo tengo que añadir mi parte. R-1, que propuse en la retro Sprint 0, se diseñó para validar "build + typecheck + test" en los 3 packages canary. No valida que el entorno arranque. Son dos cosas distintas y yo las mezclé cuando lo redacté. Lo que teníamos en CI era: checkout, npm ci, typecheck, lint, test. Sin Postgres. Sin migrate. Sin una sola petición HTTP. Los 7 errores de hoy eran invisibles no por mala suerte — **por diseño del CI**.

**Martín:** Yo también asumo lo mío, antes de que sigamos. El protocolo scope freeze aprobado esta mañana dice que cualquier ticket nuevo en Sprint 1 requiere Román, Tomás y yo como filtro. Este commit no pasó por ahí. Yo debía haberlo visto, no lo vi. No se repite.

**Tomás:** Parada de facilitador. Lo que estoy viendo es sano: cuatro personas han dicho "es parte mío" sin que nadie se haya defendido. Eso es exactamente el tono que necesitamos. Sigamos en esa dirección, pero mirando hacia adelante. Ingrid, tú mencionaste en tu prep que el fichero manual de plugin_registry fue silenciar un síntoma. Explícamelo.

**Ingrid:** En Sprint 0 intenté generar las migrations con `drizzle-kit generate` y me falló por el problema de resolución `.js` bajo NodeNext. En ese momento, en lugar de parar y forzar que funcionara, escribí el SQL de `plugin_registry` a mano como fichero numerado. Eso me desbloqueó para mi ticket #21. Pero creó un directorio `drizzle/` sin `_journal.json`, que es lo que drizzle-kit usa para saber qué migrations ha aplicado. Hoy cuando el usuario corrió `db:migrate`, drizzle abrió ese directorio, no encontró journal, y murió. Mi decisión táctica de hace 9 días generó un fallo hoy. Debería haber documentado el bloqueante en ese PR en lugar de enmascararlo con SQL.

**Román:** Y ahí es donde yo debería haber dicho "no, para. Si drizzle-kit no funciona con NodeNext, tenemos un problema arquitectónico antes que de ticket". No lo dije. Acepté el workaround táctico.

**Helena:** Me interesa más la pregunta de fondo de Román — la del trade-off NodeNext versus bundler resolution. ¿Mantenemos NodeNext?

**Román:** Mantenemos. La razón es operativa: NodeNext alinea runtime Node 22 ESM sin bundler en producción, legibilidad, source maps uno a uno, y zero-build dev path con tsx. Bundler resolution eliminaba los sufijos `.js` pero rompía `node packages/server/dist/index.js` directo en prod y nos obligaba a bundler universal. El coste real de NodeNext es que el toolchain CJS del ecosistema — drizzle-kit, algunos plugins de ESLint, jest transformers legacy — no resuelve `.js` a `.ts`. La solución del commit de hoy, `NODE_OPTIONS="--import tsx"`, es un workaround, pero es un workaround **predecible**. Mi propuesta es que quede escrito como ADR.

**Martín:** Un momento práctico antes de que entremos en ADRs. Tengo una cuenta atrás. CLA Assistant es el jueves 23, outreach privado arranca el viernes 24. Si un CTO del ICP-1 clona el repo entre hoy y el viernes y no arranca, hemos quemado esa primera conversación para siempre. Mi pregunta: el fix está en main ahora mismo, ¿es suficiente? ¿O necesitamos algo más antes del jueves?

**Ingrid:** El fix resuelve los síntomas observados hoy. Pero lo que no resuelve es que no tenemos red para el siguiente error de la misma clase. Si Helena añade mañana un job de smoke-fresh-clone en CI, entonces sí tenemos red. Mientras tanto vivimos de la suerte.

**Helena:** Lo puedo tener mañana. Job `smoke-fresh-clone` en el workflow de CI: servicio Postgres vía `services:` de GitHub Actions — sin docker-compose manual en CI —, `cp .env.example .env`, `npm run db:drizzle:push`, arranca server en background, `curl -f http://localhost:3000/wp/v2/posts`. Si cualquier paso falla, CI rojo. Sin warn-only. Estimación: 3 horas de trabajo real.

**Martín:** Tres horas mañana, Helena. Bloquea mi outreach del viernes si no está. ¿Cuenta como tu scope Sprint 1 o como hotfix?

**Helena:** Hotfix. Esto no entra por el protocolo de scope freeze — es restauración de invariante, no feature nueva.

**Tomás:** Correcto, esa distinción es la que yo necesitaba escuchar. Lo que Martín y Helena están nombrando es que "restaurar invariante roto" no es scope creep. Eso entra en el DoD. Propongo apuntarlo como regla explícita en el protocolo.

**Román:** De acuerdo. Yo complemento lo de Helena con ADR-014 — "Developer Quickstart Invariant". Contrato escrito, una página: `git clone && cp .env.example .env && docker-compose up -d && npm i && npm run db:drizzle:push && npm run dev` debe pasar en cualquier commit de main. El job de Helena es la verificación. El ADR es el contrato. Lo escribo mañana también.

**Martín:** Y yo añado una métrica operativa para que no sea solo pasa/no-pasa. "Time to First API Call", TTFA, objetivo menor de 5 minutos desde `git clone`. Medida automática del job de Helena: tiempo entre checkout y el primer curl verde. Si superamos 5 minutos, el job pasa pero emite warning. Si superamos 10, rojo.

**Ingrid:** Me gusta TTFA. Pero quiero añadir una cosa de autocrítica: el fichero manual `plugin_registry.sql` que escribí en #21 es representativo de un patrón mío bajo estrés. Cuando una herramienta no colabora, yo tiendo a rodearla en lugar de pararme. Voy a escribirlo en mi project_memory como regla personal — si la tool no funciona, documento el bloqueante antes de escribir el workaround.

**Tomás:** Eso lo anoto como señal sana, Ingrid. Lo hablamos en la retro Sprint 1 si quieres. Una última pregunta antes de cerrar acciones: ¿hay algo aquí que indique que el equipo vaya con exceso de velocidad? La narrativa de "108 tests verdes, 92% done" — ¿nos dio un falso confort?

**Román:** Sí. Y yo lo arrastré en mi reporte de estado de esta mañana. Decía "solid base, momentum alto". La base no era sólida desde la perspectiva de un developer que llega nuevo. Era sólida desde mi perspectiva, que es la de alguien con el entorno caliente. Error de framing mío.

**Helena:** Añado un dato operativo: coverage del paquete db en 75% warn-only no ayuda si la base no se ejecuta. Los números de coverage sobre un sistema mockeado certifican que los mocks son consistentes con los mocks, no que el sistema real funciona.

**Martín:** De acuerdo. El indicador que propongo añadir a la salud del sprint es TTFA, no solo coverage. Y el burndown semanal que empiezo el lunes incluirá esa métrica.

**Tomás:** Bien. Recojo: ADR-014 Quickstart Invariant — Román, mañana. Job CI `smoke-fresh-clone` — Helena, mañana, antes del jueves. TTFA métrica — Martín, integrar en burndown. Regla contributing.md sobre PRs que tocan tooling — Román. Script `npm run smoke:fresh-clone` local con Testcontainers — Ingrid, esta semana. DoD updated con clean-clone test — yo, redacción para el viernes. Protocolo hotfix vs scope freeze formalizado — yo también. ¿Algo más?

**Ingrid:** Una cosa. Hoy usamos `drizzle:push` para desbloquear. En producción eso es insuficiente — perdemos historial de migraciones. Necesitamos un ticket Sprint 2 para volver a `drizzle:generate + migrate` con journal comiteado. Carmen puede llevarlo si le escribo el brief.

**Román:** Apuntado para planning Sprint 2. Y añado el ADR meta "Tooling runtime boundary" que mencioné en mi prep. Runtime, CI, developer tools — cada uno con su contrato explícito. Sprint 2 también.

**Martín:** Cierro yo con lo incómodo. Este commit no pasó por el trío Martín + Román + Tomás. El protocolo existe desde esta mañana. Yo debería haber visto la entrada. Lo nombro para que no se repita — y para que el protocolo tenga el peso que le dimos al aprobarlo.

**Tomás:** Lo recogido y lo nombrado es suficiente. Gracias por la honestidad. Salimos.

---

## Puntos Importantes

1. **Fallo sistémico, no personal** — 4 de 5 participantes asumieron responsabilidad directa. Tomás enmarcó sin señalar culpables. (Tomás)
2. **CI verde ≠ proyecto arrancable** — narrativa "108 tests verdes" generó falso confort. Coverage sobre mocks no certifica sistema real. (Helena + Tomás)
3. **Manual migration de Sprint 0 fue silenciar síntoma** — Ingrid escribió `plugin_registry.sql` a mano cuando `drizzle-kit generate` falló. Patrón bajo estrés identificado. (Ingrid)
4. **NodeNext ESM vs drizzle-kit CJS nunca se evaluó operacionalmente** — ADR-001/002 ignoraron tooling. Fixes recurrentes de tsconfig fueron la señal ignorada. (Román)
5. **3 fixes tsconfig Sprint 0 fueron clase-de-error recurrente, no incidentes aislados** — señal que Román asume haber ignorado. (Román)
6. **NodeNext se mantiene** — trade-off favorable (runtime Node directo, source maps 1:1). Workaround `NODE_OPTIONS="--import tsx"` queda documentado en ADR. (Román)
7. **R-1 (pre-flight tooling) no cubría "arranca desde cero"** — Helena mezcló "CI verde" con "funciona desde cero" al redactar. Error admitido. (Helena)
8. **Scope freeze no aplica a hotfix restaurativo** — distinción explícita: restaurar invariante ≠ feature nueva. (Tomás consolida)
9. **Ventana reputacional crítica** — outreach viernes 24, CLA jueves 23, repo puede ser clonado por CTOs ICP-1. Fix en main + CI antes del jueves es innegociable. (Martín)
10. **`drizzle:push` es deuda de prod** — historial migraciones perdido. Ticket Sprint 2 para volver a `generate+migrate` con journal. (Ingrid)
11. **Este commit rompió el protocolo scope freeze** aprobado esta mañana — Martín asume no haberlo visto, nombra la deuda de gobernanza para que no se repita. (Martín)

## Conclusiones

- Consenso total. Cero desacuerdos.
- Tono de la sesión: autocrítica sana y mirada hacia adelante. Sin defensas.
- Lección meta identificada: "restaurar invariante roto" es categoría distinta a "scope creep" y debe quedar escrita.
- Señal positiva del equipo: cuatro owners distintos asumieron parte sin que nadie los forzara. Tomás apunta que es indicador de madurez del equipo.

## Acciones

| #   | Acción                                                                                                                              | Responsable                     | Plazo                                   |
| --- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- | --------------------------------------- |
| 1   | CI job `smoke-fresh-clone` con services Postgres + migrate + curl /posts                                                            | Helena                          | Miércoles 2026-04-22 (antes CLA jueves) |
| 2   | ADR-014 "Developer Quickstart Invariant" — contrato quickstart verificable                                                          | Román                           | Jueves 2026-04-23                       |
| 3   | Métrica TTFA (Time to First API Call) <5 min integrada en burndown + CI report                                                      | Martín                          | Lunes 2026-04-21 (con burndown)         |
| 4   | `npm run smoke:fresh-clone` local con Testcontainers (6 errores en <90s)                                                            | Ingrid                          | Viernes 2026-04-24                      |
| 5   | Regla contributing.md: PRs que tocan `packages/db/**`, `drizzle.config.ts`, `tsconfig*`, `.env.example` exigen smoke doc en PR body | Román                           | Viernes 2026-04-24                      |
| 6   | DoD updated: "Clean-clone test executed, documented in PR body"                                                                     | Tomás                           | Viernes 2026-04-24                      |
| 7   | Protocolo "hotfix vs scope freeze": restauración invariante ≠ scope nuevo                                                           | Tomás                           | Lunes 2026-04-21                        |
| 8   | Ticket Sprint 2: volver a `drizzle:generate + migrate` con journal comiteado                                                        | Ingrid (brief) + Carmen (ejec.) | Planning Sprint 2                       |
| 9   | ADR-015 "Tooling runtime boundary" — runtime vs CI vs developer tools                                                               | Román                           | Planning Sprint 2                       |
| 10  | Regla personal Ingrid: si tool no colabora, documento bloqueante antes de workaround                                                | Ingrid (personal)               | Continua                                |
| 11  | Revisión protocolo scope freeze tras fallo hoy — nombrar caso en próxima retro                                                      | Martín + Tomás                  | Retro Sprint 1 (2026-04-30)             |

---

_Generado por /meet — Trinity_
