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
