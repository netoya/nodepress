import type { FC } from "react";

interface DarkModeToggleProps {
  /** Whether dark mode is currently active */
  isDark: boolean;
  /** Callback when toggle is clicked */
  onToggle: () => void;
}

/**
 * DarkModeToggle — button to switch between light and dark themes.
 *
 * Accessibility:
 * - `aria-label` describes the button's purpose
 * - `aria-pressed` indicates current state (pressed = dark mode on)
 * - Keyboard accessible (Enter/Space trigger click)
 *
 * Icon approach: Simple sun/moon Unicode characters (☀️/🌙) for maximum portability.
 * If replaced with SVG, ensure proper `role="img"` and `aria-label` nesting.
 */
export const DarkModeToggle: FC<DarkModeToggleProps> = ({
  isDark,
  onToggle,
}) => {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      aria-pressed={isDark}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "2.5rem",
        height: "2.5rem",
        borderRadius: "var(--radius-md)",
        border: "1px solid var(--shell-header-border)",
        background: "var(--shell-header-bg)",
        color: "var(--shell-header-fg)",
        cursor: "pointer",
        fontSize: "1.25rem",
        transition:
          "background var(--transition-fast), border-color var(--transition-fast)",
      }}
      onMouseEnter={(e) => {
        const button = e.currentTarget as HTMLButtonElement;
        button.style.background = isDark
          ? "rgba(255, 255, 255, 0.08)"
          : "var(--color-neutral-100)";
      }}
      onMouseLeave={(e) => {
        const button = e.currentTarget as HTMLButtonElement;
        button.style.background = "var(--shell-header-bg)";
      }}
    >
      {isDark ? "☀️" : "🌙"}
    </button>
  );
};
