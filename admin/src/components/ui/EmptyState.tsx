import type { FC, ReactNode } from "react";

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}

/**
 * EmptyState — Message component for empty states and no-data scenarios.
 */
export const EmptyState: FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className,
}) => (
  <div
    className={className}
    style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: "var(--space-4)",
      maxWidth: "400px",
      margin: "0 auto",
      textAlign: "center",
    }}
  >
    {icon && (
      <div
        style={{
          width: "48px",
          height: "48px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--color-neutral-400)",
          fontSize: "var(--font-size-lg)",
        }}
      >
        {icon}
      </div>
    )}

    <h2
      style={{
        fontSize: "var(--font-size-lg)",
        fontWeight: "var(--font-weight-semibold)",
        color: "var(--color-neutral-800)",
        margin: 0,
      }}
    >
      {title}
    </h2>

    <p
      style={{
        fontSize: "var(--font-size-sm)",
        color: "var(--color-neutral-500)",
        lineHeight: "var(--line-height-relaxed)",
        margin: 0,
      }}
    >
      {description}
    </p>

    {action && <div>{action}</div>}
  </div>
);

EmptyState.displayName = "EmptyState";
