import type { FC } from "react";

export interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  label?: string;
  className?: string;
}

const spinnerSizes: Record<
  string,
  { dimensions: number; borderWidth: number }
> = {
  sm: { dimensions: 16, borderWidth: 2 },
  md: { dimensions: 24, borderWidth: 2 },
  lg: { dimensions: 32, borderWidth: 3 },
};

/**
 * Spinner — Loading indicator.
 * Uses CSS border animation with accessible role="status".
 */
export const Spinner: FC<SpinnerProps> = ({
  size = "md",
  label = "Loading",
  className,
}) => {
  const config = spinnerSizes[size] || spinnerSizes["md"];
  const { dimensions, borderWidth } = config || {
    dimensions: 24,
    borderWidth: 2,
  };

  return (
    <>
      <style>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
      <span
        role="status"
        aria-label={label}
        className={className}
        style={{
          display: "inline-block",
          width: `${dimensions}px`,
          height: `${dimensions}px`,
          border: `${borderWidth}px solid var(--color-neutral-200)`,
          borderTopColor: "var(--color-primary-500)",
          borderRadius: "50%",
          animation: "spin 1s linear infinite",
        }}
      />
    </>
  );
};

Spinner.displayName = "Spinner";
