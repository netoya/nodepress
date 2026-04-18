# Brief — Design System Components Level 2 (Forms + Toast)

**Asignado a:** Marta (dev-frontend)
**Creado por:** Lucas (lead-frontend)
**Fecha:** 2026-04-18
**Sprint:** 1 — Semana 2
**Ticket de referencia:** #24-l2

---

## Contexto

Segundo batch de componentes atómicos para el admin. El scope del Sprint 1 incluye ahora `/posts` con editor básico (textarea, sin rich text). Estos 4 componentes desbloquean ese editor y cualquier formulario futuro.

Mismas reglas que el brief anterior: CSS custom properties, TS strict, sin lógica de negocio, WCAG AA, Vitest + Testing Library.

Directorio destino: `admin/src/components/ui/`
Tests: `admin/src/components/ui/__tests__/`
Exports: añadir cada componente a `admin/src/components/ui/index.ts`

---

## 1. Input

### Props API

```ts
interface InputProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "size"
> {
  size?: "sm" | "md" | "lg";
  label?: string;
  error?: string;
}
```

> Extends native `InputHTMLAttributes` so `type`, `value`, `onChange`, `placeholder`, `disabled` etc. come for free from the HTML interface. The `size` HTML attribute is omitted and replaced by the design system size token.

### Structure

One single file `Input.tsx` that renders:

```tsx
<div className="input-wrapper" data-size={size} data-error={!!error}>
  {label && (
    <label htmlFor={id} className="input-label">
      {label}
    </label>
  )}
  <input
    id={id}
    aria-invalid={!!error}
    aria-describedby={error ? `${id}-error` : undefined}
    {...rest}
  />
  {error && (
    <span id={`${id}-error`} role="alert" className="input-error">
      {error}
    </span>
  )}
</div>
```

`id` generation: use `React.useId()` if no explicit `id` prop is passed.

### Sizes

| Size | Height | Padding H   | Font size          |
| ---- | ------ | ----------- | ------------------ |
| `sm` | 32px   | `--space-3` | `--font-size-sm`   |
| `md` | 40px   | `--space-4` | `--font-size-base` |
| `lg` | 48px   | `--space-5` | `--font-size-md`   |

### States

| State    | Border color          | Additional                                        |
| -------- | --------------------- | ------------------------------------------------- |
| default  | `--color-neutral-300` | —                                                 |
| focus    | `--color-primary-500` | `box-shadow: var(--shadow-focus)`                 |
| error    | `--color-danger-500`  | `box-shadow: var(--shadow-focus-danger)` on focus |
| disabled | `--color-neutral-200` | `opacity: 0.5`, `cursor: not-allowed`             |

Background: `--color-neutral-0`. Border-radius: `--radius-md`.

### Tests mínimos

```
- renderiza sin errores con props mínimas
- renderiza label cuando se pasa la prop label
- renderiza mensaje de error cuando se pasa error prop
- en estado error: input tiene aria-invalid="true" y aria-describedby apuntando al error span
- en estado disabled no dispara onChange al interactuar
- acepta size="sm" | "md" | "lg" sin errores
```

---

## 2. Textarea

### Props API

```ts
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  rows?: number; // default: 4
  autoResize?: boolean; // default: false — when true, height grows with content
}
```

### Structure

Same wrapper pattern as Input:

```tsx
<div className="textarea-wrapper" data-error={!!error}>
  {label && <label htmlFor={id}>{label}</label>}
  <textarea
    id={id}
    rows={rows}
    aria-invalid={!!error}
    aria-describedby={error ? `${id}-error` : undefined}
    onInput={autoResize ? handleAutoResize : undefined}
    {...rest}
  />
  {error && (
    <span id={`${id}-error`} role="alert">
      {error}
    </span>
  )}
</div>
```

`handleAutoResize`: on the `onInput` event, set `element.style.height = 'auto'` then `element.style.height = element.scrollHeight + 'px'`. This avoids the jump caused by setting height directly.

`id` generation: `React.useId()` fallback same as Input.

### States: identical to Input (default/focus/error/disabled). No size variants — width is 100%, height driven by `rows`.

### Tests mínimos

```
- renderiza sin errores
- renderiza label cuando se pasa
- renderiza mensaje de error con aria-invalid y aria-describedby correctos
- rows=4 por defecto
- acepta rows personalizado
- autoResize: cuando se escribe, el textarea crece (simular onInput con userEvent.type)
```

---

## 3. Select

### Dependencia

Basado en `@radix-ui/react-select`. **No está en package.json todavía — instalarlo pinned:**

```
npm install @radix-ui/react-select@2.1.2 --save-exact
```

Add to `admin/package.json` under `dependencies`:

```json
"@radix-ui/react-select": "2.1.2"
```

### Props API

```ts
interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  label?: string;
  error?: string;
  id?: string;
}
```

### Implementation

Use Radix primitives — do NOT build a custom dropdown from scratch:

```tsx
import * as RadixSelect from "@radix-ui/react-select";

// Compose: Root > Trigger > Content > Viewport > Item
<div className="select-wrapper">
  {label && <label htmlFor={triggerId}>{label}</label>}
  <RadixSelect.Root value={value} onValueChange={onChange} disabled={disabled}>
    <RadixSelect.Trigger
      id={triggerId}
      aria-label={placeholder}
      aria-invalid={!!error}
    >
      <RadixSelect.Value placeholder={placeholder} />
      {/* chevron icon inline SVG */}
    </RadixSelect.Trigger>
    <RadixSelect.Portal>
      <RadixSelect.Content>
        <RadixSelect.Viewport>
          {options.map((opt) => (
            <RadixSelect.Item key={opt.value} value={opt.value}>
              <RadixSelect.ItemText>{opt.label}</RadixSelect.ItemText>
            </RadixSelect.Item>
          ))}
        </RadixSelect.Viewport>
      </RadixSelect.Content>
    </RadixSelect.Portal>
  </RadixSelect.Root>
  {error && <span role="alert">{error}</span>}
</div>;
```

Keyboard nav is provided by Radix (arrow keys, Enter, Escape, Home/End).

### Styles

Trigger: same height/border/radius as Input `md` (40px). Dropdown content: `--color-neutral-0`, `--shadow-md`, `--radius-md`. Item hover: `--color-primary-50` background. Selected item: `--color-primary-500` text color.

### Tests mínimos

```
- renderiza trigger con placeholder
- renderiza label si se pasa
- onChange se llama al seleccionar una opción (userEvent.click trigger, then click option)
- disabled: trigger tiene atributo disabled
- error: muestra mensaje de error
```

> Note: Radix Select uses a Portal so wrap tests with the standard Radix test setup (jsdom, no need for extra config — already in Vitest setup).

---

## 4. Toast

### Dependencia

Basado en `@radix-ui/react-toast`. **No está en package.json — instalarlo pinned:**

```
npm install @radix-ui/react-toast@1.2.4 --save-exact
```

Add to `admin/package.json` under `dependencies`:

```json
"@radix-ui/react-toast": "1.2.4"
```

### API pública

```ts
// Hook consumer-facing API:
const { show } = useToast();
show({ type: 'success' | 'error' | 'info', message: string });

// Provider:
<ToastProvider>
  {children}
</ToastProvider>
```

### Implementation

**State approach:** Zustand store (already in deps) OR simple React context — Lucas prefiere context aquí para no contaminar el store global con UI ephemeral.

```ts
// Internal toast shape
interface ToastItem {
  id: string;
  type: "success" | "error" | "info";
  message: string;
}
```

**Files to create:**

1. `Toast.tsx` — Radix-based `<Toast.Root>` rendering a single toast item. Receives `ToastItem` as props + `onOpenChange` to remove it.
2. `ToastProvider.tsx` — Context + `<Toast.Provider duration={5000}>` + `<Toast.Viewport>`. Renders up to 3 toasts from state. Stacks them.
3. `useToast.ts` — Hook that reads context and exposes `show()`.

```tsx
// ToastProvider.tsx skeleton
import * as RadixToast from "@radix-ui/react-toast";

const ToastContext = React.createContext<{
  show: (t: Omit<ToastItem, "id">) => void;
} | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);

  const show = (t: Omit<ToastItem, "id">) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev.slice(-2), { ...t, id }]); // max 3
  };

  const remove = (id: string) =>
    setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <ToastContext.Provider value={{ show }}>
      <RadixToast.Provider duration={5000}>
        {children}
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            toast={toast}
            onOpenChange={(open) => {
              if (!open) remove(toast.id);
            }}
          />
        ))}
        <RadixToast.Viewport />
      </RadixToast.Provider>
    </ToastContext.Provider>
  );
}
```

### Styles

Position: fixed bottom-right, `--space-6` margin. Stack: gap `--space-2`. Width: 360px max.

| Type      | Left border color     | Icon |
| --------- | --------------------- | ---- |
| `success` | `--color-success-500` | ✓    |
| `error`   | `--color-danger-500`  | ✕    |
| `info`    | `--color-primary-500` | ℹ    |

Background: `--color-neutral-0`. Box-shadow: `--shadow-lg`. Border-radius: `--radius-lg`. Padding: `--space-4`. Auto-dismiss via Radix `duration={5000}`.

### Toast.tsx (single item structure)

```tsx
<RadixToast.Root data-type={toast.type} onOpenChange={onOpenChange}>
  <RadixToast.Title>{toast.message}</RadixToast.Title>
  <RadixToast.Action altText="Dismiss" asChild>
    <button aria-label="Dismiss notification">×</button>
  </RadixToast.Action>
</RadixToast.Root>
```

### Tests mínimos

```tsx
// Wrap with ToastProvider + a trigger button that calls show()
- show({ type: 'success', message: 'Saved!' }): message aparece en el DOM
- show({ type: 'error', message: 'Error!' }): message aparece
- dismiss button removes the toast from DOM
- max 3 toasts: al añadir 4, el primero desaparece
```

---

## Reglas generales (igual que brief anterior)

1. **Solo UI atómica.** Sin fetch, sin Zustand global, sin dominio CMS. (Toast usa context propio, no el store global.)
2. **CSS custom properties siempre.** Sin Tailwind, sin valores hardcoded.
3. **Props TS strict.** No `any`.
4. **Accesibilidad WCAG AA.** `aria-invalid`, `aria-describedby`, role="alert" para errores y toasts.
5. **Tests de comportamiento, no de implementación.**
6. **Exports index.** Añadir `Input`, `Textarea`, `Select`, `ToastProvider`, `useToast` a `admin/src/components/ui/index.ts`.
7. **Preguntas al Lucas, no al orquestador.**

---

## Entrega esperada

PR con 4 componentes + tests + index.ts actualizado + package.json actualizado (2 nuevas deps). Asignar a Lucas para review antes de merge.

## Dependencias a instalar antes de implementar

```bash
cd admin
npm install @radix-ui/react-select@2.1.2 @radix-ui/react-toast@1.2.4 --save-exact
```
