## M8 — Admin Pages UI (2026-04-20)

- **`admin/src/hooks/useContentQuery.ts` created:** Hook factory that accepts `endpoint: string` and returns `useListQuery`, `useItemQuery`, `useCreateMutation`, `useUpdateMutation`, `useDeleteMutation`. Fully typed with `<T extends { id: number }>` generic. Cache key derived from last path segment (e.g. "/wp/v2/pages" → "pages"). **Date:** 2026-04-20
- **Gotcha — ESLint rules-of-hooks with factory:** Calling `useContentQuery(...)` at module level triggers `react-hooks/rules-of-hooks` because of the `use` prefix. Fix: call the factory inside the component body. The returned hook functions call React hooks (`useQuery`, `useMutation`) correctly — ESLint does not track them via property access so no false positives inside the component. **Date:** 2026-04-20
- **`admin/src/features/pages/PagesListPage.tsx` created:** 4-state (loading/error/empty/data) page list. Table columns: Title, Slug, Parent (name of parent page if parent!=0 via Map lookup, else "—"), Menu Order, Status, Date, Actions. "New Page" button → `/pages/new`. Row click → `/pages/:id/edit`. Inline delete confirmation dialog (same pattern as PostsListPage). **Date:** 2026-04-20
- **`admin/src/features/pages/PageForm.tsx` created:** Controlled form with title, slug (auto-generated from title via useEffect when slug is empty), content (textarea), status (select), parent (select with all pages from GET /wp/v2/pages?per_page=100), menu_order (number input). Parent selector filters out `currentPageId` from the list — direct circular reference guard. `// TODO: Sprint 8 — prevenir referencias circulares indirectas (A→B→A)`. **Date:** 2026-04-20
- **`admin/src/features/pages/PageEditorPage.tsx` created:** Create/edit modes via `pageId: number | null`. Uses `useContentQuery` factory. `serverValues` + `localEdits` override pattern (same as PostEditorPage). **Date:** 2026-04-20
- **`admin/src/features/pages/PageEditorRoute.tsx` created:** Thin router adapter — reads `useParams` and passes `pageId` to `PageEditorPage`. Same pattern as `PostEditorRoute`. **Date:** 2026-04-20
- **`admin/src/router.tsx` updated:** Added `/pages`, `/pages/new`, `/pages/:id/edit` routes under AdminLayout children. **Date:** 2026-04-20
- **Sidebar already had "Pages" link** at `admin/src/components/layout/Sidebar.tsx` — no changes needed. **Date:** 2026-04-20
- **Select mock pattern in tests:** PageForm uses Select (Radix). Test file stubs `../../../components/ui/Select` with a plain `<select>` to avoid Radix jsdom issues. Same pattern as PostEditorPage tests. **Date:** 2026-04-20
- **11 new tests green:** 5 in `PagesListPage.test.tsx` (data/loading/empty/error/navigate) + 6 in `PageForm.test.tsx` (fields render, submit, parent exclusion, parent all-in-create, menu_order, create button label). **Date:** 2026-04-20
- **164 total tests, 157 pass, 7 pre-existing failures** (settings + users — unrelated to pages work). 0 new TS errors in new files. 0 ESLint errors in new files. **Date:** 2026-04-20

## Sprint 7 — Modal generic component + MSW pages handlers (2026-04-20)

- **`admin/src/components/ui/Modal.tsx` created:** Generic dialog component. Props: `title`, `onClose`, `children`, `size?: 'sm'|'md'|'lg'`. role="dialog", aria-modal="true", aria-labelledby via `useId()`. Backdrop click closes. Escape key closes (handled only in dialog panel onKeyDown — not on backdrop, to avoid double-fire on bubble). Focus moves to first focusable on mount. **Date:** 2026-04-20
- **Modal exported from `admin/src/components/ui/index.ts`.** **Date:** 2026-04-20
- **7 Modal tests in `__tests__/Modal.test.tsx` all green:** title renders, children visible, aria-modal present, aria-labelledby connected, Escape closes, backdrop click closes, panel click does NOT close. **Date:** 2026-04-20
- **Gotcha — double Escape fire:** If `onKeyDown` is on both backdrop div AND dialog div, Escape fires twice (bubble). Fix: only handle on dialog div. **Date:** 2026-04-20
- **`WpPage` interface added to `admin/src/types/wp-post.ts`:** parent and menu_order at root (contract from Ingrid). Includes id, date, modified, slug, status, title (RenderedField), content (RenderedField), author, parent (number), menu_order (number), link (optional). **Date:** 2026-04-20
- **MSW handlers for `/wp/v2/pages` added to `admin/src/mocks/handlers.ts`:** GET list, GET :id, POST (201), PUT, DELETE (200). Mock data includes 3 pages: id=10 (parent=0), id=11 (parent=10, child), id=12 (parent=0, draft). Child page covers parent selector tests. **Date:** 2026-04-20
- **134/134 tests green after all changes. 0 new TS errors. 0 ESLint errors.** Pre-existing react-router-dom NavLink/Outlet TS errors unchanged. **Date:** 2026-04-20

## Planning Mini-Sprint Pages/Users/Settings — 2026-07-14

- **M8 = 2 días confirmados:** parent selector con guard circular, `useContentQuery(endpoint)` hook factory, router, sidebar. Terminar el jueves al mediodía para dar tiempo a M11. **Date:** 2026-07-14
- **`useContentQuery(endpoint)` hook factory:** parametriza CRUD hooks para posts y pages sin duplicar código. **Date:** 2026-07-14
- **`parent` + `menu_order` en root:** no embebidos. Integer ID en root. Contrato cerrado con Ingrid. **Date:** 2026-07-14
- **Circular parent = tech debt Sprint 8:** guard en cliente excluye page actual de la lista de parents. Caso indirecto = TODO en código. Backend no valida en MVP. **Date:** 2026-07-14
- **Modal genérico extraído el lunes AM:** 0.5 días día 1. Prerequisito para M9 de Marta el martes. **Date:** 2026-07-14
- **Brief de M9 cerrado hoy:** `UserEditorModal` con `mode="create"|"edit"`. Password required en create, opcional en edit. **Date:** 2026-07-14
- **MSW handler de pages desde día 1:** para no bloquearse esperando M2. **Date:** 2026-07-14
- **M10 settings:** `defaultCategory` carga categorías desde GET /wp/v2/categories — existe y operativo. **Date:** 2026-07-14

## Meet 2026-04-19 — Mini sprint + CSS/templates

- **Paso A en Sprint 7:** Sofía entrega spec visual 21-04 → Marta implementa CSS en `InlineThemeEngine` → Sofía aprueba screenshot 23-04. Lucas supervisa arquitectura y añade screenshot assertion a `public-site-shortcodes.spec.ts` 23-04. **Date:** 2026-04-19
- **`INLINE_CSS` del 404 es anti-patrón:** CSS de negocio en el handler con valores hardcodeados fuera de paleta. Unificar en el Paso A. **Date:** 2026-04-19
- **Tokens copiados para Paso A:** `admin/src/styles/tokens.css` → `packages/theme-engine/src/themes/default/tokens.css`. Consolidación como P0 en Sprint 9. **Date:** 2026-04-19

## Sprint 7 — public-site-shortcodes.spec.ts (2026-04-19)

- **`admin/e2e/public-site-shortcodes.spec.ts` created:** 3 tests in CI (NOT in demo/). Negative: plain post body does not contain `[footnote]`/`[su_note]` raw tags. Positive footnote: `sup a.footnote-ref` visible + `.footnotes` section with note text. Positive su_note: `div.su-note` visible with "Contenido destacado". **Date:** 2026-04-19
- **Bridge skip guard pattern:** `isBridgeAvailable()` probes `x-nodepress-tier2` response header from `GET /wp/v2/posts`. If absent, positive tests call `test.skip(true, "...message...")` with a clear explanation. **Date:** 2026-04-19
- **Post creation via REST:** `createPost()` helper uses `POST /wp/v2/posts` with `Authorization: Bearer <token>` — same pattern as demo-php-plugin.spec.ts. No admin UI interaction needed. **Date:** 2026-04-19
- **Negative test is CI-safe:** runs without NODEPRESS_TIER2 — only requires backend on :3000. Positive tests skip cleanly when bridge is absent. **Date:** 2026-04-19

## Meet 2026-04-19 — Flujos sin cobertura — bridge PHP-WASM

- **Regla `e2e/skipped/` adoptada por el equipo:** Specs sin assert principal van a `e2e/skipped/` con issue bloqueante abierto. No a `demo/`. CI no pasa con specs en `skipped/` sin issue. **Date:** 2026-04-19
- **Acción #6: `public-site-shortcodes.spec.ts`:** Suite fuera de `demo/`. Assert negativo: `not.toContain('[footnote]')`. Assert positivo: `sup.footnote-ref` visible. Plazo: 2026-04-22. **Date:** 2026-04-19
- **Cero cobertura public site en CI:** `testIgnore: ["**/demo/**"]` en `playwright.config.ts` excluye los únicos specs que ejercen el renderizado. `GET /p/:slug` nunca ha corrido en CI. **Date:** 2026-04-19
- **`demo-30-04.spec.ts` pasos 11-14 (pending-carmen):** Listos para activar cuando Carmen mergee el theme engine. No están en CI — activarlos dentro de `public-site-shortcodes.spec.ts` o spec separado. **Date:** 2026-04-19

## Sprint 5 — #68 React Router v7 migration (2026-04-18)

- **Migration complete:** Hash routing manual (window.location.hash + split('/')) replaced with `createHashRouter`. Commit f5d9a2b. **Date:** 2026-04-18
- **New files:** `admin/src/router.tsx` (createHashRouter config), `admin/src/layouts/AdminLayout.tsx` (AppShell + Outlet), `admin/src/features/posts/PostEditorRoute.tsx` (useParams adapter). **Date:** 2026-04-18
- **App.tsx retired from routing:** RouterProvider in main.tsx replaces `<App />`. App.tsx still exists but is no longer used — can be deleted in cleanup. **Date:** 2026-04-18
- **Adapter pattern for PostEditorPage:** PostEditorPage stays prop-driven (postId: number | null). PostEditorRoute reads useParams and forwards. This means unit tests for PostEditorPage need NO MemoryRouter — just vi.mock("react-router-dom"). **Date:** 2026-04-18
- **Sidebar uses NavLink:** `end` prop on Dashboard ("/") prevents match on all routes. onMouseLeave reads aria-current="page" to restore active styles correctly. **Date:** 2026-04-18
- **Test strategy:** vi.mock("react-router-dom", () => ({ useNavigate: () => mockNavigate })) in PostEditorPage.test and PostsListPage.test. No MemoryRouter needed. mockNavigate cleared in afterEach. **Date:** 2026-04-18
- **@types/react bumped to 19.1:** Required for NavLink/Outlet JSX compat with React 19. Side effect: Textarea.tsx onInput cast from FormEvent → any (InputEvent type change in 19.1). Runtime behavior unchanged. **Date:** 2026-04-18
- **createHashRouter chosen over createBrowserRouter:** No server-side fallback configured. Hash URLs (/#/posts) work everywhere without nginx/vite config. Switch to BrowserRouter when deploying behind a proper fallback. **Date:** 2026-04-18
- **95/95 tests green, 0 TS errors, 0 ESLint errors after migration.** **Date:** 2026-04-18

## Meet 2026-04-18 — Kickoff Sprint 5

- **D-035 React Router v7 migración:** Entra como ticket Sprint 5. Hash routing manual con split('/') no escala con /plugins + /apariencia pages. 3 días (1 implementación + 2 tests con Marta). **Date:** 2026-04-18
- **Fix pre-sprint (fuera de sprint):** browser.confirm() → modal propio (1h). TODO comments en PostEditorPage → convertir a GitHub issues linkados (30min). Hacer antes del repo público. **Date:** 2026-04-18
- **Nico activación condicionada:** Nico se activa en Sprint 5 solo si debrief ICP-1 confirma señal de marketplace (≥5 de 15 calls mencionando plugins terceros). De lo contrario, Sprint 6. **Date:** 2026-04-18
- **Plugin UI Sprint 5 (condicional):** Si hay señal ICP-1, Lucas + Nico hacen /plugins page (lista local, enable/disable) conectada a GET /wp/v2/plugins. No es marketplace browseable — es gestión local. **Date:** 2026-04-18
- **Sofía wireframes pendientes desde Sprint 1:** El layout dashboard es placeholder de Lucas. Antes de beta pública hay que hacer un paso de diseño. Bloqueante para ThemeEngine frontend integration y plugin UI. **Date:** 2026-04-18

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

## Sprint 1 sem 2 — VITE_USE_MSW + VITE_API_URL flags (gap demo 3/3) (2026-04-18)

- **`admin/src/lib/api.ts` creado:** `apiUrl(path)` + `authHeaders()`. `API_BASE_URL` usa `VITE_API_URL` o `window.location.origin` como fallback — garantiza URL absoluta en browser y en jsdom tests. **Date:** 2026-04-18
- **`server.ts` actualizado:** nueva guard `if (import.meta.env["VITE_USE_MSW"] === "false") return;` antes de importar `./browser`. Backward-compat: MSW activo cuando `VITE_USE_MSW` no está definido. **Date:** 2026-04-18
- **6 hooks actualizados:** `usePostsList`, `usePostsQuery`, `usePostQuery`, `useCreatePost`, `useUpdatePost`, `useDeletePost` — todos usan `apiUrl()`. Mutation hooks (POST/PUT/DELETE) usan `authHeaders()`. **Date:** 2026-04-18
- **`admin/.env.example` creado:** documenta las 3 variables. **Date:** 2026-04-18
- **`admin/README.md` creado:** tabla de env flags + demo mode bash snippet. **Date:** 2026-04-18
- **Tests 88/88 verdes:** 2 tests nuevos en `src/mocks/__tests__/server.test.ts` — VITE_USE_MSW=false early return + non-DEV early return. **Date:** 2026-04-18
- **Playwright 8/8 verdes.** TypeCheck + ESLint 0 errores. **Date:** 2026-04-18
- **Gotcha — ESLint @typescript-eslint/no-unused-vars:** Destructured `{ "Content-Type": _ct, ...rest }` no acepta vars con \_ en este ESLint config. Fix: extraer `deleteAuthHeaders()` local en useDeletePost sin Content-Type. **Date:** 2026-04-18
- **Gotcha — api.ts URL resolution:** `window.location.origin` en jsdom = `http://localhost:3000` → tests existentes con MSW node handlers en esa base no requieren cambios. **Date:** 2026-04-18

## Sprint 1 sem 2 día 0 — /posts scaffold + brief forms L2 (2026-04-18)

- **Brief Marta L2 entregado:** `admin/docs/brief-marta-design-system-l2.md` con Input/Textarea/Select/Toast — props API, estructura JSX, a11y, tests mínimos, deps pinned a instalar por Marta (@radix-ui/react-select@2.1.2, @radix-ui/react-toast@1.2.4). **Date:** 2026-04-18
- **/posts list scaffold:** PostsListPage con 4 estados (data/loading/empty/error), PostsTable accesible con Status badge por tipo, useQuery wrapper. 4 tests nuevos verdes. **Date:** 2026-04-18
- **Hash routing sin React Router:** `window.location.hash` → 'dashboard' | 'posts'. Sprint 2 añade React Router. **Date:** 2026-04-18
- **MSW handlers extendidos:** +2 posts dummy (status draft, pending) para demo realista. **Date:** 2026-04-18
- **Tests totales admin:** 54/54 verdes (4 nuevos + 50 previos sin regresiones). **Date:** 2026-04-18

## Sprint 1 sem 2 — demo spec extended: public site steps (2026-04-18)

- **4 new steps (11-14) added to `admin/e2e/demo/demo-30-04.spec.ts`:** after the editor hook-mutation steps, the spec navigates to `http://localhost:3000/` (public home), finds the `[DEMO]` post link, clicks into `/p/:slug`, and asserts the mutated title + "Powered by NodePress" footer. **Date:** 2026-04-18
- **STATUS pending-carmen:** Carmen's public handlers (`GET /` HTML home, `GET /p/:slug` post page) are not yet merged. Steps are commented with `pending-carmen` — do NOT run the full spec until Carmen merges. **Date:** 2026-04-18
- **playwright.demo.config.ts:** `baseURL` stays `:5173` (admin). Steps 11-14 use absolute `http://localhost:3000/` URLs — valid in Playwright. No cross-origin restriction applies to `page.goto`. CORS is permissive (`origin: true`). **Date:** 2026-04-18
- **Selector assumptions for Carmen's HTML:** home has `<h1>` with "NodePress", posts rendered as `<a>` links with title text, individual post has `<h1>` with full title. Adjust if Carmen's markup differs. **Date:** 2026-04-18

## Sprint 3 — Taxonomy selector (categories + tags) in post editor (2026-04-18)

- **WpTerm type added** to `admin/src/types/wp-post.ts`: `{ id, name, slug, taxonomy, count }`. **Date:** 2026-04-18
- **`fetchCategories()` + `fetchTags()`** added to `admin/src/lib/api.ts`. Use `apiUrl()` to respect VITE_API_URL env flag. **Date:** 2026-04-18
- **`TaxonomySelector.tsx`** created at `admin/src/components/TaxonomySelector.tsx`. Props: `taxonomy: "categories"|"tags"`, `selected: number[]`, `onChange: (ids: number[]) => void`, `disabled?: boolean`. React Query fetches terms; shows Spinner on load, "No X yet" empty state, checkbox list with count badges when loaded. Uses `<fieldset>/<legend>` for WCAG AA group semantics. **Date:** 2026-04-18
- **PostFormValues extended:** added `categories: number[]` and `tags: number[]` fields. **Date:** 2026-04-18
- **PostForm.tsx updated:** added `onCategoriesChange` and `onTagsChange` props; renders `<TaxonomySelector>` pair in a 2-col grid between Status and Content fields. **Date:** 2026-04-18
- **PostEditorPage.tsx updated:** EMPTY_FORM and serverValues include `categories: []` and `tags: []`. Added `handleCategoriesChange`/`handleTagsChange` handlers that update `localEdits`. **Date:** 2026-04-18
- **Backend TODO:** `POST /wp/v2/posts` and `PUT /wp/v2/posts/:id` do not persist categories/tags yet. Payload includes them but backend silently ignores. Documented in PostEditorPage serverValues comment. **Date:** 2026-04-18
- **MSW handlers extended:** `GET /wp/v2/categories` and `GET /wp/v2/tags` added to `admin/src/mocks/handlers.ts` with realistic mock data. **Date:** 2026-04-18
- **8 new tests** in `admin/src/components/__tests__/TaxonomySelector.test.tsx`: renders items, loading state, empty state (categories), onChange select, onChange deselect, tags render, tags empty state. **Date:** 2026-04-18
- **PostEditorPage.test.tsx updated:** added default empty handlers for `/wp/v2/categories` and `/wp/v2/tags` to MSW server — avoids unhandled-request stderr noise. **Date:** 2026-04-18
- **Tests: 95/95 green.** TypeCheck + ESLint: 0 errors. **Date:** 2026-04-18
- **Gotcha — TaxonomySelector in PostEditorPage tests:** TaxonomySelector mounts and fires taxonomy queries. Any test that renders PostEditorPage needs handlers for both taxonomy endpoints in its MSW server. Pattern: add them as default handlers with `HttpResponse.json([])`. **Date:** 2026-04-18

## Sprint 3 — Demo spec updated with taxonomy steps (2026-04-18)

- **`admin/e2e/demo/demo-30-04.spec.ts` updated:** 4 new Sprint 3 steps inserted between status-select and form submit, plus 1 step in edit mode. **Date:** 2026-04-18
- **New steps cover:** (a) both `<fieldset>` panels visible (`getByRole("group", { name: /categories|tags/ })`), (b) TaxonomySelector loads categories (wait for first checkbox inside fieldset), (c) check first category checkbox + assert checked, (d) after redirect to edit mode verify both panels still visible. **Date:** 2026-04-18
- **Selector pattern for TaxonomySelector:** `page.getByRole("group", { name: /categories/i })` — TaxonomySelector uses `<fieldset>/<legend>` which maps to `role="group"` in ARIA. **Date:** 2026-04-18
- **Backend TODO documented in spec:** `POST /wp/v2/posts` does not persist categories yet (#56 pending). UI interaction is the demo point — category id IS included in payload. **Date:** 2026-04-18
- **`record-demo-video.sh` unchanged** — no infrastructure changes needed. **Date:** 2026-04-18

## Sprint 1 sem 2 — Playwright demo video config + spec (2026-04-18)

- **`admin/playwright.demo.config.ts`** creado: config separada para grabación de video. `video: on`, `trace: on`, `fullyParallel: false`, `workers: 1`, `testDir: ./e2e/demo`. NO arranca webServer — requiere stack real corriendo. **Date:** 2026-04-18
- **`admin/e2e/demo/demo-30-04.spec.ts`** creado: flujo CTO completo — dashboard → posts list → create post → [DEMO] prefix en lista → footer en editor. Pacing relajado con waitForTimeout para video. **Date:** 2026-04-18
- **`playwright.config.ts` actualizado:** `testIgnore: ["**/demo/**"]` para que los 8 tests existentes no sean afectados por el directorio demo. **Date:** 2026-04-18
- **`scripts/record-demo-video.sh`** creado: script bash one-shot con Docker check, DB seed, backend + admin en bg, poll readiness, Playwright run, cleanup trap, reporte de ruta del video. **Date:** 2026-04-18
- **`docs/process/demo-30-04-plan.md`** actualizado: sección "Recorded video" con narración para outreach y tabla 3 momentos clave. **Date:** 2026-04-18
- **`admin/README.md`** actualizado: sección "Recording the demo video" con one-shot y manual (2 terminales). **Date:** 2026-04-18
- **`.gitignore`** actualizado: `playwright-report-demo/` añadido. **Date:** 2026-04-18
- **Gotcha — demo spec en main config:** `playwright.config.ts` sin `testIgnore` también recogía `e2e/demo/`. Fix: `testIgnore: ["**/demo/**"]`. **Date:** 2026-04-18
- **Selectores demo spec:** sidebar usa `href="/posts"` (pathname), no hash — navegación via `page.goto("/#posts")`. PostsTable Edit button tiene `aria-label="Edit post: <title>"`. **Date:** 2026-04-18
- **No regresiones:** 8 Playwright existentes + 119 Vitest todos verdes. **Date:** 2026-04-18

## Sprint 4 — #59 Theme engine HTML improvements (2026-04-18)

- **`renderSinglePost` mejorado:** añade `<meta name="viewport">`, `<nav>` con enlace ← Back to home, envuelve en `<main>`, `<footer>` con "Powered by NodePress". **Date:** 2026-04-18
- **`renderArchive` mejorado:** `<header>` con `<h1>NodePress</h1>` + tagline, `<footer>` con "Powered by NodePress", cada item incluye `<time datetime>` si `post.date` está en context, empty state muestra "No posts yet." (ya no `<ul></ul>`). **Date:** 2026-04-18
- **Tests ajustados:** aserciones actualizadas para nuevo HTML — `<h1>Posts</h1>` → `<h1>NodePress</h1>`, `<ul></ul>` → "No posts yet.", 3 tests nuevos (archive date, single nav/main/footer, single viewport meta). Total theme-engine: 8 tests verdes. **Date:** 2026-04-18
- **TypeCheck + ESLint:** 0 errores en packages/theme-engine. **Date:** 2026-04-18

## Sprint 5 — D-038 /plugins page (ICP-1 signal confirmed) (2026-04-18)

- **WpPlugin type added** to `admin/src/types/wp-post.ts`: `{ plugin, name, version, status, description, author }`. status: "active" | "inactive". **Date:** 2026-04-18
- **`usePluginsQuery`** created at `admin/src/features/plugins/hooks/usePluginsQuery.ts`. React Query wrapper for GET /wp/v2/plugins. queryKey: `["plugins-list"]`. **Date:** 2026-04-18
- **`PluginsPage.tsx`** created at `admin/src/features/plugins/PluginsPage.tsx`. 4 states (loading/error/empty/data). Optimistic enable/disable toggle via `statusOverrides` local state (Record keyed by plugin.plugin). Toast on toggle. No real mutation — Sprint 6. **Date:** 2026-04-18
- **MSW handler added:** `GET /wp/v2/plugins` with 3 mock plugins (2 active, 1 inactive) in `admin/src/mocks/handlers.ts`. **Date:** 2026-04-18
- **Router updated:** `{ path: "plugins", element: <PluginsPage /> }` added to AdminLayout children in `admin/src/router.tsx`. **Date:** 2026-04-18
- **Sidebar already had /plugins NavLink** — no change needed. **Date:** 2026-04-18
- **6 tests green** in `admin/src/features/plugins/__tests__/PluginsPage.test.tsx`: loading, empty, data render, error, disable toggle toast, enable toggle toast. Total: 101/101 admin tests. **Date:** 2026-04-18
- **Sprint 6 TODO:** wire real PATCH /wp/v2/plugins/:plugin endpoint for status toggle. Replace statusOverrides state with mutation. **Date:** 2026-04-18

## Sprint 7 — #84 Plugin marketplace UI (2026-04-19)

- **PluginsPage.tsx rewritten:** Sprint 7 full marketplace. Search bar (input + Search/Clear buttons, ?q= backend param), "Install plugin" header button, Uninstall button per plugin (hidden for status=uninstalled). StatusBadge component handles active/inactive/uninstalled. **Date:** 2026-04-19
- **WpPlugin.status extended:** `"active" | "inactive" | "uninstalled"` — Sprint 7 adds uninstalled per ADR-024. **Date:** 2026-04-19
- **usePluginsQuery updated:** accepts optional `search?: string` param, appends ?q= to path, queryKey includes search string `["plugins-list", search]`. **Date:** 2026-04-19
- **useInstallPlugin.ts created:** useMutation, POST /wp/v2/plugins with { slug, registryUrl? }, invalidates ["plugins-list"] on success. **Date:** 2026-04-19
- **useUninstallPlugin.ts created:** useMutation, DELETE /wp/v2/plugins/:slug (encodeURIComponent for slash slugs), invalidates ["plugins-list"] on success. **Date:** 2026-04-19
- **InstallModal.tsx created:** role=dialog, form with slug (required) + registryUrl (optional, type=url), error display (role=alert), loading/success/cancel flow. Calls useInstallPlugin. **Date:** 2026-04-19
- **MSW handlers updated:** GET /wp/v2/plugins now parses ?q= and filters; POST /wp/v2/plugins creates new plugin; DELETE /wp/v2/plugins/:slug marks status=uninstalled. **Date:** 2026-04-19
- **Gotcha — /install plugin/i regex:** matches "Uninstall plugin X" buttons too. Fix: use exact string `"Install plugin"` in getByRole name. **Date:** 2026-04-19
- **13 plugin tests green** (6 legacy in PluginsPage.test.tsx updated to Uninstall semantics + 7 new in PluginsPageMarketplace.test.tsx). 102 total admin tests pass. Pre-existing 3 test file failures (react-router-dom import in jsdom) unchanged — not caused by Sprint 7 work. **Date:** 2026-04-19
- **Router unchanged:** /plugins route was already registered in router.tsx from Sprint 5. No router changes needed. **Date:** 2026-04-19

## Sprint 4 — #65 Dashboard refinement (2026-04-18)

- **Indicador "Actualizado:"** añadido en DashboardPage sobre PostsList cuando hay datos. Usa `dataUpdatedAt` de React Query (timestamp) formateado con `toLocaleTimeString("es-ES")`. `aria-label="Last updated"` para a11y. **Date:** 2026-04-18
- **Texto en español:** el label de último update usa "Actualizado:" — primer texto en español deliberado en el dashboard (contexto: producto en español para la demo). **Date:** 2026-04-18
- **4 estados intactos:** no se tocó DashboardSkeleton, DashboardError, DashboardEmpty, PostsList — estructura preservada. **Date:** 2026-04-18
- **95/95 tests admin verdes.** TypeCheck + ESLint 0 errores. **Date:** 2026-04-18
