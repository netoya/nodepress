# Reunión: Flujos sin cobertura — Román cuenta su experiencia reparando el bridge que parecía listo

**Fecha:** 2026-04-19
**Participantes:** Román (Tech Lead), Raúl (Dev Backend), Ingrid (Lead Backend), Helena (IT Manager), Lucas (Lead Frontend)
**Duración estimada:** 50 min

---

## Preparación Individual

**Román:** Tres bugs acumulados invisibles al test suite (piloto sin `add_shortcode`, regex escaping roto en template literal JS, once stubs sin `function_exists` guard). Ningún test ejecutaba PHP real — 281 tests mockeaban `@php-wasm/node` completo. El bug llevaba activo desde Sprint 2. La lección R-2 ("tests JS-simulados producen falsos verdes") estaba en memoria desde esa mañana y no se convirtió en gate de CI. Propone: tests wasm reales + job CI + smoke Tier 2.

**Raúl:** El patrón `*.real-php.test.ts` análogo al `*.real-db.test.ts` no existe. El spike tenía ejecución real pero sin `test` script — nunca corrió en CI. Identifica cinco flujos sin cobertura: singleton lifecycle, pilot injection order, stubs en contexto de error, concurrencia, y timeout en handler REST. BRIDGE_FATAL correcto en prod pero tóxico en desarrollo.

**Ingrid:** La causa raíz es que el nivel de abstracción del mock no coincide con el nivel del contrato. `simulateBridgeWithFootnotes` mide una reimplementación JS — si modificas el PHP, los tests pasan igual. El escaping de template strings PHP es el mayor riesgo activo. Propone tres tiers: tests PHP-in-isolation, tests WASM reales, y tests E2E REST con `NODEPRESS_TIER2=true`.

**Helena:** ADR-018 §Consequences #2 tenía el gate de stubs contra runtime real escrito. No se cerró. El incidente es consecuencia directa. Once vectores del threat model sin test real. `open_basedir` de ADR-018 no aplica en php-wasm (acordado esta mañana) — necesita amendment. El marcador `[NP_CURL_REQUEST:...]` puede ser vector SSRF de segunda generación si `postContent` lo puede forjar.

**Lucas:** `demo-php-plugin.spec.ts` escena 6 tenía el assert de shortcode explícitamente desactivado con comentario "BRIDGE_FATAL known issue". Un test que no falla cuando el sistema falla no es un test. Cero cobertura de public site en CI (`testIgnore: ["**/demo/**"]`). Propone suite `public-site-shortcodes.spec.ts` y regla de equipo: specs sin assert principal van a `e2e/skipped/` con issue bloqueante.

---

## Conversación

**Román:** Voy a contar lo que pasé hoy, porque creo que hay algo que el equipo tiene que escuchar en primera persona. Teníamos 281 tests en verde. Testsuite completa. CI pasando. Y el bridge PHP-WASM llevaba semanas completamente roto — ningún shortcode había renderizado nunca con `NODEPRESS_TIER2=true`. El fail-safe `BRIDGE_FATAL → passthrough` lo enmascaró perfectamente. El usuario veía el contenido sin procesar y asumía que era comportamiento normal.

Tres bugs acumulados que ningún test detectó. El primero era funcional: el piloto de footnotes usaba sintaxis MCI legacy `((texto))` y nunca llamó a `add_shortcode`. El segundo era de escaping: `\'` dentro de backticks JS — JavaScript se come el backslash antes de que llegue al PHP. El tercero era un fatal de redeclaración: once stubs de built-ins sin `function_exists` guard, y el singleton PHP-WASM persiste entre requests. La segunda llamada petaba siempre.

Mi pregunta para el equipo es: ¿por qué los tests no lo pillaron? Y más importante: ¿qué flujos de testing necesitamos que hoy no existen?

**Ingrid:** La causa raíz está en el nivel de abstracción del mock. Los tests del bridge mockeaban `@php-wasm/node` entero. Eso significa que el PHP generado por `buildBootstrapCode` — doscientas y pico líneas con escaping, stubs, shortcode engine — nunca se ejecutó en ningún test. Los mocks devolvían JSON trivial sin tocar el runtime.

Y los tests de pilotos son peor aún. `simulateBridgeWithFootnotes` reimplementa la lógica del piloto en JavaScript. Es un test que mide una reimplementación JS, no el PHP real. Si modificas el PHP del piloto, los tests siguen pasando porque están midiendo otra cosa. Eso no es un test — es una ilusión de cobertura.

**Raúl:** Lo que describe Ingrid es exactamente lo que yo vi cuando implementé el RealPhpPilot en la rama `poc/php-real-plugins`. Tuve que ejecutar manualmente el spike para verificar que funcionaba porque sabía que los tests no me cubrían. Lo que no tenemos es el patrón `*.real-php.test.ts` análogo al `*.real-db.test.ts` que ya existe para Postgres. El setup ya está — solo falta aplicarlo al bridge.

**Román:** Exacto. Y ese patrón ya lo acordamos cuando hicimos el spike de php-wasm — lección R-2 en mi memoria: "tests JS-simulados sobre php-wasm producen falsos verdes". Eso quedó escrito el 19-04 por la mañana. Diez horas después volvimos a pagar la misma deuda. El problema no es que no lo sabíamos — es que no lo convertimos en un gate de CI.

**Helena:** Aquí tengo que ser directa. ADR-018 §Consequences #2 dice literalmente que los stubs PHP deben cubrirse con tests que verifiquen que el stub se activa contra el runtime real. Ese gate estaba escrito. No se cerró. Hoy tenemos once stubs —`exec`, `system`, `shell_exec`, `passthru`, `popen`, `proc_open`, `mail`, `curl_exec`, `curl_multi_exec`, `file_put_contents`, `fwrite`— y ninguno tiene un test de integración real que confirme que (a) el stub intercepta la llamada, (b) emite el warning correspondiente, y (c) no produce efecto secundario real. Eso es un agujero de seguridad, no solo de testing.

**Lucas:** Desde el frontend la foto es la misma. `demo-php-plugin.spec.ts`, escena 6, línea 288 — el assert de shortcode está explícitamente comentado con "BRIDGE_FATAL known issue". Un test que no falla cuando el sistema falla no es un test, es documentación. Y está en `demo/`, que `playwright.config.ts` excluye de CI con `testIgnore: ["**/demo/**"]`. El spec que habría atrapado esto nunca corrió en CI.

**Ingrid:** Lucas, ese punto sobre `testIgnore` es importante y va más allá del demo spec. No tenemos ningún spec de public site en CI. Cero cobertura de `GET /p/:slug` en browser real. El theme engine, el bridge, el renderizado de shortcodes — todo eso vive fuera de la pirámide de testing que sí corre en CI.

**Román:** Mi recomendación es que esto no es un problema de "escribir más tests". Es un problema estructural de tres capas que hay que resolver en orden. Primero: tests PHP-WASM reales en `bridge/__tests__/bridge.wasm.test.ts` — sin mock de `@php-wasm/node`, arrancando el singleton real, verificando output de cada shortcode. Segundo: job de CI `bridge-e2e` que corre cuando tocas `packages/server/src/bridge/**` y que bloquea merge. Tercero: spec de public site fuera de `demo/` que aserta el golden path completo — post con shortcodes, `GET /p/:slug`, HTML transformado visible en browser.

**Raúl:** Puedo hacer el primero esta semana. El patrón es el mismo que los tests de Testcontainers: config vitest separada, `skip` si el runtime no está disponible en el entorno. Estimo un día para cinco o seis tests que cubran singleton lifecycle, pilot injection order, stubs en contexto de error, y concurrencia. El bug de redeclaración habría salido en el tercer test como máximo.

**Helena:** El job de CI lo incorporo a `ci.yml` como step separado con `if: contains(github.event.head_commit.modified, 'packages/server/src/bridge/')`. Lo prefiero como step dentro del workflow existente, no workflow aparte — comparte los servicios Postgres ya configurados. Tiempo de implementación: medio día. Pero antes necesito dos cosas: que Raúl verifique empíricamente que `file_get_contents('../../../.env')` devuelve false desde PHP en el VFS — ese test negativo lleva pendiente desde esta mañana — y que el amendment de ADR-017 esté firmado. No co-signo nada que tenga el `vfsMounts` sin cerrar.

**Lucas:** Para el tercer punto propongo una suite `public-site-shortcodes.spec.ts` fuera de `demo/`. La aserción mínima es negativa y robusta: `expect(await page.locator('main').textContent()).not.toContain('[footnote]')`. No depende del marcado exacto del plugin — si el bridge falla y sirve verbatim, cae. Y la aserción positiva: `expect(page.locator('sup.footnote-ref').first()).toBeVisible()`. Eso cubre el golden path completo.

**Ingrid:** Hay un cuarto punto que nadie ha mencionado explícitamente pero que es igual de importante. `NODEPRESS_TIER2=true` no tiene ningún test de integración con el handler REST real. El env var que activa el bridge en `handlers.ts` líneas 73 y 118 no se ejerce en ningún test existente con el valor `true`. Si hay un bug en el código de activación del bridge en el handler — no en el bridge en sí — es invisible. Eso hay que añadirlo a `posts.real-db.test.ts` como un describe separado con `process.env.NODEPRESS_TIER2 = "true"`.

**Román:** Bien identificado, Ingrid. Eso cierra el loop que más me preocupaba: CI verde no certifica que el producto funciona cuando `NODEPRESS_TIER2=true`. Necesitamos que al menos un test de integración REST con Postgres real active el bridge real y verifique el output. Ese test habría atrapado los tres bugs simultáneamente.

**Raúl:** ¿Y qué hacemos con `BRIDGE_FATAL → passthrough`? Sigo creyendo que es el comportamiento correcto en producción — no exponemos 500 al usuario. Pero en desarrollo debería ser visible. Un log `console.error` con el detalle cuando `NODE_ENV=development` sería suficiente para detectarlo en tiempo de desarrollo sin cambiar el comportamiento en prod.

**Helena:** De acuerdo con Raúl, pero con matiz. El log en development lo pongo como #1. Para producción, propongo que `BRIDGE_FATAL` emita el `error_detail_hash` en el span de observabilidad — los primeros 64 bytes del error hasheados, sin leakear contenido. Dashboard agrupa por hash y los patrones de fallo recurrentes se hacen visibles antes de que un usuario los reporte. Eso es R-6 de la memoria de Román ya documentado — toca accionarlo.

**Lucas:** Última cosa desde mi lado: el patrón "known issue comentado" es peligroso como práctica. Si el equipo acepta marcar asserts como `// TODO: add when X is fixed`, cualquier componente que falle silenciosamente puede colarse por el mismo camino. Propongo una regla de equipo: si no puedes assertar el comportamiento principal de una escena, el spec va a un directorio `e2e/skipped/` con un issue bloqueante abierto. No a `demo/`. Y CI no pasa si hay specs en `skipped/` sin issue asociado.

**Román:** Esa regla la adopto. La documentamos como constraint en el ADR-014 amendment que ya tenía pendiente de todas formas. ADR-014 cubre el Developer Quickstart Invariant — hay que extenderlo para que incluya `NODEPRESS_TIER2=true` en el smoke, y añadir la regla de Lucas como constraint de CI. Ingrid y Helena, ¿co-signáis ese amendment si lo preparo esta semana?

**Ingrid:** Sí, con una condición: el amendment especifica explícitamente qué env vars activan qué flows en CI y cuál es el smoke mínimo por flow. No quiero un ADR que diga "también aplica a Tier 2" sin definir qué significa eso operativamente.

**Helena:** Co-sign condicionado a lo mismo que siempre: los tests que el ADR dice que existen, existen de verdad y corren en CI. Esta vez verifico antes de firmar.

---

## Puntos Importantes

1. **Tres bugs acumulados invisibles** (Román): piloto sin `add_shortcode`, escaping roto en template literal JS, stubs sin `function_exists` guard. Todos pre-existentes. Todos invisibles porque los tests mockeaban `@php-wasm/node` completo.
2. **El mock de runtime completo es una ilusión de cobertura** (Ingrid): `simulateBridgeWithFootnotes` mide una reimplementación JS, no el PHP real. Patrón activamente dañino.
3. **ADR-018 §Consequences #2 tenía el gate escrito — no se cerró** (Helena): cobertura de stubs contra runtime real era un requisito documentado.
4. **El fail-safe BRIDGE_FATAL oculta bugs en desarrollo** (Raúl + Helena): correcto en producción, tóxico en desarrollo. Fix: `console.error` en `NODE_ENV=development` + `error_detail_hash` en span para producción.
5. **Cero cobertura de public site en CI** (Lucas + Ingrid): `testIgnore: ["**/demo/**"]` excluye los únicos specs que ejercen el renderizado.
6. **`NODEPRESS_TIER2=true` sin test REST real** (Ingrid): el env var que activa el bridge en los handlers no se ejerce con `true` en ningún test existente.
7. **Patrón reincidente — lección R-2 escrita y no accionada** (Román): tres incidentes en tres semanas con la misma firma: tests verdes, producto roto.
8. **Regla "spec sin assert principal va a `e2e/skipped/`" con issue bloqueante** (Lucas): adoptada por Román. Documentar en ADR-014 amendment.
9. **`function_exists` guard obligatorio en todo PHP de bootstrap y pilotos** (Helena): nuevo constraint para ADR-017 — verificación obligatoria en code review.

## Conclusiones

- Tests `bridge.wasm.test.ts` sin mock de `@php-wasm/node`: Raúl los implementa esta semana.
- Test negativo VFS (`file_get_contents('../../../.env') → false`): Raúl, bloqueante para co-sign Helena en ADR-017.
- CI step `bridge-e2e` en `ci.yml`: Helena, condicional a cambios en `bridge/**`.
- Suite `public-site-shortcodes.spec.ts` fuera de `demo/`: Lucas, assert negativo + positivo.
- Test REST con `NODEPRESS_TIER2=true` en `posts.real-db.test.ts`: Ingrid.
- Log BRIDGE_FATAL en development: Raúl, `console.error` en `NODE_ENV=development`.
- Amendment ADR-014: Román, esta semana — invariant Tier 2 + regla `e2e/skipped/`.

## Acciones

| # | Acción | Responsable | Plazo |
|---|--------|-------------|-------|
| 1 | Implementar `bridge.wasm.test.ts` con runtime PHP-WASM real (5-6 tests, config vitest separada) | Raúl | 2026-04-21 |
| 2 | Test negativo VFS: `file_get_contents('../../../.env')` → false desde PHP real | Raúl | 2026-04-20 |
| 3 | Log `console.error` en `BRIDGE_FATAL` cuando `NODE_ENV=development` | Raúl | 2026-04-20 |
| 4 | Describe `NODEPRESS_TIER2=true` en `posts.real-db.test.ts` + activación bridge real | Ingrid | 2026-04-22 |
| 5 | CI step `bridge-e2e` en `ci.yml` (condicional a cambios en `bridge/**`) | Helena | 2026-04-21 |
| 6 | Suite `public-site-shortcodes.spec.ts` fuera de `demo/`, assert negativo + positivo | Lucas | 2026-04-22 |
| 7 | Amendment ADR-014: invariant Tier 2 + regla `e2e/skipped/` | Román | 2026-04-22 |
| 8 | Co-sign amendment ADR-017 (bloqueado hasta #2 en CI) | Helena | 2026-04-21 AM |
| 9 | `error_detail_hash` en BridgeSpan para dashboard observability | Raúl | Sprint 8 |
| 10 | Auditoría "qué mockea cada suite" por módulo (bridge, plugin-loader, theme-engine) | Ingrid | Sprint 8 |

---

_Generado por /meet — Trinity_
