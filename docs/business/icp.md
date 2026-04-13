# Ideal Customer Profile — NodePress

> Documento producido en Sprint 0 (2026-04-09) por Alejandro (CEO) con input de Eduardo (Consultor).
> Contexto: NodePress es CMS nativo Node.js. No es un orquestador sobre WordPress. No compite en el mercado PHP — compite en el mercado de equipos que quieren salir de PHP.

---

## Ideal Customer Profile

### ICP 1 — Agency Modernizer

**Quién es:**

- Agencia digital de 5-25 personas, fundada hace 5-10 años sobre WordPress
- Decisor: CTO o Tech Lead (a veces el mismo fundador técnico)
- Stack actual: WordPress + PHP + ACF/Elementor, hosting VPS o WP Engine
- Sus clientes son pymes y marcas medianas que piden webs de contenido + landing pages

**Pain point:**

- El equipo junior ya no quiere aprender PHP — contratan perfiles JavaScript y hay fricción constante
- Onboarding de nuevos devs tarda semanas por la complejidad del entorno WP
- Los proyectos nuevos quieren APIs headless pero mantener WP como back-end es un parche
- Deuda técnica acumulada en plugins PHP que nadie entiende

**Por qué NodePress:**

- El equipo trabaja 100% en TypeScript desde día 1, sin contexto switching
- API WP-compatible: pueden migrar proyectos de clientes sin reescribir el front-end
- Shortcodes PHP simples siguen funcionando vía WASM — la migración no es un big bang
- Plugin system nativo JS: los plugins principales (SEO, formularios, cacheo) tienen versión TS

**Deal breaker:**

- Tienen clientes con WooCommerce activo que no quieren tocar — NodePress no cubre e-commerce hoy
- Si más del 40% de su negocio depende de plugins PHP complejos (membership, LMS), la migración es inviable en Fase A
- Si el decisor no tiene perfil técnico y solo ve "WordPress funciona, ¿para qué cambiar?"

**Canal de adquisición:**

- Twitter/X dev community (WordPress + TypeScript overlap)
- Posts técnicos en Dev.to y Medium: "Migramos nuestra agencia de WP a NodePress — lo que aprendimos"
- Conferencias: WordCamp (lado disruptivo), JSNation, NodeConf
- Outreach directo a CTOs de agencias con repositorios WP públicos en GitHub

---

### ICP 2 — Headless Builder

**Quién es:**

- Equipo de producto de 3-10 devs en una startup o scale-up
- Decisor: CTO o Engineering Manager
- Stack actual: WP headless con REST API o WPGraphQL + front React/Next.js
- Frustración creciente con WP como back-end: actualizaciones de core que rompen, seguridad, rendimiento

**Pain point:**

- Usan WordPress solo como repositorio de contenido pero el overhead es enorme
- El admin panel de WP es legacy y sus editores de contenido lo odian en modo headless
- Cada vez que actualiza WP o un plugin se rompe algo en producción
- Quieren un CMS con developer experience de 2026, no de 2005

**Por qué NodePress:**

- API REST 100% compatible con WP REST API v2: zero cambios en el front-end React/Next.js
- Admin panel moderno en React — los editores de contenido tienen una interfaz coherente con el resto del stack
- Sin PHP en el servidor: el equipo puede dockerizar, deployar en cualquier cloud, y olvidar WordPress core
- Hook system idéntico al de WP: si han escrito custom hooks en PHP, la lógica se porta en TypeScript

**Deal breaker:**

- Si dependen de WPGraphQL y quieren mantenerlo — NodePress no tiene GraphQL en Fase A
- Si el negocio está en un vertical donde WP tiene plugins especializados sin equivalente JS (LMS enterprise, e-commerce complejo)
- Si el equipo no tiene capacidad para gestionar una migración aunque sea parcial

**Canal de adquisición:**

- GitHub — proyecto open source con buena DX atrae stars y early adopters orgánicamente
- Hacker News: "Show HN: NodePress — WP-compatible CMS built on Node.js"
- Comunidades headless: Jamstack Discord, r/webdev, Next.js community
- Comparativas SEO: "WordPress headless vs NodePress", "Strapi vs NodePress vs Ghost"

---

### ICP 3 — Greenfield TypeScript Team

**Quién es:**

- Equipo nuevo (startup early-stage, proyecto interno de empresa) que arranca un proyecto de contenido desde cero
- Decisor: CTO, Founder técnico, o Tech Lead
- Stack actual: ninguno — están eligiendo ahora
- El equipo es 100% JavaScript/TypeScript y quiere un CMS sin salir del ecosistema

**Pain point:**

- Las alternativas CMS son: WordPress (PHP, descartado), Strapi (Node.js pero sin ecosistema), Ghost (cerrado, opinado), Contentful/Sanity (SaaS, coste escala mal)
- Quieren self-hosted, open source, y con un ecosistema de plugins que crezca
- Si el proyecto tiene tracción, necesitan poder migrar contenido desde un WP existente sin perder nada

**Por qué NodePress:**

- Setup en minutos con Docker, stack 100% TypeScript, sin PHP en ningún punto del sistema
- API WP-compatible desde el día 1: si el proyecto crece y necesita migrar datos desde WP, la ruta existe
- Plugin system con hooks como WP pero en JS: el equipo puede extender sin parchear core
- Licencia open source: sin vendor lock-in, pueden forkear si necesitan

**Deal breaker:**

- Si el proyecto necesita e-commerce (WooCommerce no tiene equivalente en NodePress hoy)
- Si el equipo espera un ecosistema de 60.000 plugins desde el día 1 — NodePress está en Fase A
- Si el cliente final (no técnico) insiste en "quiero WordPress" por nombre de marca

**Canal de adquisición:**

- GitHub stars y boca-oreja en comunidades TypeScript
- Product Hunt launch cuando MVP esté estable
- SEO: "WordPress alternative Node.js", "headless CMS TypeScript open source"
- Newsletter de desarrolladores: Bytes, JavaScript Weekly, Node Weekly

---

## Anti-ICP (quién NO es nuestro cliente)

Estos perfiles generan fricción, soporte no escalable, y expectativas que NodePress no puede cumplir en Fase A (primeros 12 meses). No son el target.

- **Cliente WooCommerce legacy:** Tiene una tienda WP con WooCommerce, plugins de pago, reglas de envío, y no quiere tocar PHP. NodePress no tiene e-commerce. Dirigirle a nosotros es perder su tiempo y el nuestro.

- **Blogger no técnico:** Necesita WP admin tal cual — editor de bloques Gutenberg, plugins de galería, soporte de su hosting compartido. NodePress no es para él. Su curva de aprendizaje es la plataforma, no el CMS.

- **Enterprise con 200 plugins PHP custom:** Han invertido años en un ecosistema PHP propietario. La migración no es viable sin Fase C (PHP bridge), que no existe aún. Si entran, el proyecto se convierte en un proyecto de consultoría PHP, no en adopción de producto.

- **Agencia que solo quiere "algo más rápido que WP":** Sin intención de cambiar de paradigma técnico. Buscan optimización, no transformación. La propuesta de NodePress no resuena.

---

## Messaging Framework

### Tagline

> **CMS moderno. Sin legado.**

### Elevator Pitch (30 segundos)

NodePress es un CMS open source para equipos que construyen en TypeScript y están hartos de WordPress. Tu API WP-compatible sigue funcionando — el front-end no cambia. Tus shortcodes PHP simples siguen funcionando via WASM. Pero el servidor es 100% Node.js, el admin panel es React, y tu equipo trabaja en el stack que ya conoce. Migra gradualmente. O arranca de cero. Sin PHP.

### Key Differentiators

- **API WP-compatible sin WP:** REST API v2 y hook system identicos a WordPress — sin PHP, sin actualizaciones que rompen, sin legacy. Los proyectos headless existentes migran sin tocar el front.

- **DX de 2026 sobre paradigma WP:** TypeScript strict, Docker, CI/CD desde el primer commit. Plugin system con actions y filters como WP pero en JS. El equipo junior entra el dia 1 y es productivo.

- **Migración gradual, no big bang:** Shortcodes PHP simples via WASM. Plugins principales con versión nativa. Herramientas de importación WP. No hace falta reescribir todo para empezar a mover clientes.

---

_Documento vivo — revisión prevista en Fase B (mes 12) cuando el ecosistema de plugins amplíe el ICP._
