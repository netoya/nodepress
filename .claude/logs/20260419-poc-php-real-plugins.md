# Reunión: PoC PHP plugins en rama — circuito completo con plugins del spike

**Fecha:** 2026-04-19
**Participantes:** Román (Tech Lead), Raúl (Dev Backend), Helena (IT Manager), Ingrid (Lead Backend)
**Duración estimada:** 45 min

---

## Preparación Individual

**Román:** Definición de "circuito completo" (DB→REST→bridge→PHP-WASM→HTML→ThemeEngine+BridgeSpan). Matriz de viabilidad de los 4 plugins del spike. Riesgos de blast radius (vendor/freemius en SU), falso confort si los tests son JS-simulados (memoria R-2), guardia de D-008 (no Tier 3 por la puerta de atrás). Dos preguntas a decidir en reunión: scope de plugins (1, 2 o 3) y criterio de éxito.

**Raúl:** Bridge hardcodeado en `ACTIVE_PILOTS` estático. Cambio mínimo: `buildPhpCode()` lee desde disco. CF7 real como candidato para demostrar límite Tier 2. 45 min de trabajo para Footnotes. Riesgo de caching que rompería scope reset PHP-WASM.

**Helena:** ADR-018 checkpoint completo. Guards presentes: stubs RCE/HTTP/FS-write, php.ini overrides, timeout JS 5s. Guards ausentes: `open_basedir` (discrepancia ADR vs código), lectura FS local no stubbed (`file_get_contents`), `eval` imposible de bloquear en PHP. Condiciones de co-sign: resolver R-H1 (`open_basedir`), R-H2 (lectura FS local), documentar R-H5 (`eval`) como riesgo residual.

**Ingrid:** `meta.runtime="php"` suficiente para PoC (sin migración). Gap en install-service: falta paso pre-registro antes de resolver dependencias. Flujo necesario: `parsePhpHeaders → register(pending) → resolveDependencies → activate`. Campo `vfsMounts` en contrato `BridgePilot`. Activación de plugin PHP en runtime es el gap más grande.

---

## Conversación

**Román:** Antes de hablar de cómo, necesito que acordemos qué es "circuito completo" para esta PoC. Mi propuesta de definición: post en DB con shortcodes WP reales → GET /wp/v2/posts/:id → the_content filter → renderShortcodes() → PHP-WASM singleton ejecuta ACTIVE_PILOTS[] + do_shortcode() → HTML rendered → respuesta REST + página pública /p/:slug en ThemeEngine → traza observable (BridgeSpan ADR-019) + warnings bounded. Sin los dos extremos —DB real y frontend— no es circuito, es unit test con más pasos. ¿Alguno ve algo distinto?

**Ingrid:** Estoy de acuerdo con la definición. Pero hay un gap en el medio que tenéis que conocer antes de escribir una línea. El install-service actual asume que el plugin ya está en el registry antes de resolver dependencias. Si el plugin PHP llega como directorio —no como tarball npm— el `get(slug)` devuelve `null` y el resolver lo ignora. El flujo tiene que ser: parsear headers del `.php` → pre-registrar con `status: pending` → resolver dependencias → activar. Hoy ese paso de pre-registro no existe.

**Raúl:** Tampoco hace falta para la PoC. Si usamos los fixtures del spike —Footnotes, Display Posts, Shortcodes Ultimate— ya están en disco. No hay install dinámico. Copio el fixture, creo un `RealPhpPilot` que lee el `.php` desde el path del fixture, lo meto en `ACTIVE_PILOTS`, y el bridge lo ejecuta igual que un piloto TS. Cuarenta y cinco minutos de trabajo. El install-service lo resolvemos en el sprint formal.

**Román:** Raúl, el approach es correcto pero hay una restricción que no puedes saltarte. ADR-017 §Pilot Registry prohíbe explícitamente la Opción C —pilotos dinámicos en runtime vía input—. La Opción B, que es lo que propones, es válida: un módulo TS que encapsula el PHP real y lo registra en `ACTIVE_PILOTS` compile-time. El contrato `{ id, buildPhpCode }` no cambia. La fuente del PHP cambia —en lugar de un template string escrito por nosotros, `buildPhpCode()` lee el fixture desde disco.

**Helena:** Un momento. "Lee el fixture desde disco" activa el R-H2 que traigo a esta reunión. `file_get_contents` de rutas locales no está stubbed en el bridge. Si el piloto hace `file_get_contents(__DIR__ . '/includes/helper.php')` desde dentro del PHP-WASM, hoy no hay nada que lo pare. Y `open_basedir` —que ADR-018 §Constraints §2 declara obligatorio— no aparece en ningún `ini_set` del código actual. Eso es incumplimiento del ADR, y no co-signo la PoC con esa discrepancia abierta.

**Román:** Helena tiene razón, y esto lo necesito respondido antes de que Raúl toque el bridge. ¿Sabemos si `open_basedir` es configurable vía `ini_set` en php-wasm? Porque si el runtime WASM no respeta esa directiva, tenemos que documentar por qué no aplica y proponer una alternativa. No podemos dejar el ADR en incumplimiento aunque sea una PoC en rama.

**Raúl:** Lo he mirado. En php-wasm el filesystem es virtual —el @php-wasm/node runtime expone un VFS propio, no el filesystem del host directamente. El `open_basedir` de PHP actúa sobre el VFS, no sobre rutas reales del sistema. Lo que tenemos que comprobar es si el VFS está configurado para que el script PHP solo vea lo que explícitamente montamos. Si montamos solo el directorio del fixture, el plugin no puede salir de ahí aunque intente paths relativos.

**Helena:** Eso es exactamente la alternativa que acepto. Si el VFS solo expone el directorio del fixture —nada fuera de ese scope— el `open_basedir` del ADR queda cubierto de facto. Pero necesito que quede documentado: "En php-wasm el filesystem es virtual; el aislamiento se logra mediante el scope del VFS montado, no mediante `open_basedir` de PHP." Eso va en el ADR-017 como nota de implementación. Y necesito que Raúl lo verifique empíricamente en la PoC —que un `file_get_contents('../../../.env')` desde el PHP devuelva false o error, no el contenido del .env real.

**Ingrid:** Puedo añadir algo aquí. Si el VFS scope cubre el aislamiento, el contrato del `RealPhpPilot` debería incluir explícitamente qué rutas monta en el VFS. El `buildPhpCode()` actual solo retorna un string PHP. Para PHP real necesitamos un campo adicional: `vfsMounts?: { virtualPath: string; hostPath: string }[]`. Eso va en el contrato `BridgePilot` como campo opcional —los pilotos TS existentes no lo necesitan. Los pilotos PHP reales sí.

**Román:** Me gusta. Mantiene retrocompatibilidad —el contrato existente no se rompe— y es explícito sobre qué monta cada piloto. ¿Esto requiere amendment de ADR-017 o entra como nota de implementación?

**Helena:** Requiere amendment. ADR-017 §4 define el contrato `BridgePilot` con exactamente dos campos: `id` y `buildPhpCode`. Añadir `vfsMounts` cambia la interfaz. Es un amendment menor —enmienda tipo B— pero hay que firmarlo antes de mergear.

**Raúl:** Bien. Entonces el plan de la PoC en rama es: uno, amendment ADR-017 con `vfsMounts` + nota VFS; dos, `RealPhpPilot` para Footnotes —el más simple, 119 LOC— que monta solo el directorio del fixture; tres, test de integración que ejecuta `[footnote]1[/footnote]` en `renderShortcodes()` real con el singleton PHP-WASM y verifica el HTML de salida; cuatro, test negativo que verifica que `file_get_contents('../../../.env')` devuelve false desde dentro del PHP. ¿Eso es el circuito mínimo que el PO quiere ver?

**Román:** Sí, con un añadido. El triángulo de verificación de ADR-014: el test de integración ejecuta contra el singleton PHP-WASM real —no simulación JS—, el invariante Quickstart funciona en clean clone con `npm run poc:php`, y hay regresión que verifica que con `ACTIVE_PILOTS` de pilotos TS puros el comportamiento no cambia. Sin los tres, la rama no está lista para demo.

**Ingrid:** Sobre Display Posts y Shortcodes Ultimate —¿entran en la PoC o solo Footnotes?

**Román:** Solo Footnotes para la PoC inicial. Display Posts requiere que WP_Query stub esté alineado con `$np_candidate_posts` —ya funciona, pero hay que verificarlo con el PHP real del fixture, no el TS que tenemos. Shortcodes Ultimate tiene vendor/freemius que ejecuta HTTP outbound al registrar —el stub de `wp_remote_*` debería pararlo, pero quiero verlo confirmado antes de añadirlo a la rama. Hacemos Footnotes primero, validamos el patrón, y luego Display Posts en la misma rama si el circuito es limpio.

**Helena:** Acepto ese scope. Mis condiciones para co-sign de la PoC son tres: uno, verificación empírica del VFS scope —el test negativo de Raúl; dos, amendment ADR-017 firmado antes de mergear a main; tres, que el test de integración ejecute `renderShortcodes()` real, no un mock. Si esas tres condiciones están cubiertas, co-signo sin bloquear.

**Ingrid:** Para la rama, ¿qué hacemos con el plugin registry? ¿Los pilotos PHP reales se registran en DB o solo en `ACTIVE_PILOTS`?

**Raúl:** Solo en `ACTIVE_PILOTS` para la PoC. El install-service con soporte PHP es trabajo del sprint formal. En la rama demostramos el circuito de ejecución —bridge + PHP-WASM + shortcode→HTML— no el ciclo de distribución. Lo separo explícitamente para que Martín no asuma que "install PHP plugins" ya funciona cuando vea el demo.

**Román:** De acuerdo. Eso es lo que conviene comunicar al PO también. La PoC demuestra "un plugin PHP real ejecuta shortcodes en NodePress". No demuestra "puedo instalar plugins de wordpress.org". El segundo es un sprint completo con su ADR. El primero es la rama que Raúl empieza mañana.

**Helena:** Una última cosa. CF7. Raúl mencionó en su preparación que CF7 "demostraría el scope límite de Tier 2". No. CF7 en la PoC es una trampa: cuando falle —y va a fallar, mail stubbado, filesystem, cURL— el PO va a ver "broken plugin" y eso va a generar conversaciones que no queremos en este momento. Footnotes funcionando perfectamente es más convincente que CF7 parcialmente roto. Quede CF7 fuera del scope de la PoC.

**Román:** Completamente de acuerdo. CF7 requiere ADR propio si alguna vez queremos soporte real. Hoy queda documentado como "fuera de scope Tier 2 actual, requiere Fase B". Raúl, ¿arrancas mañana con Footnotes?

**Raúl:** Sí. Amendment ADR-017 primero —lo escribo hoy, Román lo firma mañana AM, Helena co-signa. Luego el pilot y los tests. Dos días máximo.

---

## Puntos Importantes

1. **"Circuito completo" definido** (Román): DB post → REST → bridge → PHP-WASM → HTML → ThemeEngine + BridgeSpan. Sin ambos extremos no es circuito.
2. **`RealPhpPilot` compile-time, no dinámico** (Román): mantiene ADR-017 §Pilot Registry. `buildPhpCode()` lee el fixture del spike, `ACTIVE_PILOTS` compile-time.
3. **VFS scope es el aislamiento real en php-wasm** (Raúl): `open_basedir` de PHP no aplica directamente; el aislamiento viene del scope del VFS montado. Requiere verificación empírica.
4. **`vfsMounts` añadido al contrato `BridgePilot`** (Ingrid): campo opcional, retrocompatible. Declara explícitamente qué rutas expone cada piloto PHP real al VFS.
5. **Amendment ADR-017 obligatorio antes de merge** (Helena): añade nota VFS + campo `vfsMounts`. Co-sign Helena bloqueante.
6. **Scope PoC = Footnotes solamente** (Román + Helena): Display Posts entra si Footnotes valida el patrón. CF7 fuera.
7. **Triángulo de verificación ADR-014** (Román): test PHP-WASM real + Quickstart clean clone + regresión pilotos TS existentes.
8. **Plugin registry NO entra en la PoC** (Raúl + Ingrid): install-service PHP es sprint formal. La PoC demuestra ejecución, no distribución.
9. **CF7 excluido explícitamente** (Helena): Footnotes perfecto > CF7 parcialmente roto para el demo del PO.

## Conclusiones

- **Scope PoC en rama `poc/php-real-plugins`:** `RealPhpPilot` para Footnotes fixture + amendment ADR-017 + 3 tests (integración real, negativo VFS, regresión pilotos TS) + Quickstart invariante.
- **Secuencia:** Amendment ADR-017 hoy → Román + Helena firman mañana AM → implementación → Display Posts condicional.
- **Gate de merge a main:** Amendment firmado + test PHP-WASM real + test negativo VFS + Helena co-sign.
- **CF7 y install-service PHP:** sprint formal con ADR propio.
- **Comunicación al PO:** "La PoC demuestra un plugin PHP real ejecutando shortcodes. Install desde wordpress.org es el sprint siguiente."

## Acciones

| # | Acción | Responsable | Plazo |
|---|--------|-------------|-------|
| 1 | Escribir amendment ADR-017: `vfsMounts` + nota VFS scope | Raúl | 2026-04-19 |
| 2 | Firmar amendment ADR-017 | Román | 2026-04-20 AM |
| 3 | Co-sign amendment ADR-017 | Helena | 2026-04-20 AM |
| 4 | Crear rama `poc/php-real-plugins` desde main | Raúl | 2026-04-20 |
| 5 | Implementar `RealPhpPilot` para Footnotes fixture (compile-time, VFS scope) | Raúl | 2026-04-20 |
| 6 | Test integración real: `[footnote]` → PHP-WASM real → HTML verificado | Raúl | 2026-04-20 |
| 7 | Test negativo VFS: `file_get_contents('../../../.env')` → false desde PHP | Raúl | 2026-04-20 |
| 8 | Test regresión: pilotos TS existentes sin cambio | Raúl | 2026-04-20 |
| 9 | Quickstart invariante: `npm run poc:php` en clean clone | Raúl | 2026-04-21 |
| 10 | Display Posts si Footnotes valida (condicional) | Raúl | 2026-04-21 |
| 11 | Comunicar scope al PO antes del demo | Román | Antes de demo |

---

_Generado por /meet — Trinity_
