# Reunión: Cómo llevar NodePress al siguiente paso

**Fecha:** 2026-04-09
**Participantes:** Alejandro (CEO), Román (Tech Lead), Ingrid (Lead Backend), Lucas (Lead Frontend), Tomás (Scrum Master)
**Duración estimada:** 45 minutos

---

## Preparación Individual

### Alejandro (CEO)
- El PoC está sobrepensado, hora de ejecutar
- MVP debe ser demostrable: hook system + CRUD posts + REST API WP-compatible + admin básico
- Secuenciar por capas, no por features
- WP compat test suite desde día 1
- Definir usuario objetivo del MVP
- Riesgos: scope creep WP, theme engine puede hundir timeline, GPL-3.0 es decisión de negocio

### Román (Tech Lead)
- Orden: db → core → server → plugin-api → theme-engine → cli
- Hook system es el corazón: cobertura 100% antes de content engine
- Scope guard explícito: solo 5 endpoints CRUD posts en sprint 1
- docker-compose como blocker inmediato
- Riesgos: filtros sync vs async, Drizzle joven, vm.Context overhead

### Ingrid (Lead Backend)
- Schema DB primero, sin negociación
- Core no puede importar de DB
- JSONB necesita tipos TypeScript estrictos desde día 1
- REST API contracts ya definidos por WP
- Riesgos: sin test suite de referencia WP, scope creep en hook system

### Lucas (Lead Frontend)
- Puede arrancar ya con mocks (MSW)
- CSS custom properties desde tokens, no Tailwind
- Radix UI como primitivos, Zustand + React Query
- Riesgos: WP API quirks, plugins que extienden admin UI, sin admin/package.json

### Tomás (Scrum Master)
- Sprint 0 de 1 semana no negociable
- Sprints de 2 semanas desde Sprint 1
- OpenAPI spec (o spec WP) como contrato frontend/backend
- DoD estricto desde día 1
- Riesgos: dependencia en cadena, scope WP sin límites, velocity desconocida

---

## Conversación

**Tomás:** Bueno, equipo, vamos al grano. Tenemos documentación sólida — dos ADRs aceptados, design brief completo, tokens y wireframes — pero cero código. La pregunta es: ¿cómo pasamos de diseño a ejecución sin dispersarnos?

**Alejandro:** Exacto, Tomás. Mi principal preocupación es que seguimos en modo diseño. El PoC ya está sobrepensado — y lo digo como elogio a Román y Sofía, el trabajo previo es excelente. Pero ahora toca ejecutar. Y antes de hablar de sprints, necesito que alineemos algo: ¿quién es el usuario objetivo del MVP? ¿Devs WP que quieren escapar de PHP? ¿Agencias headless? Porque eso cambia qué priorizamos.

**Román:** Desde lo técnico, creo que el MVP más honesto es demostrar que el hook system funciona y que un plugin WP portado a JS puede registrar hooks contra NodePress. Eso es lo diferencial. Si además tenemos CRUD de posts con REST API compatible, tenemos un demo potente. Pero no intentemos replicar toda la API de WordPress en sprint 1.

**Ingrid:** Estoy de acuerdo con Román. El orden para mí es claro: schema DB primero con Drizzle, hook system después, content engine encima. Pero tengo una pregunta clave que afecta todo: ¿queremos validar que un blog funcional con posts y páginas se puede montar, o que el plugin system funciona con hooks reales? Son dos estrategias de validación distintas.

**Alejandro:** Las dos, pero secuencialmente. Sprint 1: el blog funciona — CRUD de posts con REST API WP-compatible. Sprint 2 o 3: un plugin de ejemplo registra hooks. El blog funcional es lo que podemos enseñar a cualquier persona. El plugin system es lo que convence a los developers.

**Román:** Me parece razonable. Pero entonces el hook system tiene que estar en sprint 1 igualmente, porque el content engine pasa por hooks — `save_post`, `the_content`... Si no están, el content engine es un CRUD básico sin el value proposition de NodePress.

**Lucas:** Mientras tanto, yo puedo arrancar ya. Tenemos tokens, wireframes, los tres estados del dashboard diseñados. Mi propuesta: CSS custom properties directo desde los tokens de Sofía, Radix UI como primitivos accesibles sin estilos, y MSW para mockear la API. Cuando Ingrid suba los endpoints reales, borramos los mocks y el código de UI no cambia ni una línea.

**Tomás:** Me gusta que el frontend no dependa del backend. Pero para que eso funcione de verdad, necesito que Román e Ingrid dejen definido un OpenAPI spec mínimo antes de que Lucas arranque los mocks. Si no, Lucas mockea un shape y luego la API real es diferente.

**Ingrid:** Tiene sentido. Pero no hace falta un OpenAPI formal — la spec ya existe: es la documentación oficial del WP REST API v2 para posts. Los shapes de respuesta están definidos por WordPress. Lucas puede mockear contra eso directamente.

**Lucas:** Perfecto, eso me vale. El WP REST API Handbook tiene los schemas JSON de cada endpoint. Mis mocks serán contra eso.

**Tomás:** Bien, entonces propongo estructura de sprints. Sprint 0: una semana. Scaffolding del monorepo — docker-compose con PG y Redis, tsconfig base, CI con GitHub Actions básico, cada package inicializado con su package.json vacío pero buildable. Sin sprint 0, el sprint 1 arranca con todos peleándose con el tooling.

**Román:** De acuerdo. El docker-compose lo preparo yo. El tsconfig base y la config de Vitest workspace también. Helena puede ayudar con el CI pipeline si tiene ancho de banda.

**Alejandro:** Sprint 0 de una semana me parece bien, pero quiero que al final de esa semana haya algo que arranque. Aunque sea `npm run dev` y que salga un "Hello NodePress" en el puerto 3000. Eso establece el tono: ejecutamos, no solo configuramos.

**Ingrid:** Puedo tener el schema de Drizzle para posts y users listo en sprint 0 también, si Román tiene el docker-compose con PG levantado a mitad de semana. Así sprint 1 arranca con la base de datos real, no con mocks.

**Tomás:** Perfecto. Sprint 1 entonces serían 2 semanas. Propuesta: backend entrega hook system con tests exhaustivos + content engine básico (posts CRUD) + 5 endpoints REST para posts. Frontend entrega shell del admin — sidebar, header, layout global — y la página de dashboard con los 4 estados. ¿Demasiado?

**Román:** Para backend es ambicioso pero factible si Ingrid y yo nos repartimos bien. Yo me quedo con el hook system, que es el componente más crítico y quiero cobertura al 100%. Ingrid lleva el content engine y las rutas REST. Carmen puede ayudar con las rutas una vez el schema esté listo.

**Ingrid:** Me vale. Pero necesito una decisión: ¿roles y capabilities completos en sprint 1 o auth simplificado? Porque si intento implementar el sistema WP-compatible de roles con capabilities JSONB y todo el middleware, eso solo me lleva medio sprint.

**Román:** Auth simplificado. Bearer token válido = admin. El sistema completo de roles entra en sprint 2. No necesitamos roles para demostrar que el CRUD de posts y el hook system funcionan.

**Alejandro:** De acuerdo. Pero quiero que desde sprint 1 tengamos algo que valide la compatibilidad WP. Aunque sea un test de integración que haga `GET /wp-json/wp/v2/posts` y verifique que la respuesta tiene el shape correcto con `X-WP-Total` header y paginación. Si no medimos la compatibilidad desde el principio, nos engañamos.

**Ingrid:** Puedo montar ese test harness. Uso la spec del WP REST API Handbook como referencia y creo fixtures. Así cada endpoint nuevo que subamos se valida automáticamente.

**Lucas:** Por mi parte, para sprint 1 entrego: Vite + React 19 scaffolding, design system base (tokens como CSS custom properties, componentes primitivos), layout global (sidebar + header + content area), y el dashboard con los 4 estados — datos, loading skeleton, vacío y error. Todo con MSW mockeando la API.

**Tomás:** Eso me cuadra. Marta puede ayudarte con los componentes del design system mientras tú montas el layout y la lógica de routing.

**Lucas:** Sí, Marta es perfecta para eso. Pixel-perfect en componentes base y accesibilidad. Le paso los tokens y los wireframes y ella puede producir los componentes atómicos mientras yo monto la estructura.

**Alejandro:** Una cosa más antes de cerrar prioridades. La licencia. El package.json dice GPL-3.0. ¿Es una decisión consciente o la puso alguien por defecto? Porque GPL tiene implicaciones si algún día queremos un modelo SaaS hosted o plugins premium.

**Román:** La puse yo por coherencia con el ecosistema WordPress — WP es GPL. Pero tienes razón, es una decisión de negocio. Si queremos dual license (GPL para la comunidad, comercial para enterprise), hay que decidirlo antes de que haya contribuciones externas.

**Alejandro:** No lo decidimos hoy, pero lo pongo como acción mía. Antes de que el código sea público, tenemos que tener claro el modelo de licencia. Lo reviso con el contexto legal esta semana.

**Tomás:** Bien. ¿Definition of Done para sprint 1? Propongo: TypeScript strict sin errores, tests con Vitest para el camino feliz, linter y prettier en verde, PR revisada por al menos una persona, y si hay endpoint REST, test de integración contra la spec WP.

**Román:** Añado uno: si el componente tiene hook system, cobertura de tests en ordering de prioridades y manejo de errores en hooks. No solo camino feliz para hooks.

**Ingrid:** Y una cosa más sobre la arquitectura: `packages/core` no puede importar de `packages/db`. Core define la lógica de negocio, db implementa persistencia. La dependencia va en una dirección: server importa core + db. Si alguien rompe esto, es un blocker de PR.

**Román:** Totalmente. Eso va en la DoD: no se admiten dependencias circulares ni que core importe de db.

**Tomás:** Recojo todo. ¿Algo más que alguien necesite poner sobre la mesa?

**Lucas:** Sí, una preocupación a futuro. Si los plugins pueden registrar menús y settings pages en el admin — como en WP — necesito saber cómo el backend expone eso. Eso determina si el sidebar del admin es estático o dinámico. No es sprint 1, pero necesito que Román lo piense antes del sprint 3.

**Román:** Apuntado. Para sprint 1 el sidebar es estático. Cuando llegue plugin-api, diseñamos el protocolo de extensión del admin. Posiblemente un endpoint `/wp-json/nodepress/v1/admin-menu` que devuelva las extensiones registradas por plugins.

**Alejandro:** Perfecto. Resumo lo que me llevo: MVP claro — blog funcional con CRUD posts y hook system. Sprint 0 de una semana para scaffolding. Sprint 1 de dos semanas con backend y frontend en paralelo. Licencia pendiente de decisión mía. Y lo más importante: dejamos de documentar y empezamos a codear.

**Tomás:** Así es. Arrancamos sprint 0 mañana.

---

## Puntos Importantes

1. **El MVP es un blog funcional con hook system** — CRUD de posts con REST API WP-compatible + hooks funcionales. (Alejandro + Román)
2. **Sprint 0 de 1 semana para scaffolding** — docker-compose, tsconfig, CI, packages inicializados, schema DB base. (Tomás, consenso total)
3. **Frontend arranca en paralelo sin depender del backend** — MSW para mocks, spec WP REST API como contrato. (Lucas, validado por Ingrid)
4. **Auth simplificado en sprint 1** — Bearer token = admin. Roles WP-compatible en sprint 2+. (Román)
5. **Test harness de compatibilidad WP desde sprint 1** — fixtures contra spec oficial. (Alejandro pidió, Ingrid ejecuta)
6. **Core no importa de DB** — dirección de dependencias estricta. No negociable. (Ingrid + Román)
7. **Licencia GPL-3.0 requiere decisión de negocio** — antes de hacer repo público. (Alejandro investiga)
8. **CSS custom properties + Radix UI para el admin** — sin Tailwind. (Lucas)
9. **Sidebar del admin estático en sprint 1** — extensión dinámica en sprint 3. (Román)
10. **Definition of Done acordada** — TS strict, tests Vitest, lint/prettier, PR review, tests WP compat, no deps circulares.

## Conclusiones

- Consenso total en pasar de diseño a ejecución
- Orden de implementación: db → core (hooks) → server (REST) → plugin-api → theme-engine/cli. Admin en paralelo.
- Sprints de 2 semanas tras sprint 0
- Blog funcional primero (sprint 1-2), plugin system después (sprint 3)
- Pendiente: modelo de licencia (Alejandro)

## Acciones

| # | Acción | Responsable | Plazo |
|---|--------|-------------|-------|
| 1 | docker-compose.yml (PG 16 + Redis 7) | Román | Sprint 0 (día 1-2) |
| 2 | tsconfig.base.json + vitest.workspace.ts + .env.example | Román | Sprint 0 (día 1-2) |
| 3 | CI básico GitHub Actions (lint + typecheck + test) | Román + Helena | Sprint 0 (día 3-5) |
| 4 | Schema Drizzle (posts, users) en packages/db | Ingrid | Sprint 0 (día 3-5) |
| 5 | Scaffolding admin/ (Vite + React 19 + tokens CSS) | Lucas | Sprint 0 (día 1-3) |
| 6 | DoD formal en documento del repo | Tomás | Sprint 0 (día 1) |
| 7 | Investigar modelo de licencia (GPL vs dual) | Alejandro | Antes de repo público |
| 8 | Hook system (HookRegistry) + tests exhaustivos | Román | Sprint 1 |
| 9 | Content engine (posts CRUD) + 5 endpoints REST | Ingrid + Carmen | Sprint 1 |
| 10 | Test harness WP API conformance | Ingrid | Sprint 1 |
| 11 | Admin shell + dashboard 4 estados | Lucas + Marta | Sprint 1 |
| 12 | Design system componentes base | Marta | Sprint 1 |

---

_Generado por /meet — Trinity_
