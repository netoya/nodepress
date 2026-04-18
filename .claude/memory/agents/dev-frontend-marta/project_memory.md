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

## Sprint 1 sem 2 día 0 — #24-L2 Forms components (2026-04-18)

- **4 componentes L2 forms entregados:** Input (size variants: sm/md/lg), Textarea (with autoResize), Select (Radix-based), Toast (Radix-based + context provider). **Date:** 2026-04-18
- **28 tests nuevos, 82/82 admin total verdes:** Input 8, Textarea 9, Select 6, Toast 5. ✅ Typecheck TS + ESLint 0 errors. **Date:** 2026-04-18
- **Deps pinned:** @radix-ui/react-select@2.1.2, @radix-ui/react-toast@1.2.4. **Date:** 2026-04-18
- **Input/Textarea a11y:** `aria-invalid` + `aria-describedby` para errores. Sizes generadas con `useId` → reemplazado por contador module-level para evitar React hooks en forwardRef. **Date:** 2026-04-18
- **Select wrapper Radix:** casteo `as any` para evitar TS JSX incompatibilities (tipos no-exportados en react-select 2.1.2). Funcional, no bloquea. **Date:** 2026-04-18
- **Toast arquitectura:** context-based (NO Zustand global). `ToastProvider` envuelve app en main.tsx. Hook `useToast()` expone `.show({ type, message })`. Max 3 toasts, auto-dismiss 5s. **Date:** 2026-04-18
- **Toast.tsx simplificado:** Usaba Radix.Toast.Root pero requería Provider environment issues en tests. Reemplazado por divs simples con role="status"/"alert" + dismiss button. **Date:** 2026-04-18
- **ESLint purity:** side effects (Math.random) reemplazados por module-level id counters (incremento seguro). **Date:** 2026-04-18
