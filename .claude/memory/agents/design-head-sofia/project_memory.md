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

## Entregables completados

- **2026-04-19 — `docs/design/public-frontend-spec.md`**: Spec visual completa para el Paso A (CSS en InlineThemeEngine). Cubre: escala tipográfica (h1-h3, p, caption, code), columna de lectura 720px, mapeo de tokens a usos públicos, shortcodes ([footnote], [su_note], [su_button], blockquote), empty state archive, 404, nav/header/footer. Gate de merge: screenshot obligatorio de /, /p/:slug y 404 antes de aprobar.

## Pending / Open Questions

- Definir dark mode tokens para el frontend público (Sprint 8). Los tokens `[data-theme="dark"]` actuales son para el admin panel y no están validados para lectura larga.
- Gate pendiente: screenshot approval de Marta sobre el Paso A (render real de las 3 vistas).
- Validar paleta con usuarios reales de WordPress (research pendiente).
