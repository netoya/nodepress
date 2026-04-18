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

## Meet 2026-04-18 — equipo continuemos (Sprint 1 semana 2)

- **Scope congelado Sprint 1 — NO abrir Sprint 2 por adelantado:** hardening selectivo + prep quirúrgica. **Why:** 92% done con ritmo x6 es ventana peligrosa para scope creep. **Date:** 2026-04-18
- **/posts list + editor básico entran en Sprint 1** como completude demo: textarea sin bloques. Lucas + Marta. Filtros Martín+Román+Tomás para aprobar. **Date:** 2026-04-18
- **3 tickets hardening backend:** #28 integration tests Postgres real, #29 coverage db INSERT/SELECT/UPDATE, #30 stress circuit breaker concurrent. Ingrid. **Date:** 2026-04-18
- **Skeleton + ADR stub en cli/theme-engine/plugin-api** (3 paquetes con index.ts de 1 línea). Román, antes del viernes 2026-04-24. **Date:** 2026-04-18
- **Protocolo scope freeze activado:** tickets nuevos en Sprint 1 requieren Román + Tomás + Martín. Sin excepción. **Date:** 2026-04-18
- **CLA Assistant jueves 2026-04-23** (90 min Alejandro + Eduardo). Bloquea outreach. **Date:** 2026-04-18
- **Outreach privado arranca viernes 2026-04-24:** 15 calls CTOs ICP-1 con demo grabada, 10 días. Pregunta única: "¿Qué tendría que hacer NodePress para que migraseis un cliente piloto en Q3?" **Date:** 2026-04-18
- **ADRs 005-009 a Accepted antes viernes 24-04.** Sesión asíncrona miércoles. **Date:** 2026-04-18
- **R-2 (contract-freeze) formalizada en apéndice contributing.md** antes lunes 21-04. Tomás. **Date:** 2026-04-18
- **Burndown real cada lunes en GitHub Discussions** desde 21-04. Martín. **Date:** 2026-04-18
- **Messaging A/B test parqueado** a cierre Sprint — un frente abierto cada vez. **Date:** 2026-04-18
- **Temperature check equipo: sin señales burnout hoy** — Tomás sondea cada 3-4 días, no asume que flow = sostenible. **Date:** 2026-04-18

## Sprint 1 sem 2 — /posts editor (new+edit) completo (2026-04-18)

- **PostEditorPage.tsx:** 2 modos (new/edit via postId prop). postId=null → crear; number → editar. Formulario se muestra cuando datos están listos (edit) o inmediatamente (new). **Date:** 2026-04-18
- **PostForm.tsx:** Form controlado reutilizable. Input(title,slug), Textarea(content autoResize, excerpt), Select(status). No rich text — constraint Alejandro. **Date:** 2026-04-18
- **3 hooks nuevos:** useCreatePost (POST), useUpdatePost (PUT), usePostQuery (GET single). useDeletePost (DELETE) también añadido para PostsListPage. **Date:** 2026-04-18
- **Hash routing extendido (App.tsx):** `#posts/new` → PostEditorPage(null), `#posts/:id/edit` → PostEditorPage(id). Parsing con split('/') sin React Router. **Date:** 2026-04-18
- **PostsListPage integrado:** "Add new" → #posts/new, Edit → #posts/:id/edit, Delete → useDeletePost + browser confirm() + toast. Modal pending Sprint 2. **Date:** 2026-04-18
- **Toast feedback:** 4 mensajes — Post created/updated (success), Failed to create (error), Post moved to trash (success). Usando useToast() de Marta. **Date:** 2026-04-18
- **Tests 86/86 verdes:** 4 nuevos en PostEditorPage.test.tsx (new mode render, create success, create error, edit mode pre-fill). **Date:** 2026-04-18
- **Gotcha crítico — React dual instance:** admin/node_modules/react 19.0.0 vs nodepress/node_modules/react 19.2.5. @testing-library/react (hoisted) usa react-dom 19.2.5; componentes con useState directo usaban React 19.0.0 → null dispatcher. Fix: `npm install react@19.2.5 react-dom@19.2.5` en admin/. **Date:** 2026-04-18
- **Gotcha tests — vi.mock de Radix:** En tests de PostEditorPage, vi.mock("../../../components/ui/ToastProvider") Y vi.mock("../../../components/ui/Select") previenen que sus respectivos paquetes Radix se carguen. Los mocks deben ser static (no await import) para que Vitest los hoise correctamente. **Date:** 2026-04-18
- **PostEditorPage — no useEffect para sync:** ESLint react-hooks/set-state-in-effect prohíbe setState en useEffect. Solución: serverValues derivados del post query, localEdits como override en useState. Pattern: `values = { ...serverValues, ...localEdits }`. **Date:** 2026-04-18
- **Gap componentes — Modal:** Para confirm delete se usa browser.confirm() en v1. Modal pendiente Sprint 2. Flagged. **Date:** 2026-04-18

## Sprint 1 sem 2 día 0 — /posts scaffold + brief forms L2 (2026-04-18)

- **Brief Marta L2 entregado:** `admin/docs/brief-marta-design-system-l2.md` con Input/Textarea/Select/Toast — props API, estructura JSX, a11y, tests mínimos, deps pinned a instalar por Marta (@radix-ui/react-select@2.1.2, @radix-ui/react-toast@1.2.4). **Date:** 2026-04-18
- **/posts list scaffold:** PostsListPage con 4 estados (data/loading/empty/error), PostsTable accesible con Status badge por tipo, useQuery wrapper. 4 tests nuevos verdes. **Date:** 2026-04-18
- **Hash routing sin React Router:** `window.location.hash` → 'dashboard' | 'posts'. Sprint 2 añade React Router. **Date:** 2026-04-18
- **MSW handlers extendidos:** +2 posts dummy (status draft, pending) para demo realista. **Date:** 2026-04-18
- **Tests totales admin:** 54/54 verdes (4 nuevos + 50 previos sin regresiones). **Date:** 2026-04-18
