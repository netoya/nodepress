import type { FC, ReactNode } from "react";

export interface BadgeProps {
  variant?: "default" | "success" | "warning" | "danger" | "info";
  children: ReactNode;
  className?: string;
}

const variantColors: Record<string, { bg: string; fg: string }> = {
  default: {
    bg: "var(--color-neutral-100)",
    fg: "var(--color-neutral-700)",
  },
  success: {
    bg: "var(--color-success-100)",
    fg: "var(--color-success-700)",
  },
  warning: {
    bg: "var(--color-warning-100)",
    fg: "var(--color-warning-700)",
  },
  danger: {
    bg: "var(--color-danger-100)",
    fg: "var(--color-danger-700)",
  },
  info: {
    bg: "var(--color-info-100)",
    fg: "var(--color-info-700)",
  },
};

/**
 * Badge — Small label to display status or category.
 */
export const Badge: FC<BadgeProps> = ({
  variant = "default",
  children,
  className,
}) => {
  const colors = variantColors[variant] || variantColors["default"];
  const bg = colors?.bg || "var(--color-neutral-100)";
  const fg = colors?.fg || "var(--color-neutral-700)";

  return (
    <span
      className={className}
      style={{
        display: "inline-block",
        backgroundColor: bg,
        color: fg,
        padding: `var(--space-1) var(--space-2)`,
        fontSize: "var(--font-size-xs)",
        fontWeight: "var(--font-weight-semibold)",
        borderRadius: "var(--radius-full)",
      }}
    >
      {children}
    </span>
  );
};

Badge.displayName = "Badge";
