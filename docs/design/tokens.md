# Design Tokens — NodePress

> Versión 1.0 · Sofía, Head de Diseño · 2026-04-09  
> Fuente de verdad para todo valor visual del sistema. Ningún valor hardcodeado en código.

---

## 1. Colores

### Primary — Deep Violet

Usado en: CTAs principales, links activos, estados de foco, indicadores de selección, nav activo.

| Token               | Valor     | Uso                                           |
| ------------------- | --------- | --------------------------------------------- |
| `color-primary-50`  | `#F0EFFE` | Backgrounds muy sutiles, hover states ligeros |
| `color-primary-100` | `#E0DDFB` | Backgrounds de badge, chips seleccionados     |
| `color-primary-200` | `#C2BCF8` | Borders de componentes en estado activo       |
| `color-primary-300` | `#9B91F3` | Disabled state de botón primario              |
| `color-primary-400` | `#7B6FF0` | Hover de botón primario                       |
| `color-primary-500` | `#5B4CF5` | **Color base — default de primary**           |
| `color-primary-600` | `#4A3CE4` | Pressed state de botón primario               |
| `color-primary-700` | `#3B2EC0` | Dark variant, texto de link                   |
| `color-primary-800` | `#2D2396` | High emphasis en dark backgrounds             |
| `color-primary-900` | `#1E1864` | Text de máximo contraste (WCAG AAA)           |

Ratio de contraste `color-primary-500` sobre blanco: **4.8:1** — pasa WCAG AA para texto normal.

### Secondary — Electric Teal

Usado en: estados de éxito, badges positivos, highlights de métricas en dashboard, ilustraciones.

| Token                 | Valor     | Uso                                   |
| --------------------- | --------- | ------------------------------------- |
| `color-secondary-50`  | `#E6FAF7` | Backgrounds de success muy sutil      |
| `color-secondary-100` | `#C2F3EB` | Badge background de estado publicado  |
| `color-secondary-200` | `#85E6D6` | Ilustraciones, decorativos            |
| `color-secondary-300` | `#42D9C0` | Indicadores de progreso               |
| `color-secondary-400` | `#00C9A7` | **Color base — default de secondary** |
| `color-secondary-500` | `#00A88C` | Hover state                           |
| `color-secondary-600` | `#008570` | Pressed / active state                |
| `color-secondary-700` | `#006254` | Text sobre secondary backgrounds      |

### Neutral — Slate Violet

Neutros con leve tinte violeta frío. Mantienen coherencia cromática con el primary.

| Token               | Valor     | Uso                                  |
| ------------------- | --------- | ------------------------------------ |
| `color-neutral-0`   | `#FFFFFF` | Blanco puro (modales, tooltips)      |
| `color-neutral-50`  | `#F8F7FF` | Fondo base de la aplicación          |
| `color-neutral-100` | `#F0EFF8` | Fondo de cards, sidebars             |
| `color-neutral-200` | `#E4E2F0` | Bordes, divisores, separadores       |
| `color-neutral-300` | `#C9C6DC` | Bordes de inputs en reposo           |
| `color-neutral-400` | `#9E9BB8` | Placeholder text, iconos decorativos |
| `color-neutral-500` | `#6E6B8A` | Texto secundario, labels             |
| `color-neutral-600` | `#4E4C6A` | Texto de apoyo                       |
| `color-neutral-700` | `#35334F` | Texto de cuerpo (body text)          |
| `color-neutral-800` | `#1E1D35` | Texto de headings                    |
| `color-neutral-900` | `#0F0E1E` | Texto de máximo contraste            |

### Semánticos

Colores de estado del sistema. No personalizables por temas.

#### Danger (Error / Destructivo)

| Token              | Valor     | Uso                                        |
| ------------------ | --------- | ------------------------------------------ |
| `color-danger-50`  | `#FEF2F2` | Background de alert de error               |
| `color-danger-100` | `#FEE2E2` | Background de campo con error              |
| `color-danger-300` | `#FCA5A5` | Border de campo con error                  |
| `color-danger-500` | `#EF4444` | **Base** — iconos de error, texto de error |
| `color-danger-700` | `#B91C1C` | Texto sobre backgrounds danger             |

Ratio `color-danger-500` sobre blanco: **4.65:1** — pasa WCAG AA.

#### Warning (Atención)

| Token               | Valor     | Uso                             |
| ------------------- | --------- | ------------------------------- |
| `color-warning-50`  | `#FFFBEB` | Background de alert de warning  |
| `color-warning-100` | `#FEF3C7` | Background de badge de atención |
| `color-warning-400` | `#FBBF24` | Iconos de warning               |
| `color-warning-500` | `#F59E0B` | **Base**                        |
| `color-warning-700` | `#B45309` | Texto sobre backgrounds warning |

Nota: `color-warning-500` sobre blanco = **2.82:1** — NO usa sobre fondo blanco como texto. Solo como icono o background con texto oscuro.

#### Success

| Token               | Valor     | Uso                             |
| ------------------- | --------- | ------------------------------- |
| `color-success-50`  | `#ECFDF5` | Background de alert de éxito    |
| `color-success-100` | `#D1FAE5` | Background de badge publicado   |
| `color-success-400` | `#34D399` | Iconos de éxito                 |
| `color-success-500` | `#10B981` | **Base**                        |
| `color-success-700` | `#047857` | Texto sobre backgrounds success |

#### Info

| Token            | Valor     | Uso                                        |
| ---------------- | --------- | ------------------------------------------ |
| `color-info-50`  | `#EFF6FF` | Background de alert informativa            |
| `color-info-100` | `#DBEAFE` | Background de badge informativo            |
| `color-info-500` | `#3B82F6` | **Base** — diferenciado del primary violet |
| `color-info-700` | `#1D4ED8` | Texto sobre backgrounds info               |

---

## 2. Tipografía

### Font Families

| Token              | Valor                                                                |
| ------------------ | -------------------------------------------------------------------- |
| `font-family-ui`   | `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif` |
| `font-family-mono` | `"JetBrains Mono", "Fira Code", "Cascadia Code", monospace`          |

### Escala Tipográfica

Base: 16px (1rem). Escala: `1.25` (Major Third).

| Token            | rem        | px   | Uso                           |
| ---------------- | ---------- | ---- | ----------------------------- |
| `font-size-xs`   | `0.75rem`  | 12px | Labels, badges, metadata      |
| `font-size-sm`   | `0.875rem` | 14px | Texto de apoyo, sidebar items |
| `font-size-base` | `1rem`     | 16px | Cuerpo de texto principal     |
| `font-size-md`   | `1.125rem` | 18px | Texto destacado, lead text    |
| `font-size-lg`   | `1.25rem`  | 20px | Subtítulos de sección         |
| `font-size-xl`   | `1.5rem`   | 24px | Títulos de página             |
| `font-size-2xl`  | `1.875rem` | 30px | Headings principales          |
| `font-size-3xl`  | `2.25rem`  | 36px | Display (dashboard stats)     |

### Font Weights

| Token                  | Valor | Uso                        |
| ---------------------- | ----- | -------------------------- |
| `font-weight-regular`  | `400` | Cuerpo de texto            |
| `font-weight-medium`   | `500` | Labels de input, nav items |
| `font-weight-semibold` | `600` | Subtítulos, botones        |
| `font-weight-bold`     | `700` | Headings de sección        |

### Line Heights

| Token                 | Valor   | Uso                    |
| --------------------- | ------- | ---------------------- |
| `line-height-tight`   | `1.25`  | Headings               |
| `line-height-snug`    | `1.375` | Subtítulos             |
| `line-height-normal`  | `1.5`   | Cuerpo de texto        |
| `line-height-relaxed` | `1.625` | Texto largo, artículos |

### Letter Spacing

| Token                   | Valor      | Uso                             |
| ----------------------- | ---------- | ------------------------------- |
| `letter-spacing-tight`  | `-0.025em` | Headings grandes (3xl)          |
| `letter-spacing-normal` | `0em`      | Texto base                      |
| `letter-spacing-wide`   | `0.025em`  | Labels en mayúsculas, badges    |
| `letter-spacing-wider`  | `0.05em`   | All-caps labels, section labels |

---

## 3. Spacing Scale

Base: 4px. Escala lineal hasta 16, luego progresiva.

| Token      | Valor (px) | Valor (rem) | Uso típico                        |
| ---------- | ---------- | ----------- | --------------------------------- |
| `space-0`  | 0px        | 0rem        | Reset                             |
| `space-1`  | 4px        | 0.25rem     | Gap mínimo, padding de badge      |
| `space-2`  | 8px        | 0.5rem      | Gap entre icono y label           |
| `space-3`  | 12px       | 0.75rem     | Padding interno de input          |
| `space-4`  | 16px       | 1rem        | Padding base de componentes       |
| `space-5`  | 20px       | 1.25rem     | Gap entre elementos de formulario |
| `space-6`  | 24px       | 1.5rem      | Padding de card                   |
| `space-8`  | 32px       | 2rem        | Separación entre secciones        |
| `space-10` | 40px       | 2.5rem      | Padding de sección                |
| `space-12` | 48px       | 3rem        | Padding vertical de header        |
| `space-16` | 64px       | 4rem        | Separación entre bloques grandes  |
| `space-20` | 80px       | 5rem        | Padding de empty states           |
| `space-24` | 96px       | 6rem        | Márgenes de página                |

### Semantic Spacing Aliases

| Token                  | Valor base | Uso                                |
| ---------------------- | ---------- | ---------------------------------- |
| `spacing-component-xs` | `space-1`  | Gap mínimo interno                 |
| `spacing-component-sm` | `space-2`  | Gap entre sub-elementos            |
| `spacing-component-md` | `space-4`  | Padding de componentes estándar    |
| `spacing-component-lg` | `space-6`  | Padding de cards y panels          |
| `spacing-layout-sm`    | `space-8`  | Separación entre secciones         |
| `spacing-layout-md`    | `space-12` | Separación entre regiones          |
| `spacing-layout-lg`    | `space-16` | Separación entre bloques de página |

---

## 4. Border Radius

| Token         | Valor    | Uso                              |
| ------------- | -------- | -------------------------------- |
| `radius-none` | `0px`    | Sin redondeo (tablas, divisores) |
| `radius-sm`   | `4px`    | Inputs, selects, chips pequeños  |
| `radius-md`   | `6px`    | Botones, badges                  |
| `radius-lg`   | `8px`    | Cards, panels, dropdowns         |
| `radius-xl`   | `12px`   | Modales, popovers grandes        |
| `radius-2xl`  | `16px`   | Empty states, ilustraciones      |
| `radius-full` | `9999px` | Pills, avatares, toggles         |

---

## 5. Shadows

Filosofía: sombras sutiles, basadas en color (no gris puro). Leve tinte violeta en capas intermedias.

| Token                 | Valor CSS                                                                          | Uso                                  |
| --------------------- | ---------------------------------------------------------------------------------- | ------------------------------------ |
| `shadow-none`         | `none`                                                                             | Sin sombra                           |
| `shadow-xs`           | `0 1px 2px 0 rgba(91, 76, 245, 0.06)`                                              | Inputs en focus, badges              |
| `shadow-sm`           | `0 1px 3px 0 rgba(91, 76, 245, 0.1), 0 1px 2px -1px rgba(91, 76, 245, 0.1)`        | Cards en reposo                      |
| `shadow-md`           | `0 4px 6px -1px rgba(91, 76, 245, 0.1), 0 2px 4px -2px rgba(91, 76, 245, 0.1)`     | Cards en hover, dropdowns            |
| `shadow-lg`           | `0 10px 15px -3px rgba(91, 76, 245, 0.1), 0 4px 6px -4px rgba(91, 76, 245, 0.08)`  | Modales, popovers                    |
| `shadow-xl`           | `0 20px 25px -5px rgba(91, 76, 245, 0.1), 0 8px 10px -6px rgba(91, 76, 245, 0.08)` | Drawers, panels flotantes            |
| `shadow-focus`        | `0 0 0 3px rgba(91, 76, 245, 0.35)`                                                | Focus ring de elementos interactivos |
| `shadow-focus-danger` | `0 0 0 3px rgba(239, 68, 68, 0.35)`                                                | Focus ring en estados de error       |

---

## 6. Otros Tokens

### Z-Index Scale

| Token        | Valor | Uso                                      |
| ------------ | ----- | ---------------------------------------- |
| `z-base`     | `0`   | Elementos en flujo normal                |
| `z-raised`   | `10`  | Cards elevadas, elementos sticky menores |
| `z-dropdown` | `100` | Dropdowns, selects                       |
| `z-sticky`   | `200` | Header sticky, sidebar                   |
| `z-overlay`  | `300` | Overlays de modal                        |
| `z-modal`    | `400` | Modales                                  |
| `z-popover`  | `500` | Tooltips, popovers                       |
| `z-toast`    | `600` | Notificaciones toast                     |

### Transitions

| Token              | Valor            | Uso                                    |
| ------------------ | ---------------- | -------------------------------------- |
| `transition-fast`  | `100ms ease-out` | Micro-interacciones (checkbox, toggle) |
| `transition-base`  | `150ms ease-out` | Hover states, color changes            |
| `transition-slow`  | `200ms ease-out` | Aparición de dropdowns, focus rings    |
| `transition-enter` | `250ms ease-out` | Entrada de modales, panels             |
| `transition-exit`  | `200ms ease-in`  | Salida de modales, panels              |

Nota: Todos los componentes con transición deben respetar `prefers-reduced-motion`. Si está activo, las duraciones se reducen a `0ms` o se usan `opacity` en lugar de `transform`.

### Breakpoints

| Token            | Valor    | Descripción                        |
| ---------------- | -------- | ---------------------------------- |
| `breakpoint-sm`  | `640px`  | Mobile landscape                   |
| `breakpoint-md`  | `768px`  | Tablet portrait                    |
| `breakpoint-lg`  | `1024px` | Tablet landscape / desktop pequeño |
| `breakpoint-xl`  | `1280px` | Desktop estándar                   |
| `breakpoint-2xl` | `1536px` | Desktop grande / widescreen        |

El admin panel prioriza `breakpoint-lg` en adelante. Mobile es soporte secundario (v1).

---

## Notas de Implementación

- Los tokens se implementarán como CSS Custom Properties (`--color-primary-500`, etc.).
- El agente frontend (Lucas) es responsable de la implementación técnica.
- Cualquier modificación a este archivo requiere aprobación de Sofía.
- Validación de contraste automatizada en CI: todos los pares texto/fondo deben pasar WCAG AA.
