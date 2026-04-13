# Reunión: nodepress-wp-plugin-server como bridge PHP

**Fecha:** 2026-04-09
**Participantes:** Alejandro (CEO), Román (Tech Lead), Ingrid (Lead Backend), Helena (IT Manager), Eduardo (Consultor)
**Duración estimada:** 50 minutos

---

## Preparación Individual

### Alejandro (CEO)

- Propone plugin-server como materialización de Fase C
- Resuelve $wpdb con MySQL real y schema WP
- Go-to-market enterprise: compatibilidad PHP como producto de pago
- Acepta que no debe alterar Sprint 0/1

### Román (Tech Lead)

- 6 opciones de base PHP evaluadas: recomienda PHP custom con shims, no WP core
- Bloqueador: apply_filters síncrono + HTTP. Solo acciones PHP en v1
- Sync PG→MySQL: event-driven simple, unidireccional
- Estimación: 7-8 semanas senior. No cabe antes de Sprint 3

### Ingrid (Lead Backend)

- Schema mapping PG→MySQL es semanas de trabajo (EAV, serialización PHP)
- Bidireccional es un proyecto aparte — recomienda read-only para PHP v1
- PHP custom mínimo, no WP core stripped

### Helena (IT Manager)

- 5 servicios requieren K8s en producción, no solo Docker Compose
- DR con dos DBs necesita snapshots coordinados
- Superficie de ataque de WP reimportada — 4 condiciones no negociables
- Coste infra: +70-120€/mes base

### Eduardo (Consultor)

- "Esto ya existe y se llama WordPress headless"
- Cuestiona identidad del producto: ¿CMS nativo o orquestador sobre WP?
- El cliente con WooCommerce no es el ICP de NodePress
- Recomienda no construir hasta que un cliente real lo pida

---

## Conversación

**Alejandro:** Equipo, sé que hace unas horas cerramos el tema de PHP con el framework de tiers y el spike de php-wasm. Pero quiero poner una propuesta concreta encima de la mesa que creo que materializa la Fase C que acordamos. La idea: un microservicio separado, `nodepress-wp-plugin-server`. PHP-FPM real, MySQL propio con el schema WP — `wp_posts`, `wp_postmeta` EAV, `wp_options`, todo el paquete. NodePress sincroniza datos desde PostgreSQL hacia ese MySQL. Los plugins PHP corren ahí, con `$wpdb` real, con extensiones PHP reales. Y es opt-in — solo lo despliega quien lo necesite. Esto resuelve la objeción principal de la reunión anterior: `$wpdb` necesita MySQL real.

**Eduardo:** Alejandro, para antes de ir más lejos. Necesito hacerte una pregunta incómoda. Lo que describes — un servidor PHP con MySQL, ejecutando plugins WP, sin frontend — ya existe. Se llama WordPress headless. WPEngine, agencias premium, decenas de equipos llevan años usando WP como backend de plugins con Next.js delante. ¿Qué gana un cliente usando tu plugin-server en lugar del WordPress que ya tiene?

**Alejandro:** La diferencia es que NodePress es el core. El plugin-server es un add-on para compatibilidad legacy. WordPress headless sigue siendo WordPress — con su admin PHP, sus 50MB de core, sus 20 años de deuda técnica. El plugin-server es un runtime mínimo que solo ejecuta hooks de plugins. No es WordPress.

**Eduardo:** Pero funcionalmente es casi lo mismo. Tienes PHP-FPM, MySQL con schema WP, plugins PHP corriendo. ¿Cómo lo comunicas al mercado sin que suene a "usamos WordPress por debajo"? El pitch que acordamos esta mañana es claro: "CMS moderno, tu equipo trabaja en TypeScript". Si ahora añades "y si necesitas plugins PHP, corre un servicio PHP con MySQL en paralelo", el cliente que quería salir de PHP nunca sale del PHP.

**Román:** Eduardo tiene un punto válido sobre el posicionamiento. Pero dejadme evaluar la propuesta técnicamente antes de descartarla por branding. He analizado la arquitectura y hay cosas que funcionan y cosas que no.

Lo que funciona: un microservicio PHP separado con MySQL propio es la forma más honesta de dar compatibilidad `$wpdb`. No hay truco, no hay traducción de queries. El plugin PHP ve exactamente lo que espera ver. Para la base del servicio, recomiendo un PHP custom mínimo — no WordPress core — que implemente los shims: `add_action`, `add_filter`, `$wpdb`, `get_option`, `get_post_meta`. Son unas 300 líneas de PHP para el hook system más los wrappers de DB. Es controlable.

Lo que no funciona: hay un bloqueador técnico serio. Nuestro `apply_filters` es síncrono. Los filtros PHP del plugin-server necesitarían una llamada HTTP. Una HTTP call síncrona bloqueante no existe en Node.js. Para la primera versión, propongo que el plugin-server soporte solo **acciones** PHP — `do_action`, que ya es async — y que los filtros PHP deban portarse a JS. Es una limitación real pero cubre el 70% de los casos de uso.

**Ingrid:** Román, de acuerdo con la limitación de filtros. Pero el problema que más me preocupa es la sincronización de datos. Nuestro schema tiene `meta JSONB` en posts. El schema WP tiene `wp_postmeta` como EAV con filas separadas. Sincronizar eso es aplanar un JSONB en 20 inserts por cada write. Y no solo eso — WP serializa arrays PHP: un array en nuestro JSONB se convierte en `a:2:{i:0;s:3:"foo";i:1;s:3:"bar";}` en MySQL. Tenemos que reimplementar el serializador de PHP en Node.

**Román:** Lo sé. El schema mapper es el componente más subestimado de esta propuesta. Mi estimación: 2 semanas solo para el mapping PG→MySQL, sin contar el bidireccional.

**Ingrid:** Y sobre bidireccional — aquí es donde yo paro en seco. Si un plugin PHP escribe en MySQL vía `$wpdb`, NodePress no se entera. Tienes dos sources of truth divergiendo en tiempo real. Para reconciliar necesitas CDC desde el binlog de MySQL, lo cual es un proyecto de infra serio. O prohíbes writes desde PHP, pero eso rompe WooCommerce y cualquier plugin que mutate datos.

**Alejandro:** ¿Y si empezamos con sincronización unidireccional — PG es source of truth, MySQL es una vista materializada read-only para el plugin-server?

**Ingrid:** Eso simplifica mucho. Los plugins pueden leer todo pero no escribir. Pero cuidado: eso excluye plugins que crean datos propios — WooCommerce crea pedidos, ACF crea campos custom. Si es read-only, el catálogo de plugins compatibles baja significativamente.

**Helena:** Antes de que sigamos diseñando esto, necesito poner los números de infra sobre la mesa. El stack actual son 3 servicios: Node, PG, Redis. Esta propuesta lo sube a 5: añade PHP-FPM y MySQL. En desarrollo con Docker Compose es manejable. En producción con HA, necesitas orquestación real — Kubernetes justificado. Y hay un problema de DR que nadie ha mencionado: con dos bases de datos sincronizadas, los backups tienen que ser temporalmente consistentes entre ambas. Un `pg_dump` a T+0 y un `mysqldump` a T+30 segundos no son restaurables de forma coherente. Necesitas snapshots coordinados.

**Alejandro:** ¿Cuánto sube el coste de infra?

**Helena:** Estimación conservadora: +70-120 euros al mes para un entorno de producción básico. Más si quieres MySQL managed con backups automáticos. Y hay algo más serio: la superficie de ataque. PHP-FPM ejecutando plugins de terceros es exactamente la superficie de ataque de WordPress que queremos dejar atrás. Sin `open_basedir`, `disable_functions`, contenedor con filesystem read-only, y pipeline CVE para PHP, no doy soporte de infra a esto. Son cuatro condiciones mínimas.

**Eduardo:** Helena toca el punto que yo quería hacer. Estamos diseñando un sistema donde Node.js es el frontend moderno y PHP+MySQL es el backend legacy para plugins. Eso es, funcionalmente, WordPress headless con extra steps. Y la pregunta de identidad que Alejandro tiene que responder es: ¿NodePress es un CMS nativo Node.js, o es un orquestador sobre WordPress?

**Alejandro:** Es un CMS nativo Node.js con una opción de compatibilidad legacy.

**Eduardo:** Pero las opciones de compatibilidad legacy definen la percepción del producto. Si el 40% de tus usuarios enterprise necesitan el plugin-server, el mercado te va a ver como "Node.js frontend + WordPress backend". Y en ese espacio, compites con WPEngine, Vercel + WP headless, y Kinsta. Gente que lleva 15 años ahí.

**Alejandro:** Eduardo, entiendo tu punto. Pero dame una alternativa real para el cliente que tiene WooCommerce y no puede reescribirlo en JS.

**Eduardo:** La alternativa es honesta: no es tu cliente. Tu cliente es el que construye nuevo, o el que está dispuesto a portar. El que tiene WooCommerce y no quiere tocarlo no va a dejar WordPress — y no debería. Tu energía tiene que ir a los que sí quieren salir. Son menos en número pero más en valor por cliente.

**Román:** Estoy de acuerdo con Eduardo en el timing. Pero no descarto la propuesta para el futuro. Técnicamente, el plugin-server es viable con limitaciones claras: solo acciones PHP (no filtros), sincronización unidireccional PG→MySQL, PHP custom mínimo con shims. Estimación total: 7-8 semanas de trabajo de un senior. No cabe en Sprint 1 ni Sprint 2 sin sacrificar el core.

Mi propuesta concreta: metemos el plugin-server en el roadmap como **Fase C post-beta**, con dos pre-requisitos. Primero: el spike de php-wasm de Sprint 1 nos dice cuántos plugins se cubren con Tier 2. Si Tier 2 cubre el 80% de los plugins de contenido, la urgencia del plugin-server baja. Segundo: necesitamos al menos un cliente enterprise que pida esto con un caso de uso concreto — plugin específico, presupuesto, timeline. Sin eso, es especulación.

**Ingrid:** Una cosa más técnica. Si hacemos esto eventualmente, propongo que NO usemos WordPress core como base. WP core tiene 50MB de PHP, globals por todas partes, require loops imposibles de desacoplar. Mejor un PHP custom mínimo: hook system WP reimplementado en 300 líneas, `$wpdb` wrapper real contra MySQL, y un subset de funciones WP comunes como `get_option`, `get_post_meta`. Es más controlable y más mantenible.

**Román:** Totalmente de acuerdo. Si algún día llega, es Slim PHP o vanilla con shims, no WordPress stripped.

**Helena:** Si queda como Fase C post-beta, lo acepto como item de roadmap. Pero quiero que conste: antes de que esto entre en desarrollo, necesito cuatro cosas documentadas — ADR nuevo, threat model, estrategia de DR coordinada, y pipeline CVE para PHP. No negociable.

**Alejandro:** Entendido. Voy a ser honesto con el equipo: Eduardo me ha hecho pensar. Puede que esté intentando resolver el problema del cliente que no es mi cliente. El framework A/B/C que acordamos esta mañana tiene sentido: primero construimos la base JS, ganamos tracción con el ICP correcto — agencias y equipos que quieren salir de PHP — y solo si un cliente enterprise concreto lo pide, construimos el bridge. Lo que sí quiero es que el plugin-server quede documentado como propuesta técnica. Que no se pierda. Si llega el momento, la arquitectura ya está pensada.

**Román:** Entonces lo que hago es añadir una sección al ADR-003 — que ya voy a escribir tras el spike de php-wasm — con el diseño del plugin-server como "Tier 3: Future — PHP Plugin Server". Documentado pero no aprobado. Con las condiciones de Helena como requisitos previos.

**Eduardo:** Y el go-to-market no cambia. Fase A primero. Si en 6 meses hay tracción enterprise con demanda de PHP, tenemos la arquitectura lista. Si no la hay, no gastamos ni un sprint en algo que nadie pidió.

**Alejandro:** Aceptado. Así queda.

---

## Puntos Importantes

1. El plugin-server es técnicamente viable pero prematuramente costoso (7-8 semanas, 5 servicios). (Román, Ingrid)
2. "Esto ya existe y se llama WordPress headless" — cuestión de identidad de producto. (Eduardo)
3. apply_filters síncrono + HTTP es bloqueador — solo acciones PHP en v1. (Román)
4. Sync PG→MySQL unidireccional viable, bidireccional es proyecto aparte. (Ingrid)
5. 5 servicios en prod requieren K8s. DR con dos DBs es complejidad real. (Helena)
6. El cliente con WooCommerce no es el ICP de NodePress hoy. (Eduardo)
7. Base PHP custom, NO WP core. (Ingrid, Román)
8. 4 condiciones de Helena: ADR, threat model, DR, CVE pipeline. (Helena)
9. Plugin-server documentado como Tier 3 Future en ADR-003. (Román)
10. Go-to-market sin cambios. Fase A es la prioridad. (Eduardo, Alejandro)

## Conclusiones

- Plugin-server NO entra en roadmap activo. Documentado como Tier 3 Future en ADR-003.
- Plan de sprints sin cambios. Spike php-wasm en Sprint 1.
- Framework A/B/C reafirmado. NodePress es CMS nativo Node.js.
- ICP definido: agencias y equipos que quieren salir de PHP.
- Si en 6 meses hay demanda enterprise real, la arquitectura está pensada.

## Acciones

| #   | Acción                                                  | Responsable         | Plazo                      |
| --- | ------------------------------------------------------- | ------------------- | -------------------------- |
| 1   | Incluir Tier 3 (plugin-server) como "Future" en ADR-003 | Román               | Con ADR-003 (fin Sprint 1) |
| 2   | Documentar condiciones pre-requisito Tier 3             | Helena              | Con ADR-003                |
| 3   | Definir ICP formal para go-to-market                    | Alejandro + Eduardo | Sprint 0                   |
| 4   | Spike php-wasm sin cambios                              | Raúl (sup. Román)   | Sprint 1                   |

---

_Generado por /meet — Trinity_
