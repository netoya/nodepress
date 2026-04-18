import * as RadixSelect from "@radix-ui/react-select";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SelectRoot = RadixSelect.Root as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SelectTrigger = RadixSelect.Trigger as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SelectValue = RadixSelect.Value as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SelectIcon = RadixSelect.Icon as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SelectPortal = RadixSelect.Portal as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SelectContent = RadixSelect.Content as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SelectViewport = RadixSelect.Viewport as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SelectItem = RadixSelect.Item as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SelectItemText = RadixSelect.ItemText as any;

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  label?: string;
  error?: string;
  id?: string;
}

let selectIdCounter = 0;

/**
 * Select — Accessible select dropdown using Radix UI Select.
 * Supports keyboard navigation, custom styling, and WCAG AA compliance.
 */
export function Select({
  options,
  value,
  onChange,
  placeholder = "Select an option",
  disabled = false,
  label,
  error,
  id: providedId,
}: SelectProps) {
  // Generate id if not provided
  const selectId = providedId || `select-${++selectIdCounter}`;

  const triggerStyle: React.CSSProperties = {
    width: "100%",
    height: "40px",
    padding: "var(--space-4)",
    fontSize: "var(--font-size-base)",
    fontFamily: "var(--font-family-ui)",
    backgroundColor: "var(--color-neutral-0)",
    border: `1px solid ${error ? "var(--color-danger-500)" : "var(--color-neutral-300)"}`,
    borderRadius: "var(--radius-md)",
    color: "var(--color-neutral-800)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    cursor: disabled ? "not-allowed" : "pointer",
    transition: `border-color var(--transition-fast), box-shadow var(--transition-fast)`,
    outline: "none",
    opacity: disabled ? 0.5 : 1,
  };

  const contentStyle: React.CSSProperties = {
    backgroundColor: "var(--color-neutral-0)",
    border: `1px solid var(--color-neutral-300)`,
    borderRadius: "var(--radius-md)",
    boxShadow: "var(--shadow-md)",
    zIndex: 1000,
  };

  const itemStyle: React.CSSProperties = {
    padding: `var(--space-3) var(--space-4)`,
    fontSize: "var(--font-size-base)",
    color: "var(--color-neutral-800)",
    cursor: "pointer",
    outline: "none",
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-2)",
      }}
    >
      {label && (
        <label
          htmlFor={selectId}
          style={{
            fontSize: "var(--font-size-sm)",
            fontWeight: "var(--font-weight-medium)",
            color: "var(--color-neutral-700)",
          }}
        >
          {label}
        </label>
      )}
      <SelectRoot value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger
          id={selectId}
          style={triggerStyle}
          aria-invalid={!!error}
        >
          <SelectValue placeholder={placeholder} />
          <SelectIcon>
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              style={{ color: "currentColor" }}
            >
              <path
                d="M4 6L8 10L12 6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </SelectIcon>
        </SelectTrigger>
        <SelectPortal>
          <SelectContent style={contentStyle}>
            <SelectViewport>
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <div style={itemStyle}>
                    <SelectItemText>{option.label}</SelectItemText>
                  </div>
                </SelectItem>
              ))}
            </SelectViewport>
          </SelectContent>
        </SelectPortal>
      </SelectRoot>
      {error && (
        <span
          role="alert"
          style={{
            fontSize: "var(--font-size-sm)",
            color: "var(--color-danger-500)",
            fontWeight: "var(--font-weight-medium)",
          }}
        >
          {error}
        </span>
      )}
    </div>
  );
}

Select.displayName = "Select";
