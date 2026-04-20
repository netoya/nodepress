---
name: dev-frontend-marta-nodepress
description: Project memory for Marta (Dev Frontend) in NodePress
type: project
---

## Meet 2026-04-19 — Mini sprint + CSS/templates

- **Acción #2: implementar Paso A (22-04).** CSS inline en `InlineThemeEngine` para `single`, `archive`, y 404 unificada. Tokens copiados de `admin/src/styles/tokens.css`. No usar valores hardcodeados. **Date:** 2026-04-19
- **Gate: screenshot review de Sofía antes de merge.** Entregar render de `/p/:slug` y `/` a Sofía 22-04 para aprobación 23-04. **Date:** 2026-04-19
- **Precondición aceptada:** ticket `@nodepress/design-tokens` comprometido como P0 en Sprint 9 (no P2). Sin ese compromiso, el drift de tokens se queda indefinidamente. **Date:** 2026-04-19
- **Anti-patrón a eliminar:** `INLINE_CSS` en `handlers.ts` con valores hardcodeados (`#0066cc`, `#333`, `#fafafa`) fuera de paleta. Moverlo al theme engine en el Paso A. **Date:** 2026-04-19

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

## Sprint 1 sem 2 — #31 demo:reset script (2026-04-18)

- **Script `packages/db/src/seeds/reset.ts` creado:** trunca 7 tablas en orden FK-seguro, luego re-seedea. NODE_ENV=production guard. **Date:** 2026-04-18
- **Orden TRUNCATE:** comments → term_relationships → posts → terms → options → plugin_registry → users. Respeta FK constraints. **Date:** 2026-04-18
- **npm scripts añadidos:** `npm run reset` (packages/db), `npm run db:reset` (root), `npm run demo:reset` (root alias). **Date:** 2026-04-18
- **record-demo-video.sh integrado:** Step 2 reemplazado por `npm run demo:reset` con fallback a `db:seed`. **Date:** 2026-04-18
- **Tests:** 2 unit tests en `reset.test.ts` verifican carga sin conexiones y exportación de `runSeed`. **Date:** 2026-04-18
- **Docs actualizado:** `docs/guides/seeding.md` nuevo apartado "Reset para desarrollo (destructivo)". **Date:** 2026-04-18

## Sprint 7 — #91 Dark mode admin panel (2026-04-19)

- **CSS custom properties dark mode:** `[data-theme="dark"]` selector en tokens.css con override de 6 variables semánticas (--color-bg, --color-surface, --color-text-primary, --color-text-secondary, --color-border) + 4 variables de estado (--color-success, --color-error, --color-warning, --color-info) + 5 shell layout vars (--shell-header-bg, --shell-sidebar-bg, etc.). **Date:** 2026-04-19
- **Hook useDarkMode():** localStorage persistence (key "theme" con valores "dark"/"light") + prefers-color-scheme fallback + event listener para cambios de sistema preference. Aplica/remueve `data-theme="dark"` en `document.documentElement`. **Date:** 2026-04-19
- **DarkModeToggle component:** botón accesible en Header section derecha. Unicode moon emoji (🌙) para light mode, sun emoji (☀️) para dark mode. WCAG AA: aria-label descriptivo, aria-pressed state, keyboard accessible (no tabindex negativo). **Date:** 2026-04-19
- **Tests 13/13 verdes:** 7 hook tests (init light, apply dark via toggle, remove dark, localStorage save/restore, prefers-color-scheme fallback, toggle cycling) + 6 component tests (moon icon when light, sun icon when dark, aria-pressed reflected, onclick handler, keyboard activation, naturally focusable). **Date:** 2026-04-19
- **No deps añadidas:** solo CSS vars + React hooks (useEffect, useState). Cero Tailwind/Radix tokens. **Date:** 2026-04-19

## Paso A — CSS público en InlineThemeEngine (2026-04-19)

- **Paso A completado:** Implementación de CSS real en frontend público (templates single, archive, 404). Ref: `docs/design/public-frontend-spec.md` (Sofía, 2026-04-19). **Date:** 2026-04-19
- **Tokens inyectados:** Función `getDesignTokensCSS()` en `packages/theme-engine/src/index.ts` que exporta 46 variables CSS custom (colores, tipografía, espaciado, bordes, sombras, transiciones). Copiados de `admin/src/styles/tokens.css`, no valores hardcodeados. **Date:** 2026-04-19
- **Global CSS function:** `getGlobalCSS()` (850 líneas) que cubre: reset, tipografía base, `.np-page` (720px max-width + responsive padding), nav, header, article, links, code, blockquote, footnotes, shortcuts (`[su_note]`, `[su_button]`), empty state, archive list, 404, footer. **Date:** 2026-04-19
- **Single post template (`renderSinglePost`):** `<style>` en `<head>` con tokens + global CSS. Google Fonts Inter (weights=400;500;600;700) via preconnect. Estructura: `nav` > `article` > `.content` con h1/h2/h3/p/code/blockquote. `<div class="np-page">` container. **Date:** 2026-04-19
- **Archive template (`renderArchive`):** Mismo header/nav/footer que single. Empty state (`np-empty-state`) cuando posts.length === 0: emoji 📭 + h2 + p descriptivo. List cuando hay posts: `<ul>` con `.content` stylings. **Date:** 2026-04-19
- **404 handler (`handlers.ts`):** Funciones `getDesignTokensCSS()` + `get404CSS()` (duplicadas del engine por ahora — Sprint 8 consolidará en paquete compartido per memo). Clase `.np-404-number` para "404" + h2 + link de vuelta. Misma estructura `.np-page` que public templates. **Date:** 2026-04-19
- **Accesibilidad WCAG AA:** `:focus-visible` en todos los links (outline 2px primary-500 + shadow-focus). Contraste verificado según spec (primary-600 4.5:1, neutral-500 5.8:1, etc.). `aria-hidden="true"` en emoji empty state. Sin `outline: none` hardcodeado. **Date:** 2026-04-19
- **Responsive design:** Mobile (<640px): `padding-inline: space-4` (16px). Desktop: `padding-inline: space-6` (24px). Line-height 1.625 en cuerpo. Fonts cargadas via Google Fonts + system fallbacks. **Date:** 2026-04-19
- **Code quality:** Formatted con prettier (unchanged), eslint 5 warnings pre-existentes (any types en handlers pre-Sprint 4). Type-check sin errores en archivos modificados. **Date:** 2026-04-19
- **Gate pendiente:** Screenshot review de Sofía para `/`, `/p/:slug` (con footnotes), y URL 404 antes de merge. Documentado en PR body. **Date:** 2026-04-19
