import { forwardRef } from "react";
import { Slot } from "@radix-ui/react-slot";
import { Spinner } from "./Spinner";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "destructive";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  asChild?: boolean;
}

const sizeStyles: Record<
  string,
  { padding: string; fontSize: string; height: string }
> = {
  sm: {
    padding: "var(--space-2) var(--space-3)",
    fontSize: "var(--font-size-sm)",
    height: "32px",
  },
  md: {
    padding: "var(--space-3) var(--space-4)",
    fontSize: "var(--font-size-base)",
    height: "40px",
  },
  lg: {
    padding: "var(--space-4) var(--space-6)",
    fontSize: "var(--font-size-md)",
    height: "48px",
  },
};

/**
 * Button — Primary interaction control.
 * Supports variants, sizes, loading state, and asChild pattern for router integration.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      asChild = false,
      disabled,
      children,
      onClick,
      className,
      style,
      ...props
    },
    ref,
  ) => {
    const sizeConfig = sizeStyles[size];

    const baseStyle: React.CSSProperties = {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "var(--space-2)",
      fontWeight: "var(--font-weight-medium)",
      borderRadius: "var(--radius-md)",
      cursor: "pointer",
      transition: `background-color ${
        variant === "destructive"
          ? "var(--transition-base)"
          : "var(--transition-fast)"
      }, color var(--transition-fast), box-shadow var(--transition-fast)`,
      outline: "none",
      ...style,
    };

    // Inject variant and size styles
    const computedStyle: React.CSSProperties = {
      ...baseStyle,
      ...sizeConfig,
    };

    // Apply background and color from variant
    if (variant === "primary") {
      computedStyle.backgroundColor = "var(--color-primary-500)";
      computedStyle.color = "var(--color-neutral-0)";
    } else if (variant === "secondary") {
      computedStyle.backgroundColor = "var(--color-neutral-100)";
      computedStyle.color = "var(--color-neutral-800)";
      computedStyle.border = "1px solid var(--color-neutral-300)";
    } else if (variant === "ghost") {
      computedStyle.backgroundColor = "transparent";
      computedStyle.color = "var(--color-neutral-700)";
    } else if (variant === "destructive") {
      computedStyle.backgroundColor = "var(--color-danger-500)";
      computedStyle.color = "var(--color-neutral-0)";
    }

    // Handle disabled state
    if (disabled || loading) {
      computedStyle.opacity = 0.4;
      computedStyle.cursor = "not-allowed";
    } else {
      // Hover and active states
      if (variant === "primary") {
        computedStyle.backgroundColor = "var(--color-primary-500)";
      } else if (variant === "secondary") {
        computedStyle.backgroundColor = "var(--color-neutral-100)";
      } else if (variant === "ghost") {
        computedStyle.backgroundColor = "transparent";
      } else if (variant === "destructive") {
        computedStyle.backgroundColor = "var(--color-danger-500)";
      }
    }

    // When asChild is true, pass all button props to the child element
    if (asChild) {
      const SlotComponent = Slot as any;
      return (
        <SlotComponent
          style={computedStyle}
          className={className}
          {...(props as any)}
        >
          {children}
        </SlotComponent>
      );
    }

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        aria-disabled={loading ? true : undefined}
        aria-busy={loading ? true : undefined}
        onClick={onClick}
        style={computedStyle}
        className={className}
        {...props}
      >
        {loading && <Spinner size="sm" label="" />}
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";
