---
name: dev-frontend-marta-nodepress
description: Project memory for Marta (Dev Frontend) in NodePress
type: project
---

## Sprint 1 día 1 — #24 Design system atómico (2026-04-17)

- **6 componentes atómicos entregados:** Button, Badge, Card (+ 4 sub-components), Spinner, EmptyState, ErrorBoundary. 46 tests verdes. **Date:** 2026-04-17
- **CSS custom properties only (no Tailwind):** inline styles con tokens.css. Coherencia con patrón de Sidebar.tsx. **Why:** D-015 stack decision. **Date:** 2026-04-17
- **Button + loading:** spinner inline a la izquierda del children. En modo `asChild` (Radix Slot) NO se renderiza spinner — Slot no soporta múltiples hijos directos. **Date:** 2026-04-17
- **Card.CardTitle prop `as`:** dinámica `h1`|`h2`|`h3`|`h4`, default `h3`. Type-safe compile time. **Date:** 2026-04-17
- **ErrorBoundary class component:** `getDerivedStateFromError` + `componentDidCatch`. Retry resetea `hasError` internamente; caller debe rerender para recuperarse (protocolo React 19). **Date:** 2026-04-17
- **Spinner sin SVG externo:** CSS border-top transparent + @keyframes spin. `role="status"` accesible. **Date:** 2026-04-17
- **WCAG AA verificado:** contraste 4.5:1 en Button variants, `aria-disabled`/`aria-busy` en loading, `role="alert"` en ErrorBoundary fallback. **Date:** 2026-04-17
- **vitest config añadido en admin/:** `vitest.config.ts` con jsdom + `vitest.setup.ts` con `@testing-library/jest-dom`. Esto resuelve los 13 fallos pre-existentes de Card tests que Román reportó. **Date:** 2026-04-17
- **DevDeps añadidas a admin/:** vitest, @testing-library/react, @testing-library/jest-dom, @testing-library/user-event, jsdom. **Date:** 2026-04-17
- **ESLint flat config missing:** no bloqueo. Helena debe configurarlo. **Date:** 2026-04-17
- **Tests Strategy = Testing Library behavior, not implementation:** text visible, role accesible, interacción. Nunca nombres de clase internos. **Date:** 2026-04-17
