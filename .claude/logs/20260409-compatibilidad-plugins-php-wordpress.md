# Reunión: Compatibilidad con plugins PHP de WordPress

**Fecha:** 2026-04-09
**Participantes:** Alejandro (CEO), Román (Tech Lead), Ingrid (Lead Backend), Helena (IT Manager), Eduardo (Consultor)
**Duración estimada:** 60 minutos

---

## Preparación Individual

### Alejandro (CEO)
- Sin PHP, NodePress no compite en el ecosistema WP real (60.000 plugins)
- ADR-001 tiene contradicción: promete compatibilidad WP pero prohíbe PHP
- WordPress Playground demuestra viabilidad de php-wasm
- Necesita revisión del ADR antes de seguir construyendo

### Román (Tech Lead)
- Evaluó 6 opciones técnicas: proceso hijo php-fpm, php-wasm, transpilación, adapter layer, dual runtime, FrankenPHP
- Descarta transpilación y dual runtime completo
- Propone estrategia en dos fases: adapter layer + php-wasm para lógica de contenido
- Spike de 2 días en sprint 1 para datos reales

### Ingrid (Lead Backend)
- Filtros síncronos con PHP: 5-50ms overhead por crossing IPC
- $wpdb es el problema gordo: SQL crudo contra MySQL, schema diferente
- El 80% del problema está en $wpdb y hook registry bridge
- WooCommerce como caso de prueba de realidad

### Helena (IT Manager)
- php-wasm más seguro que php-fpm: sandbox WASM, sin segundo proceso
- Docker: +70MB con WASM vs +400MB con php-fpm
- Extensiones PHP (curl, gd, imagick) no disponibles en WASM
- CVE dual-stack es riesgo operacional real
- Exige ADR formal para cualquier cambio

### Eduardo (Consultor)
- Ningún proyecto fuera de WP logró compatibilidad PHP (Ghost, Strapi, Directus)
- Mercado no premia PHP compat, premia DX moderna
- Framework A/B/C: nativo → top 20 reimplementados → PHP bridge enterprise
- ICP correcto: agencias y devs que superaron WP, no migradores 1:1

---

## Conversación

**Alejandro:** Equipo, voy a ser directo. Ayer cerramos una reunión donde acordamos sprint 0 y sprint 1. Pero he estado pensando toda la noche y tengo un problema con el punto de partida. El ADR-001 dice "no PHP bridge, plugins nativos JS/TS". Pero eso significa que los 60.000 plugins de WordPress no funcionan en NodePress. Y si eso es así, no estamos construyendo un CMS compatible con el ecosistema WordPress — estamos construyendo un CMS nuevo con una API parecida. Son cosas muy distintas. Y como CEO os digo: sin algún nivel de compatibilidad PHP real, no tenemos tracción de mercado.

**Román:** Entiendo la preocupación, Alejandro. Yo escribí ese ADR y lo defendí. Pero antes de que nadie entre en pánico, dejadme poner las opciones sobre la mesa. He evaluado seis approaches técnicos. La realidad es que ninguno es gratis, pero algunos son viables. Los descarto rápido: transpilación PHP→JS no existe como tecnología madura, descartada. FrankenPHP no es un runtime embebible en Node, descartada como solución autónoma. Las opciones reales son tres: proceso hijo PHP-FPM, php-wasm, o adapter layer con tooling de portado.

**Ingrid:** Antes de entrar en opciones, quiero poner un dato técnico concreto sobre la mesa. Nuestro hook system tiene filtros síncronos — `apply_filters` bloquea hasta que todos los callbacks devuelven. Si un plugin PHP está registrado en `the_content`, cada invocación de ese filtro cruza el bridge Node→PHP y de vuelta. Estamos hablando de 5 a 50 milisegundos por crossing, dependiendo del payload. Si un request tiene 3 plugins PHP filtrando contenido en cadena, son 15 a 150ms de overhead solo en IPC. Antes de que el plugin haga nada útil. Eso anula la ventaja de rendimiento de Node sobre PHP-FPM.

**Alejandro:** Entendido. Pero dame las opciones reales, no solo los problemas.

**Román:** Vale. Mi recomendación es una estrategia en dos fases. Fase 1, que es el PoC y la beta: mantenemos JS/TS nativo como runtime core, pero construimos un CLI potente — `nodepress port-plugin` — que analiza un plugin PHP y genera un scaffold JS con los hooks identificados, las opciones que usa, los CPTs que define. El developer hace el portado, pero el CLI hace el 60% del trabajo mecánico. Fase 2, para la 1.0: integramos `@php-wasm/node` como runtime opcional para plugins que solo necesiten lógica de contenido pura — shortcodes, filtros de texto, widgets simples. Sin acceso a DB, sin filesystem. Eso cubre el 40% de los plugins por número pero probablemente el 80% de los plugins que usan los blogs.

**Alejandro:** ¿Y WooCommerce? Porque si un cliente me pregunta "¿puedo usar WooCommerce?" y la respuesta es no, hemos perdido a la mitad del mercado de WP.

**Eduardo:** Alejandro, déjame darte contexto de mercado antes de que respondamos eso. He mirado qué han hecho otros que intentaron esto. ClassicPress, Ghost, Strapi, Directus — ninguno ejecuta plugins PHP de WP. Ni uno. Ghost tiene 3 millones de sitios activos y no tiene compatibilidad WP. Strapi fue valorada en 400 millones de dólares sin un solo plugin PHP. El mercado no premia la compatibilidad PHP — premia la DX moderna y el nicho correcto.

**Alejandro:** Ghost y Strapi no compiten con WordPress directamente. Nosotros sí. Ese es el punto.

**Eduardo:** Precisamente por eso necesitas tener cuidado con el posicionamiento. Si dices "somos WordPress pero en Node.js", la primera pregunta es "¿funcionan mis plugins?". Y si la respuesta es "más o menos, depende", pierdes credibilidad. Si en cambio dices "somos el CMS moderno para equipos que ya superaron WordPress", el plugin PHP ni se pregunta. Los usuarios no migran por los plugins — migran por rendimiento, DX y seguridad. Los plugins son un factor de retención en WP, no de atracción hacia alternativas.

**Helena:** Y desde infraestructura, necesito que el equipo entienda lo que implica ejecutar PHP en producción. Si vamos con php-fpm como sidecar, la imagen Docker pasa de 180MB a 500-600MB. Necesitamos un pipeline de CVEs separado para PHP, porque PHP tiene vulnerabilidades críticas varias veces al año. Pero además — y esto es lo que más me preocupa — ejecutar código PHP de terceros es categorialmente diferente a ejecutar plugins JS en vm.Context. Un plugin PHP puede hacer `eval()`, `system()`, `file_get_contents()`. Nuestro sandbox vm.Context controla qué globals existen. En PHP no tenemos ese control sin un `disable_functions` muy agresivo que romperá plugins legítimos.

**Ingrid:** Helena tiene razón. Y hay otro problema gordo que nadie ha mencionado: `$wpdb`. Los plugins WP populares usan `$wpdb->get_results()` con SQL crudo contra MySQL. Nuestro schema es PostgreSQL, no MySQL. Un plugin que hace `SELECT * FROM wp_posts WHERE post_status = 'publish'` asume nombres de tabla WP, sintaxis MySQL, y el schema EAV de postmeta. Nosotros tenemos `posts` con JSONB. Para que eso funcione necesitas o un MySQL de compatibilidad con doble escritura, o un rewriter de queries MySQL→PostgreSQL. Ambas opciones son meses de ingeniería con cobertura parcial.

**Alejandro:** A ver, os estoy escuchando. No soy técnico pero entiendo los trade-offs. Mi pregunta es: ¿hay un middle ground que no sea "todo o nada"?

**Eduardo:** Sí, y es el que yo recomiendo. He preparado un framework de tres estrategias. Estrategia A: JS/TS nativo con API WP-compatible, 6-12 meses, riesgo bajo, target dev agencies y proyectos nuevos. Estrategia B: reimplementar los top 20 plugins en JS nativo — WooCommerce, Yoast, ACF, CF7, etc. — como "NodePress editions", 12-18 meses, riesgo medio, target migradores de WP. Estrategia C: PHP bridge opt-in como feature enterprise, 18-24 meses, riesgo alto, solo si un cliente enterprise lo paga. Mi recomendación: ejecutar A primero, validar tracción, y luego evaluar B como diferenciador competitivo.

**Román:** Me gusta el framework de Eduardo, pero añado un matiz técnico a la estrategia B. Reimplementar WooCommerce en JS es un proyecto de 500.000 líneas de PHP. No lo hacemos nosotros — pero sí podemos crear el framework para que la comunidad lo haga. Si nuestro plugin-api es lo suficientemente bueno y nuestra documentación de portado es excelente, la comunidad puede portar los top 20 plugins. NodePress no los porta — facilita que otros lo hagan.

**Alejandro:** Pero eso es apostar a una comunidad que aún no existe.

**Román:** Toda comunidad open source empieza así. Pero hay una cosa concreta que sí podemos hacer para de-riskar: un spike de php-wasm. Propongo 2 días en sprint 1 donde cogemos un plugin WP simple — Contact Form 7 o un shortcode plugin — y lo ejecutamos dentro de NodePress via `@php-wasm/node`. Con datos reales de rendimiento y limitaciones, tomamos la decisión informada antes de sprint 2. No un año de desarrollo — 2 días de experimento.

**Ingrid:** ¿Quién hace ese spike? Porque yo tengo el content engine y las rutas REST en sprint 1.

**Román:** Raúl. Es bueno debuggeando y probando cosas raras. Le asigno el spike y yo superviso los resultados.

**Helena:** Un spike de php-wasm me parece bien — es bajo riesgo. Pero pongo una condición: si el resultado del spike es "funciona pero con limitaciones X, Y, Z", necesitamos documentar esas limitaciones como ADR-003 antes de hacer ningún compromiso público de compatibilidad PHP. No quiero que marketing diga "compatible con plugins WP" y luego infra gestione incidencias de plugins que no funcionan.

**Alejandro:** De acuerdo. Helena, eso es justo. Eduardo, tu framework de tres estrategias me convence como roadmap. Pero necesito que el spike de Román me dé datos reales. Si php-wasm puede correr shortcodes y filtros de contenido simples con rendimiento aceptable, eso ya es un diferenciador que puedo comunicar: "NodePress soporta plugins PHP simples y tiene herramientas para portar los complejos". No es "todos los plugins funcionan" pero es más que "reescribe todo".

**Eduardo:** Eso es exactamente el pitch correcto. "Migra tu WordPress a NodePress: tus shortcodes PHP funcionan, tus plugins principales tienen versión nativa, y tu equipo trabaja en TypeScript". Eso vende.

**Ingrid:** Quiero cerrar un punto técnico. Si php-wasm entra como Tier 2, ¿cómo se integra con el HookRegistry? Porque el plugin PHP necesita registrar hooks en nuestro registry JS.

**Román:** El bridge sería: php-wasm ejecuta el `activate()` del plugin PHP, que llama a `add_action`/`add_filter`. Esas llamadas las interceptamos con un shim PHP que serializa la info y la pasa al HookRegistry JS. Cuando se dispara el hook, NodePress llama de vuelta al módulo WASM con los argumentos serializados. Es doble crossing, sí. Pero para shortcodes y filtros de contenido que se ejecutan 1-3 veces por request, el overhead es aceptable — estamos hablando de microsegundos en WASM, no milisegundos en IPC. Es categorialmente diferente al proceso hijo.

**Ingrid:** Los microsegundos los acepto. Pero filtros síncronos con WASM siguen bloqueando el event loop. Si el plugin PHP en WASM tarda 50ms en procesar contenido, esas son 50ms de bloqueo.

**Román:** Correcto. Por eso el scope de php-wasm es "lógica de contenido pura" — shortcodes, filtros de texto. No plugins que hagan I/O, queries, o networking. Si un plugin PHP necesita DB, tiene que portarse a JS nativo. Esa es la línea clara.

**Alejandro:** Me parece un compromiso razonable. Entonces, ¿cómo queda esto respecto al ADR-001?

**Román:** ADR-001 no está equivocado — está incompleto. Propongo un ADR-003: "PHP Compatibility Strategy" con dos tiers explícitos. Tier 1: plugins JS/TS nativos, first-class, pleno soporte. Tier 2: plugins PHP via php-wasm, soporte limitado, solo lógica de contenido, sin DB. Y explicitamos que no hay Tier 3 — no hay PHP nativo con acceso a base de datos — en la hoja de ruta actual.

**Helena:** Eso lo puedo defender desde infra. Tier 2 con php-wasm no añade un segundo proceso, no requiere PHP instalado en el servidor, y el sandbox de WASM es más seguro que php-fpm. Pero pido una cosa: la documentación de Tier 2 tiene que listar exactamente qué extensiones PHP están disponibles y cuáles no. Sin sorpresas.

**Alejandro:** Aceptado. Entonces el plan es: A corto plazo, seguimos con JS/TS nativo como decidimos ayer — nada cambia en sprint 0 ni en el grueso de sprint 1. Raúl hace un spike de php-wasm de 2 días en sprint 1. Con los resultados del spike, Román escribe ADR-003 definiendo los tiers de compatibilidad. Y el CLI de portado `nodepress port-plugin` entra en el roadmap como herramienta de migración. A medio plazo, evaluamos la estrategia B de Eduardo: facilitar que la comunidad porte los top 20 plugins.

**Eduardo:** Una última recomendación. Antes de comunicar nada público sobre compatibilidad PHP, necesitamos que el spike demuestre al menos un caso concreto — un shortcode plugin real de WordPress funcionando en NodePress via php-wasm. Ese demo vale más que cualquier promesa de marketing.

**Alejandro:** Perfecto. Así queda.

---

## Puntos Importantes

1. **La compatibilidad PHP total es inviable** — ningún proyecto fuera de WP lo ha logrado. Consenso total. (Eduardo, Román, Helena)
2. **Estrategia de tiers:** Tier 1 JS/TS nativo (core), Tier 2 php-wasm lógica de contenido (shortcodes, filtros), sin Tier 3 (PHP con DB). (Román)
3. **Spike de php-wasm en sprint 1** — 2 días, Raúl ejecuta, Román supervisa. (Román)
4. **ADR-003 necesario** — "PHP Compatibility Strategy" post-spike. (Román)
5. **$wpdb es el bloqueante principal** — plugins con SQL directo contra MySQL no tienen solución viable con PostgreSQL. (Ingrid)
6. **Framework go-to-market adoptado:** Fase A (JS nativo) → Fase B (top 20 por comunidad) → Fase C (PHP bridge enterprise). (Eduardo)
7. **CLI `nodepress port-plugin` en roadmap.** (Román)
8. **php-wasm más seguro que php-fpm** — sandbox WASM, sin segundo proceso, +70MB vs +400MB. (Helena)
9. **Sprint 0/1 no cambian** — spike es adicional. (Alejandro)
10. **No comunicar PHP compat públicamente sin demo real.** (Eduardo, Helena)

## Conclusiones

- ADR-001 se mantiene para el runtime core
- Se añadirá ADR-003 tras spike para definir tiers de compatibilidad PHP
- Posicionamiento: "CMS moderno con API WP, herramientas de migración, soporte parcial para plugins PHP simples via WASM"
- Sprint 0 y sprint 1 sin cambios salvo spike de 2 días
- Desacuerdo resuelto: Alejandro aceptó el framework de fases como compromiso viable

## Acciones

| # | Acción | Responsable | Plazo |
|---|--------|-------------|-------|
| 1 | Spike php-wasm: shortcode plugin WP real en NodePress | Raúl (supervisado por Román) | Sprint 1 (2 días) |
| 2 | ADR-003: PHP Compatibility Strategy (Tier 1/2) | Román | Fin de Sprint 1 |
| 3 | Añadir `nodepress port-plugin` CLI al roadmap | Román + Ingrid | Sprint 2 |
| 4 | Matriz de extensiones PHP en php-wasm | Helena | Sprint 1 |
| 5 | Definir ICP y messaging sin PHP completo | Alejandro + Eduardo | Pre-comunicación pública |
| 6 | Documentar limitaciones Tier 2 | Román | Con ADR-003 |

---

_Generado por /meet — Trinity_
