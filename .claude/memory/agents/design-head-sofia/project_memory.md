---
agent: design-head-sofia
project: nodepress
last_updated: 2026-04-19
---

## Meet 2026-04-19 — Mini sprint + CSS/templates

- **Acción #1: spec visual frontend público para 21-04.** Tipografía body del artículo, columna de lectura, h2/h3/blockquote/code dentro del content, shortcodes (CF7, footnotes) en article, archive vacío, 404 alineada con tokens. Derivada de tokens existentes del admin. **Date:** 2026-04-19
- **Gate de merge: screenshot approval obligatorio.** No aprueba Paso A sin ver render real de `/p/:slug` y `/`. CF7 y footnotes deben verse bien dentro del article. **Date:** 2026-04-19
- **Estado actual del frontend público:** HTML desnudo, estilo por defecto del navegador, 404 con colores hardcodeados fuera de paleta. Contraste con admin panel (Deep Violet, Inter, tokens) daña la credibilidad del demo. **Date:** 2026-04-19
- **Tokens admin son la fuente:** `admin/src/styles/tokens.css` — paleta Deep Violet, Inter, escala 4px. Copiados para Paso A, consolidados en paquete compartido Sprint 9. **Date:** 2026-04-19

# Project Memory — Sofía @ NodePress

## Context

NodePress es un CMS open-source en Node.js/TypeScript/PostgreSQL con admin panel en React. Compite con WordPress en compatibilidad de API pero con UX moderna.

## Decisions Taken

- **Identity:** Nombre visual "NodePress" se mantiene. Tagline: "CMS moderno. Sin legado."
- **Color primary:** Deep Violet `#5B4CF5` — diferenciador respecto al azul de WordPress (`#2271b1`)
- **Tipografía:** Inter (UI) + JetBrains Mono (código). Ambas Google Fonts/open.
- **Design language:** Clean, espacioso, sin chrome excesivo. Inspirado en Linear + Sanity Studio.
- **Tokens:** Definidos en `/docs/design/tokens.md`. Escala 4px base.
- **Wireframes dashboard:** Definidos en `/docs/design/wireframes-dashboard.md`. Layout 3 zonas: sidebar fijo, header sticky, content área.

## Constraints Discovered

- Admin panel target: usuarios que vienen de WP. Curva de aprendizaje debe ser mínima.
- Accesibilidad WCAG AA obligatoria desde el primer día (heredado del perfil de Sofía).
- NO generar CSS ni código React — sólo specs y documentación.

## Pending / Open Questions

- Definir dark mode tokens (no en scope de esta iteración, pero a documentar como future work).
- Validar paleta con usuarios reales de WordPress (research pendiente).
