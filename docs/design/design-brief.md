# Design Brief — NodePress Admin Panel

> Versión 1.0 · Sofía, Head de Diseño · 2026-04-09

---

## 1. Identidad Visual

### Nombre y posicionamiento

**NodePress** — CMS moderno para la web actual.

El nombre retiene la familiaridad de WordPress ("Press" como en publishing) pero señala la ruptura tecnológica (Node.js). No es un fork, es una alternativa.

**Tagline:** "CMS moderno. Sin legado."

El tagline habla directamente al pain point del usuario de WordPress: un sistema que acumula deuda técnica de 20 años. NodePress promete el poder de WP sin el peso.

---

### Paleta de Colores

#### Color Principal — Deep Violet

`Primary: #5B4CF5`

Elección deliberada: WordPress usa azul (`#2271b1`). NodePress usa violeta. No es una variación — es una declaración. El violeta posiciona el producto en el espacio de herramientas para creadores modernos (Notion, Linear, Raycast). Transmite creatividad técnica, no software corporativo.

#### Color Secundario — Electric Teal

`Secondary: #00C9A7`

Complementario al violeta. Usado para estados de éxito, acciones positivas, highlights de datos. Aporta energía sin agresividad.

#### Neutros

Escala de grises fría (con ligero tinte violeta en los extremos) para mantener coherencia cromática. El fondo base es casi-blanco, no blanco puro — reduce la fatiga visual en sesiones largas de edición.

#### Semánticos

- **Danger:** `#EF4444` (rojo claro, no agresivo)
- **Warning:** `#F59E0B` (ámbar)
- **Success:** `#10B981` (verde esmeralda)
- **Info:** `#3B82F6` (azul informativo, diferenciado del primary)

---

### Tipografía

#### UI — Inter

Inter es la elección estándar para interfaces de datos densas. Diseñada específicamente para pantallas de baja resolución. Excelente legibilidad en tamaños pequeños (11–14px). Uso: toda la UI del admin.

**Fallback:** `-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`

#### Código — JetBrains Mono

Para el editor de contenido, bloques de código, shortcodes, y cualquier elemento de código o markup. Ligaduras tipográficas activadas. Uso: editor de texto, consola, campos de código.

**Fallback:** `"Fira Code", "Cascadia Code", monospace`

---

### Tono de Voz (UI Copy)

- **Directo, no condescendiente.** "Publicar entrada" no "¿Listo para publicar? ¡Genial!"
- **Técnico cuando debe serlo.** Los usuarios de WordPress conocen el vocabulario: slug, permalink, taxonomía, hook.
- **Humano en los estados vacíos.** Un empty state puede ser cálido sin ser infantil.
- **Inglés por defecto, i18n desde el día 1.** El copy se gestiona via i18n keys, no hardcoded.

---

## 2. Principios de Diseño

### P1 — Familiaridad Deliberada

> "El usuario no debería necesitar un tutorial para encontrar sus entradas."

NodePress compite con WP, pero sus usuarios vienen de WP. Las metáforas de navegación (entradas, páginas, medios, usuarios, ajustes) se conservan. Cambia la ejecución visual, no la arquitectura de información. La curva de aprendizaje es near-zero para usuarios de WP.

**En práctica:** Mismas etiquetas de menú que WP. Mismo orden en el sidebar. Sorpresa positiva en cada pantalla: "esto lo entiendo, pero es mucho mejor."

### P2 — Densidad Controlada

> "Cada píxel justifica su existencia."

Los admin panels tienen la tentación de mostrar todo a la vez. NodePress sigue la escuela de Linear y Figma: información densa cuando el usuario la necesita, espaciosa cuando no. El whitespace no es espacio vacío — es respiro cognitivo.

**En práctica:** Dashboard home muestra 4–6 métricas clave. El resto bajo demanda. No hay tablas con 12 columnas visibles por defecto.

### P3 — Estados Siempre Definidos

> "Una interfaz sin estado vacío es una interfaz incompleta."

Cada vista tiene tres estados obligatorios antes de ser aprobada: **vacío** (sin datos), **cargando** (skeleton, no spinner genérico), **error** (con mensaje accionable, no "Ha ocurrido un error").

**En práctica:** Checklist de Sofía antes de aprobar cualquier componente o pantalla. Sin los tres estados, no sale.

### P4 — Accesibilidad como Fundamento

> "WCAG AA no es un checkbox. Es el suelo, no el techo."

Contraste mínimo 4.5:1 para texto normal, 3:1 para texto grande. Focus states visibles. Orden de tabulación lógico. Todos los iconos con labels accesibles. Soporte para reduced-motion.

**En práctica:** Los tokens de color se validan contra WCAG AA antes de publicarse. Ningún componente sale sin aria labels.

### P5 — Velocidad Percibida

> "La UI debe sentirse más rápida de lo que es."

Optimistic UI donde sea seguro (cambio de estado, publicar borrador). Skeleton loaders que replican el layout real. Transiciones de 150–200ms (suficiente para ser percibidas, insuficiente para molestar). Sin spinners bloqueantes en operaciones que tardan menos de 400ms.

**En práctica:** Definición de qué operaciones usan optimistic update. Guía de motion para el equipo frontend.

---

## 3. Referentes Visuales

### Linear — Referente Principal

**Por qué:** Linear es el benchmark de interfaces de herramientas para profesionales en 2024–2026. Sidebar limpio, tipografía densa pero legible, keyboard-first, dark mode de primer orden. Demuestra que un producto B2B puede ser visualmente deseable.

**Qué tomamos:** Tratamiento del sidebar (iconos + labels, colapsable), densidad de información en listas, microinteracciones sutiles, sistema de shortcuts visible.

**Qué no tomamos:** El dark mode primario (NodePress es light-first, dado que viene de WP).

### Sanity Studio — Referente de Editor

**Por qué:** Sanity Studio v3 es el admin panel más moderno de un CMS headless. Panel dividido, editor rico, preview en tiempo real. Los usuarios de WordPress más técnicos conocen Sanity.

**Qué tomamos:** La filosofía de "el editor es el producto". Panel de edición como zona de trabajo primaria. Estructura de campos limpia.

**Qué no tomamos:** La complejidad de configuración. NodePress debe ser más accesible.

### Ghost Admin — Referente de Familiaridad

**Por qué:** Ghost es la alternativa moderna más cercana a WordPress en concepto. Su admin panel ha conseguido algo difícil: sentirse familiar para usuarios de WP y moderno a la vez.

**Qué tomamos:** El flujo de publicación (borrador → revisión → publicado), la gestión de etiquetas y autores, el dashboard de analítica simple.

**Qué no tomamos:** La apuesta al minimalismo extremo. NodePress necesita más funcionalidad visible.

### Craft CMS — Referente de Poder Controlado

**Por qué:** Craft CMS demuestra que un CMS puede ser potente y tener una UI organizada. Su sistema de campos y entidades es complejo, pero la UI lo absorbe bien.

**Qué tomamos:** El tratamiento de entidades complejas (custom fields, relaciones entre contenidos), la consistencia del sistema de diseño.

**Qué no tomamos:** El aesthetic más corporativo/frío.

---

## Notas para el Equipo

- Los tokens de color en `/docs/design/tokens.md` son la fuente de verdad. Cualquier valor hardcodeado en CSS es un bug.
- Este brief es un documento vivo. Se actualiza con cada sprint de diseño.
- Dark mode está en roadmap pero fuera de scope v1. Los tokens están estructurados para soportarlo cuando llegue.
- Validar paleta con usuarios reales de WP antes de freeze v1.
