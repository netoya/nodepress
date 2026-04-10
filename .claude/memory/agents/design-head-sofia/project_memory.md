---
agent: design-head-sofia
project: nodepress
last_updated: 2026-04-09
---

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
