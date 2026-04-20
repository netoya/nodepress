# Especificación visual — Frontend público de NodePress

> Autora: Sofía (Head de Diseño) · Fecha: 2026-04-19 · Deadline implementación: 2026-04-21
>
> Destinataria: Marta (dev-frontend) — Paso A: CSS en `InlineThemeEngine`
>
> Fuente de tokens: `admin/src/styles/tokens.css` — Deep Violet, Inter, escala 4px.
> Los tokens se copian literalmente al `<style>` del HTML generado en Sprint 8,
> cuando se consoliden en un paquete compartido. Por ahora Marta los referencia
> con los mismos nombres `var(--...)`.

---

## 0. Principios de este documento

- Todos los valores de color son **nombres de token**, no hexadecimales. Si el token no existe,
  se indica el valor literal y se crea el token en Sprint 9.
- Todos los valores de tamaño son **nombres de token** (`--font-size-*`, `--space-*`).
- Los snippets CSS son **orientativos para la comprensión**; Marta decide la estructura exacta.
- WCAG AA es obligatorio. Ningún par de colores aprobado tiene ratio < 4.5:1 en texto normal,
  3:1 en texto grande (≥ 18px regular o ≥ 14px bold).
- Dark mode queda fuera de scope — ver sección 8.

---

## 1. Tipografía

### Familia

```css
font-family: var(--font-family-ui);   /* "Inter", fallbacks sistema */
font-family: var(--font-family-mono); /* "JetBrains Mono" — solo para <code>/<pre> */
```

Inter debe cargarse vía Google Fonts (`weights=400;500;600;700`) en el `<head>` generado
por `InlineThemeEngine`. Sin la carga de la fuente, el diseño cae en sistema.

### Escala tipográfica — frontend público

| Elemento              | Token tamaño           | Token peso              | Line-height                   | Notas                               |
|-----------------------|------------------------|-------------------------|-------------------------------|-------------------------------------|
| `h1` (título artículo)| `--font-size-3xl`      | `--font-weight-bold`    | `--line-height-tight` (1.25)  | Un h1 por página, sin margin-bottom excesivo |
| `h2` dentro de content| `--font-size-xl`       | `--font-weight-semibold`| `--line-height-snug` (1.375)  |                                     |
| `h3` dentro de content| `--font-size-lg`       | `--font-weight-semibold`| `--line-height-snug`          |                                     |
| `p` (cuerpo)          | `--font-size-md`       | `--font-weight-regular` | `--line-height-relaxed` (1.625)| Mínimo 1.6 para lectura confortable |
| `caption` / `.meta`   | `--font-size-sm`       | `--font-weight-regular` | `--line-height-normal` (1.5)  | Fechas, autor, etiquetas            |
| `code` inline         | `--font-size-sm`       | `--font-weight-regular` | heredado del párrafo          | Fondo `--color-neutral-100`         |
| `pre` / bloque código | `--font-size-sm`       | `--font-weight-regular` | `--line-height-normal`        | Scroll horizontal, fondo `--color-neutral-100` |

> **Regla de lectura:** El cuerpo del artículo usa `--font-size-md` (1.125rem = 18px) con
> `--line-height-relaxed` (1.625). Este es el tamaño mínimo aprobado para artículos largos.
> No bajar a `--font-size-base` (16px) sin justificación explícita.

---

## 2. Columna de lectura

```css
/* Contenedor raíz del artículo y del archive */
.np-page {
  max-width: 720px;      /* ~65ch con font-size-md — cómodo para lectura */
  margin-inline: auto;   /* centrado */
  padding-inline: var(--space-6);   /* 24px — desktop */
}

@media (max-width: 640px) {
  .np-page {
    padding-inline: var(--space-4); /* 16px — mobile, cumple BREATHING del checklist */
  }
}
```

**Decisión de ancho:** 720px cubre el 95% de monitores habituales sin líneas de texto
demasiado largas. Por encima de ~75ch la lectura cansa. Esta columna produce ~60–65ch
con `--font-size-md`.

**Padding lateral mínimo:**
- Desktop: `--space-6` (1.5rem / 24px)
- Mobile (< 640px): `--space-4` (1rem / 16px)

El contenido nunca debe tocar los bordes del viewport — cumple CONTAINMENT del checklist.

---

## 3. Paleta de colores — mapeo a usos públicos

La paleta es Deep Violet (primario) + Slate Violet (neutros). El frontend público
es **modo claro siempre** (dark mode → Sprint 8).

| Uso                         | Token                        | Valor de referencia   | Ratio AA       |
|-----------------------------|------------------------------|-----------------------|----------------|
| Fondo de página (`<html>`)  | `--color-neutral-50`         | `#f8f7ff`             | —              |
| Fondo del contenedor `.np-page` | `--color-neutral-0`     | `#ffffff`             | —              |
| Texto principal (body, h1…) | `--color-neutral-800`        | `#1e1d35`             | 15.1:1 sobre blanco ✓ |
| Texto secundario (meta, caption) | `--color-neutral-500`  | `#6e6b8a`             | 4.6:1 sobre blanco ✓ |
| Links en cuerpo             | `--color-primary-600`        | `#4a3ce4`             | 5.8:1 sobre blanco ✓ |
| Links hover                 | `--color-primary-700`        | `#3b2ec0`             | 7.5:1 sobre blanco ✓ |
| Links visitados             | `--color-primary-800`        | `#2d2396`             | — (opcional)   |
| Bordes de separadores       | `--color-neutral-200`        | `#e4e2f0`             | decorativo     |
| Fondo `<code>` inline       | `--color-neutral-100`        | `#f0eff8`             | decorativo     |
| Borde `<blockquote>`        | `--color-primary-300`        | `#9b91f3`             | decorativo     |
| Fondo nota `[su_note]`      | `--color-primary-50`         | `#f0effe`             | decorativo     |
| Borde nota `[su_note]`      | `--color-primary-200`        | `#c2bcf8`             | decorativo     |

> **Links:** Se usa `--color-primary-600` (no `--color-primary-500`) porque el 500
> (#5B4CF5) cae justo en el límite 4.5:1 y no da margen de seguridad.
> El 600 pasa holgadamente.

### Color de foco (accesibilidad teclado)

```css
:focus-visible {
  outline: 2px solid var(--color-primary-500);
  outline-offset: 2px;
  box-shadow: var(--shadow-focus);
}
```

Todos los elementos interactivos (links, botones) deben tener `:focus-visible` visible.
No se acepta `outline: none` sin alternativa equivalente.

---

## 4. Shortcodes dentro del artículo

### 4.1 `[footnote]` — superíndice y sección al pie

El HTML generado por el pilot (`footnotes.ts`) produce:

- En el texto: `<sup id="fnref-N"><a href="#fn-N" class="footnote-ref">N</a></sup>`
- Al final: `<div class="footnotes"><ol><li id="fn-N">texto <a class="footnote-backref">↩</a></li></ol></div>`

**Spec visual:**

```
sup.footnote-ref a
  - color: --color-primary-600
  - sin subrayado por defecto (el superíndice ya distingue el link)
  - :hover → subrayado
  - font-size: 0.75em (relativo al párrafo contenedor, no token absoluto)

.footnotes
  - separador visual superior: 1px solid --color-neutral-200
  - margin-top: --space-8 (2rem) desde el final del artículo
  - padding-top: --space-4 (1rem)
  - font-size: --font-size-sm
  - color: --color-neutral-500
  - ol { padding-left: --space-6 }

.footnote-backref
  - color: --color-neutral-400
  - :hover → --color-primary-600
  - sin subrayado por defecto
```

**Jerarquía:** Las notas al pie son contenido auxiliar. Visualmente deben pesar menos
que el cuerpo del artículo (tamaño menor, color más apagado). El separador crea
el límite entre contenido principal y anotaciones.

### 4.2 `[su_note]` — caja destacada

Shortcode de SiteOrigin Ultimate. Genera un `<div>` con texto destacado.

**Spec visual:**

```
.su-note   (o clase que genere el shortcode)
  - background: --color-primary-50
  - border-left: 4px solid --color-primary-400
  - border-radius: --radius-md (6px) — excepto lado izquierdo
  - padding: --space-4 (1rem) --space-6 (1.5rem)
  - margin-block: --space-6 (1.5rem)
  - font-size: --font-size-base
  - color: --color-neutral-800
  - line-height: --line-height-relaxed
```

El borde izquierdo violeta actúa como acento visual (patrón blockquote/callout
ampliamente reconocido). La caja respira dentro del artículo gracias al
`margin-block`.

**Alternativa si el shortcode no admite clase CSS:** Marta aplica el selector
que corresponda al HTML real generado por `[su_note]`. La spec de apariencia no cambia.

### 4.3 `[su_button]` — botón

**Spec visual:**

```
.su-button  (o <a> generado por el shortcode)
  - display: inline-flex; align-items: center; gap: --space-2
  - background: --color-primary-500
  - color: --color-neutral-0
  - border-radius: --radius-full (pill — más amable que rectangular)
  - padding-block: --space-2 (0.5rem)
  - padding-inline: --space-6 (1.5rem)
  - font-size: --font-size-sm
  - font-weight: --font-weight-semibold
  - text-decoration: none
  - transition: background --transition-base

  :hover
    background: --color-primary-600

  :focus-visible
    outline: 2px solid --color-primary-500
    outline-offset: 2px
    box-shadow: --shadow-focus

  :active
    background: --color-primary-700
```

Ratio de contraste texto/fondo: blanco (#fff) sobre `--color-primary-500` (#5B4CF5) = 4.56:1 ✓ (WCAG AA).

### 4.4 `<blockquote>` nativo de WordPress

```
blockquote
  - border-left: 3px solid --color-primary-300
  - margin-inline: 0
  - padding-left: --space-6 (1.5rem)
  - color: --color-neutral-600
  - font-style: italic
  - margin-block: --space-6
```

---

## 5. Archive vacío — estado empty state (`/` sin posts)

El HTML actual genera `<p>No posts yet.</p>`. Necesita dignidad visual.

**Estructura HTML esperada** (Marta implementa en `renderArchive`):

```html
<div class="np-empty-state">
  <p class="np-empty-icon" aria-hidden="true">📭</p>
  <h2>Aún no hay publicaciones</h2>
  <p>Cuando publiques tu primer artículo aparecerá aquí.</p>
</div>
```

**Spec visual:**

```
.np-empty-state
  - text-align: center
  - padding-block: --space-16 (4rem)
  - color: --color-neutral-500

.np-empty-icon
  - font-size: 3rem
  - margin-bottom: --space-4
  - line-height: 1

.np-empty-state h2
  - font-size: --font-size-xl
  - font-weight: --font-weight-semibold
  - color: --color-neutral-700
  - margin-bottom: --space-2

.np-empty-state p (subtítulo)
  - font-size: --font-size-base
  - color: --color-neutral-400
```

**Principio:** El estado vacío no debe parecer un error. El tono es neutro-amable.
La jerarquía h2 > p guía el ojo sin drama.

---

## 6. Página 404

El HTML actual (en `handlers.ts`) usa colores hardcodeados fuera de paleta (`#ccc`, `#666`, `#0066cc`).
Deben reemplazarse con tokens.

**Estructura visual:**

```
.not-found
  - text-align: center
  - padding-block: --space-16 --space-12

.not-found .np-404-number
  - font-size: --font-size-3xl  (2.25rem — grande pero no exagerado)
  - font-weight: --font-weight-bold
  - color: --color-neutral-300  (apagado — el número no es el mensaje)
  - letter-spacing: --letter-spacing-tight
  - margin-bottom: --space-4

.not-found h2
  - font-size: --font-size-xl
  - font-weight: --font-weight-semibold
  - color: --color-neutral-700
  - margin-bottom: --space-2

.not-found p
  - font-size: --font-size-base
  - color: --color-neutral-500
  - margin-bottom: --space-6

.not-found a  (link "← Volver al inicio")
  - color: --color-primary-600
  - font-weight: --font-weight-medium
  - text-decoration: none
  - :hover → underline
```

**Mensaje sugerido:**
```
404
No hemos encontrado esta página.
← Volver al inicio
```

Breve. Sin jerga técnica. El link a home es el único CTA de recuperación.

---

## 7. Estructura global de página — nav, header, footer

### Nav (artículo `/p/:slug`)

El nav actual es `<nav><a href="/">← Back to home</a></nav>`. Sin CSS propio.

```
nav
  - padding-block: --space-4
  - margin-bottom: --space-8
  - border-bottom: 1px solid --color-neutral-200

nav a
  - font-size: --font-size-sm
  - color: --color-neutral-500
  - text-decoration: none
  - :hover → color: --color-primary-600
```

El nav es orientación, no protagonista. Color apagado, tamaño pequeño.

### Header (archive `/`)

```
header
  - padding-block: --space-8 --space-6
  - border-bottom: 1px solid --color-neutral-200
  - margin-bottom: --space-10

header h1  (marca "NodePress")
  - font-size: --font-size-2xl
  - font-weight: --font-weight-bold
  - color: --color-neutral-800
  - margin-bottom: --space-1

header p  (tagline)
  - font-size: --font-size-sm
  - color: --color-neutral-400
```

### Footer (ambas vistas)

```
footer
  - margin-top: --space-12
  - padding-top: --space-6
  - border-top: 1px solid --color-neutral-200
  - text-align: center
  - font-size: --font-size-xs
  - color: --color-neutral-400
```

---

## 8. Dark mode — fuera de scope (Sprint 8)

El dark mode queda **explícitamente excluido** de esta spec y del Paso A.

**Razón:** Los tokens semánticos de modo oscuro están definidos en `tokens.css`
bajo `[data-theme="dark"]` pero no están validados para el frontend público
(fueron diseñados para el admin panel). Aplicarlos sin validación visual produciría
contraste incorrecto.

**Tarea pendiente Sprint 8:**
- Validar ratio de contraste de todos los pares de tokens dark en contexto de lectura
- Añadir `<meta name="color-scheme" content="light dark">` cuando dark mode esté listo
- La implementación debe usar `prefers-color-scheme` en media query, no `[data-theme]`
  (el admin usa atributo JS; el público usa preferencia del sistema)

---

## 9. Checklist de implementación para Marta

Antes de entregar el Paso A para review visual, verificar:

- [ ] Inter cargada desde Google Fonts en el `<head>` del HTML generado
- [ ] `max-width: 720px` + `margin-inline: auto` en el contenedor raíz
- [ ] `padding-inline` ≥ `--space-4` en mobile, ≥ `--space-6` en desktop
- [ ] `line-height` del cuerpo = `--line-height-relaxed` (1.625)
- [ ] Links usan `--color-primary-600` (no `#0066cc` del inline CSS actual)
- [ ] `:focus-visible` visible en todos los links y botones
- [ ] `.footnotes` separado del artículo con borde y espaciado proporcional
- [ ] Estado empty state implementado en `renderArchive` (no sólo `<p>No posts yet.</p>`)
- [ ] 404 sin colores hardcodeados (`#ccc`, `#666`, `#0066cc` → tokens)
- [ ] Screenshot de `/`, `/p/:slug` (con footnotes) y URL 404 entregado a Sofía antes del merge

**Gate de merge:** Sofía no aprueba el Paso A sin ver render real de las tres vistas.
El screenshot es obligatorio — la review de código no sustituye la review visual.

---

## 10. Referencias de diseño

- Design tokens: `admin/src/styles/tokens.css`
- Tokens documentados: `docs/design/tokens.md`
- Wireframes dashboard (referencia de lenguaje visual): `docs/design/wireframes-dashboard.md`
- Pilot footnotes (HTML generado): `packages/server/src/bridge/pilots/footnotes.ts`
- ThemeEngine actual: `packages/theme-engine/src/index.ts`
- Handler público (HTML 404): `packages/server/src/routes/public/handlers.ts`
