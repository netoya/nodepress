## Meet 2026-04-09 — Cómo llevar NodePress al siguiente paso

- **Sprint 0 (Lucas):** Scaffolding admin/ con Vite + React 19 + tokens CSS custom properties. Días 1-3. **Date:** 2026-04-09
- **Sprint 1 (Lucas):** Admin shell (sidebar, header, layout) + dashboard 4 estados + design system base. Marta ayuda con componentes atómicos. **Date:** 2026-04-09
- **Stack frontend decidido:** CSS custom properties (no Tailwind), Radix UI primitivos, Zustand global, React Query server state, MSW mocks. **Date:** 2026-04-09
- **Contrato API:** Mockear contra WP REST API Handbook schemas. Borrar mocks cuando backend suba endpoints reales. **Date:** 2026-04-09
- **Sidebar estático sprint 1:** Extensión dinámica por plugins en sprint 3 (Román diseña protocolo). **Date:** 2026-04-09

## Meet 2026-04-17 — Kickoff Sprint 1 y puesta al día

- **Arranco Sprint 1 sin dependencia backend:** MSW mockea contra WP REST API Handbook spec directamente. Cuando Ingrid suba endpoints reales, borro mocks. **Date:** 2026-04-17
- **Orden ataque:** semana 1 #22 shell (sidebar estático + header + layout) + #24 design system atómico con Marta (brief cerrado 6 componentes) → semana 2 #23 dashboard 4 estados con React Query. **Date:** 2026-04-17
- **Brief para Marta obligatoriamente cerrado y granular:** Haiku no tolera ambigüedad. Componentes: Button, Badge, Card, Spinner, EmptyState, ErrorBoundary. **Date:** 2026-04-17
- **Wireframes dashboard bloqueantes para semana 2:** Sofía confirma fecha antes del viernes 2026-04-18 (Tomás lleva el ping). **Date:** 2026-04-17
- **Dependencias pinned, no rangos + lock file actualizado:** regla de Román para admin/package.json. Aplicable a Radix UI, Zustand, React Query, MSW. **Date:** 2026-04-17
- **Demo objetivo Sprint 1 (30-04):** dashboard debe renderizar un post creado vía POST /wp/v2/posts tras mutación por hook. Mi parte: que el render end-to-end funcione con datos reales (no solo mocks) al final. **Date:** 2026-04-17

## Sprint 1 día 2 — #23 dashboard draft (MSW-based)

- **Scaffold completo:** `admin/src/features/dashboard/` con DashboardPage + 4 componentes de estado + hook usePostsList. **Date:** 2026-04-18
- **4 estados implementados:** loading (DashboardSkeleton), error (DashboardError + retry), empty (DashboardEmpty + CTA), data (PostsList). **Date:** 2026-04-18
- **MSW configurado dev-only:** handlers.ts cubre GET list, GET by id, POST, PUT, DELETE. `startMswWorker()` guard con `import.meta.env.DEV` — no entra en build prod. **Date:** 2026-04-18
- **Tipos WP REST v2:** `admin/src/types/wp-post.ts` derivados de openapi.yaml. Divergencias DIV-001/002/003/005 documentadas como comentarios. **Date:** 2026-04-18
- **Tests 50/50 verdes:** 4 tests nuevos DashboardPage (happy path, loading, empty, error+retry) + 46 de Marta intactos. **Date:** 2026-04-18
- **Wireframes de Sofía pendientes — este scaffold es base, se ajusta cuando lleguen.** Layout actual: maxWidth 800px centrado, flex column, Cards por post. Cuando lleguen wireframes: ajustar grid layout, espaciado, posición header actions, posible sidebar info. **Date:** 2026-04-18
- **Gotcha:** Spinner (Marta) tiene `role="status"` interno. En DashboardSkeleton hay que envolver con `aria-hidden` para evitar conflicto con el `role="status"` del contenedor. Patrón documentado en DashboardSkeleton. **Date:** 2026-04-18

## Sprint 1 día 2 — Playwright E2E visual

- **Playwright 1.50.1 instalado** en `admin/` con Chromium headless. Config: `admin/playwright.config.ts`. **Date:** 2026-04-18
- **5 specs en `admin/e2e/`:** dashboard-data, dashboard-loading, dashboard-empty, dashboard-error, dashboard-a11y. 8 tests total. Todos verdes. **Date:** 2026-04-18
- **MSW vs Playwright interop:** `serviceWorkers: 'block'` en playwright.config para impedir que el SW de MSW intercepte requests. `server.ts` actualizado con `.catch()` para que `worker.start()` no bloquee el render cuando el SW está bloqueado. **Date:** 2026-04-18
- **Gotcha aria-label:** DashboardError Button tiene `aria-label="Retry loading posts"` — el accessible name NO es el texto visible "Try again". `getByRole('button', { name: /retry loading posts/i })` es el selector correcto. **Date:** 2026-04-18
- **Gotcha refetchOnWindowFocus:** React Query dispara refetch en focus/visibilitychange events provocados por interacciones de Playwright (screenshots). En tests de error: suprimir estos eventos con `addInitScript` + `stopImmediatePropagation` en capture phase antes de `goto()`. **Date:** 2026-04-18
- **Gotcha selector posts:** `PostsList` usa `<ul aria-label="Posts"><li>` — NO hay `<article>`. Selector correcto: `page.locator('ul[aria-label="Posts"] li')`. **Date:** 2026-04-18
- **5 snapshots** generados en subdirectorios `*.spec.ts-snapshots/`: dashboard-data, dashboard-empty, dashboard-loading, dashboard-error, dashboard-error-recovered. **Date:** 2026-04-18
- **Vitest exclude:** añadido `"**/e2e/**"` en `vitest.config.ts` para que Vitest no intente parsear specs de Playwright. **Date:** 2026-04-18
