# Brief — Design System Components Base
**Asignado a:** Marta (dev-frontend)
**Creado por:** Lucas (lead-frontend)
**Fecha:** 2026-04-17
**Sprint:** 1 — Semana 1
**Ticket de referencia:** #24

---

## Contexto

Necesitamos 6 componentes atómicos de UI que el resto del admin usará como bloque base. Todos los estilos van con **CSS custom properties** del sistema de tokens (`styles/tokens.css`). Sin Tailwind, sin inline styles salvo para valores dinámicos de tokens. Sin lógica de negocio — solo UI pura.

Directorio destino: `admin/src/components/ui/`
Cada componente: archivo `.tsx` + archivo `.css` (o estilos en el mismo archivo si son pequeños).

Test framework: **Vitest + Testing Library**. Tests en `admin/src/components/ui/__tests__/`.

---

## 1. Button

### Props API

```ts
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "destructive";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  /** When true, renders the child element as the button (Radix Slot pattern) */
  asChild?: boolean;
}
```

### Variants de estilo

| Variant | Background | Foreground | Border |
|---|---|---|---|
| `primary` | `--color-primary-500` | `--color-neutral-0` | none |
| `secondary` | `--color-neutral-100` | `--color-neutral-800` | `1px solid --color-neutral-300` |
| `ghost` | transparent | `--color-neutral-700` | none |
| `destructive` | `--color-danger-500` | `--color-neutral-0` | none |

Hover: oscurecer 1 step (ej. `primary-600`). Active: `primary-700`. Disabled: opacity 0.4, cursor not-allowed. Focus: `box-shadow: var(--shadow-focus)` (destructive usa `--shadow-focus-danger`).

### Sizes

| Size | Padding | Font size | Height |
|---|---|---|---|
| `sm` | `--space-2` / `--space-3` | `--font-size-sm` | 32px |
| `md` | `--space-3` / `--space-4` | `--font-size-base` | 40px |
| `lg` | `--space-4` / `--space-6` | `--font-size-md` | 48px |

### asChild

Importa `Slot` de `@radix-ui/react-slot`. Cuando `asChild={true}`, en vez de renderizar `<button>`, usa `<Slot>` para que el child sea el elemento real (útil para `<Link>` de router).

```tsx
import { Slot } from "@radix-ui/react-slot";
const Comp = asChild ? Slot : "button";
return <Comp className={...} disabled={disabled || loading} {...props} />;
```

### Loading state

Cuando `loading={true}`: deshabilitar interacción + mostrar `<Spinner size="sm" />` inline a la izquierda del texto. El texto no desaparece.

### Tests mínimos

```
- renderiza sin errores con variant="primary"
- aplica clase / data-attr correcto para cada variant
- aplica clase / data-attr correcto para cada size
- en estado disabled no dispara onClick
- en estado loading muestra spinner y está deshabilitado
- con asChild={true} renderiza el child como elemento raíz
```

---

## 2. Badge

### Props API

```ts
interface BadgeProps {
  variant?: "default" | "success" | "warning" | "danger" | "info";
  children: React.ReactNode;
  className?: string;
}
```

### Variants de estilo

| Variant | Background | Foreground |
|---|---|---|
| `default` | `--color-neutral-100` | `--color-neutral-700` |
| `success` | `--color-success-100` | `--color-success-700` |
| `warning` | `--color-warning-100` | `--color-warning-700` |
| `danger` | `--color-danger-100` | `--color-danger-700` |
| `info` | `--color-info-100` | `--color-info-700` |

Font size: `--font-size-xs`. Font weight: `--font-weight-semibold`. Padding: `--space-1` / `--space-2`. Border-radius: `--radius-full`.

### Tests mínimos

```
- renderiza texto del children
- aplica estilos / data-attr para cada variant
```

---

## 3. Card

### Estructura JSX esperada

```tsx
<Card>
  <CardHeader>
    <CardTitle>Título</CardTitle>
  </CardHeader>
  <CardContent>
    contenido
  </CardContent>
  <CardFooter>
    acciones
  </CardFooter>
</Card>
```

### Props API

```ts
// Todos extienden HTMLAttributes del elemento que renderizan (div)
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}
interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}
interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  as?: "h1" | "h2" | "h3" | "h4"; // default: "h3"
}
interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {}
interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {}
```

### Estilo Card raíz

Background: `--color-neutral-0`. Border: `1px solid --color-neutral-200`. Border-radius: `--radius-xl`. Box-shadow: `--shadow-sm`. Padding interno de cada sub-componente: `--space-6`.

CardHeader: `border-bottom: 1px solid --color-neutral-100`.
CardFooter: `border-top: 1px solid --color-neutral-100`, display flex, justify-content flex-end, gap `--space-3`.

### Tests mínimos

```
- renderiza Card con CardHeader, CardContent, CardFooter
- CardTitle renderiza con el tag "h3" por defecto
- CardTitle renderiza con tag personalizado via prop `as`
```

---

## 4. Spinner

### Props API

```ts
interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  /** Accessible label — default: "Loading" */
  label?: string;
  className?: string;
}
```

### Implementación

Elemento `<span role="status" aria-label={label}>` con animación CSS `@keyframes spin`. Sin SVG externo — usa `border` CSS (técnica border-top transparent).

| Size | Dimensiones | Border width |
|---|---|---|
| `sm` | 16×16px | 2px |
| `md` | 24×24px | 2px |
| `lg` | 32×32px | 3px |

Color del spinner: `--color-primary-500`. Track color: `--color-neutral-200`.

### Tests mínimos

```
- renderiza con role="status"
- aria-label por defecto es "Loading"
- aria-label personalizable via prop `label`
- aplica tamaño correcto según prop size (data-attr o class)
```

---

## 5. EmptyState

### Props API

```ts
interface EmptyStateProps {
  /** Optional icon — ReactNode (SVG, emoji, etc.). No lógica, solo visual. */
  icon?: React.ReactNode;
  title: string;
  description: string;
  /** Optional CTA button or link — ReactNode. EmptyState no decide qué hace, solo lo renderiza. */
  action?: React.ReactNode;
  className?: string;
}
```

### Layout

Centrado vertical y horizontal. Flex column, gap `--space-4`. Max-width 400px.

- `icon`: renderizado en un contenedor 48×48px, centrado, color `--color-neutral-400`.
- `title`: `--font-size-lg`, `--font-weight-semibold`, `--color-neutral-800`.
- `description`: `--font-size-sm`, `--color-neutral-500`, `--line-height-relaxed`.
- `action`: renderizado tal cual abajo del description.

### Tests mínimos

```
- renderiza title y description
- no renderiza el contenedor de icon si icon es undefined
- no renderiza el contenedor de action si action es undefined
- renderiza icon y action cuando se pasan
```

---

## 6. ErrorBoundary

### Props API

```ts
interface ErrorBoundaryProps {
  children: React.ReactNode;
  /** Optional custom fallback — if omitted, uses default fallback UI */
  fallback?: React.ReactNode;
  /** Called when error is caught — for logging */
  onError?: (error: Error, info: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}
```

### Implementación

Componente de **clase** React (los error boundaries no pueden ser funcionales en React 19 sin `use`). Implementar `componentDidCatch` y `getDerivedStateFromError`.

```tsx
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    this.props.onError?.(error, info);
  }
  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };
  render() { ... }
}
```

### Fallback UI por defecto

Cuando `hasError === true` y no hay `fallback` prop:
- Container centrado, padding `--space-8`.
- Título: "Algo salió mal" (`--font-size-lg`, `--color-danger-700`).
- Descripción: el mensaje del error (`error.message`), `--font-size-sm`, `--color-neutral-500`.
- Botón "Retry" (`<Button variant="secondary" size="sm">`) que llama `handleRetry`.

### Tests mínimos

```
- renderiza children cuando no hay error
- renderiza fallback UI por defecto cuando un child lanza
- renderiza fallback prop personalizado cuando se pasa y hay error
- el botón Retry resetea el estado y vuelve a renderizar children
- llama onError prop cuando se captura un error
```

---

## Reglas generales para Marta

1. **Solo UI atómica.** Ningún componente hace fetch, llama a Zustand, ni depende del dominio CMS.
2. **CSS custom properties siempre.** Sin Tailwind, sin valores hardcoded salvo `border-width` pequeños.
3. **Props con tipos TS estrictos.** No `any`. Extiende los tipos HTML nativos del elemento raíz.
4. **Accesibilidad WCAG AA.** Roles correctos, aria-label donde el elemento no tiene texto visible, focus ring visible (`--shadow-focus`).
5. **Tests de comportamiento, no de implementación.** No testear nombres de clase interna. Testear lo que el usuario ve y hace.
6. **exports index.** Cada componente exportado desde `admin/src/components/ui/index.ts` para importación limpia.
7. **Preguntas al Lucas, no al orquestador.** Si algo de la spec no está claro, ping directo.

---

## Entrega esperada

PR con los 6 componentes + tests + `index.ts` barrel. Asignar a Lucas para review antes de merge.
