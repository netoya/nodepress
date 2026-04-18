import { forwardRef } from "react";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  autoResize?: boolean;
}

let textareaIdCounter = 0;

/**
 * Textarea — Multi-line text input with optional label, error message, and auto-resize.
 * Supports WCAG AA accessible error states.
 */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      error,
      autoResize = false,
      disabled,
      id: providedId,
      className,
      style,
      rows = 4,
      ...props
    },
    ref,
  ) => {
    // Generate id if not provided
    const textareaId = providedId || `textarea-${++textareaIdCounter}`;
    const errorId = `${textareaId}-error`;

    const textareaStyle: React.CSSProperties = {
      width: "100%",
      padding: "var(--space-4)",
      fontSize: "var(--font-size-base)",
      fontFamily: "var(--font-family-ui)",
      backgroundColor: "var(--color-neutral-0)",
      border: `1px solid ${error ? "var(--color-danger-500)" : "var(--color-neutral-300)"}`,
      borderRadius: "var(--radius-md)",
      color: "var(--color-neutral-800)",
      transition: `border-color var(--transition-fast), box-shadow var(--transition-fast)`,
      outline: "none",
      boxSizing: "border-box",
      fontWeight: "var(--font-weight-regular)",
      lineHeight: "var(--line-height-normal)",
      resize: autoResize ? "none" : "vertical",
      ...style,
    };

    // Disabled state
    if (disabled) {
      textareaStyle.opacity = 0.5;
      textareaStyle.cursor = "not-allowed";
      textareaStyle.backgroundColor = "var(--color-neutral-50)";
    }

    const handleAutoResize = (e: React.FormEvent<HTMLTextAreaElement>) => {
      if (autoResize) {
        const textarea = e.currentTarget;
        textarea.style.height = "auto";
        textarea.style.height = `${textarea.scrollHeight}px`;
      }
      // Cast needed: @types/react 19.1 changed onInput to InputEvent, but the
      // synthetic event shape is compatible at runtime. The cast avoids the
      // structural mismatch without changing runtime behavior.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      props.onInput?.(e as any);
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
            htmlFor={textareaId}
            style={{
              fontSize: "var(--font-size-sm)",
              fontWeight: "var(--font-weight-medium)",
              color: "var(--color-neutral-700)",
            }}
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          rows={rows}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          disabled={disabled}
          className={className}
          style={textareaStyle}
          {...props}
          onInput={handleAutoResize}
          onFocus={(e) => {
            const el = e.currentTarget;
            if (!error) {
              el.style.borderColor = "var(--color-primary-500)";
              el.style.boxShadow = "var(--shadow-focus)";
            } else {
              el.style.boxShadow = "var(--shadow-focus-danger)";
            }
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            const el = e.currentTarget;
            if (!error) {
              el.style.borderColor = "var(--color-neutral-300)";
              el.style.boxShadow = "none";
            } else {
              el.style.borderColor = "var(--color-danger-500)";
              el.style.boxShadow = "none";
            }
            props.onBlur?.(e);
          }}
        />
        {error && (
          <span
            id={errorId}
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
  },
);

Textarea.displayName = "Textarea";
