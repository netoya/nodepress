import { forwardRef } from "react";

export interface InputProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "size"
> {
  size?: "sm" | "md" | "lg";
  label?: string;
  error?: string;
}

const sizeStyles: Record<
  string,
  { height: string; padding: string; fontSize: string }
> = {
  sm: {
    height: "32px",
    padding: "var(--space-3)",
    fontSize: "var(--font-size-sm)",
  },
  md: {
    height: "40px",
    padding: "var(--space-4)",
    fontSize: "var(--font-size-base)",
  },
  lg: {
    height: "48px",
    padding: "var(--space-5)",
    fontSize: "var(--font-size-md)",
  },
};

let inputIdCounter = 0;

/**
 * Input — Text input field with optional label and error message.
 * Supports size variants and WCAG AA accessible error states.
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      size = "md",
      label,
      error,
      disabled,
      id: providedId,
      className,
      style,
      ...props
    },
    ref,
  ) => {
    // Generate id if not provided
    const inputId = providedId || `input-${++inputIdCounter}`;
    const errorId = `${inputId}-error`;

    const sizeConfig = sizeStyles[size] || sizeStyles["md"];

    const inputStyle: React.CSSProperties = {
      width: "100%",
      height: sizeConfig!.height,
      padding: sizeConfig!.padding,
      fontSize: sizeConfig!.fontSize,
      fontFamily: "var(--font-family-ui)",
      backgroundColor: "var(--color-neutral-0)",
      border: `1px solid ${error ? "var(--color-danger-500)" : "var(--color-neutral-300)"}`,
      borderRadius: "var(--radius-md)",
      color: "var(--color-neutral-800)",
      transition: `border-color var(--transition-fast), box-shadow var(--transition-fast)`,
      outline: "none",
      boxSizing: "border-box",
      ...style,
    };

    // Disabled state
    if (disabled) {
      inputStyle.opacity = 0.5;
      inputStyle.cursor = "not-allowed";
      inputStyle.backgroundColor = "var(--color-neutral-50)";
    }

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
            htmlFor={inputId}
            style={{
              fontSize: "var(--font-size-sm)",
              fontWeight: "var(--font-weight-medium)",
              color: "var(--color-neutral-700)",
            }}
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          disabled={disabled}
          className={className}
          style={inputStyle}
          {...props}
          onFocus={(e) => {
            const el = e.target as HTMLInputElement;
            if (!error) {
              el.style.borderColor = "var(--color-primary-500)";
              el.style.boxShadow = "var(--shadow-focus)";
            } else {
              el.style.boxShadow = "var(--shadow-focus-danger)";
            }
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            const el = e.target as HTMLInputElement;
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

Input.displayName = "Input";
