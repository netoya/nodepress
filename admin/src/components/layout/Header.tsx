import type { FC, ReactNode } from "react";
import { useDarkMode } from "../../lib/useDarkMode";
import { DarkModeToggle } from "./DarkModeToggle";

interface HeaderProps {
  /** Slot for user avatar / menu on the right side */
  userSlot?: ReactNode;
}

/**
 * Header — top bar with brand title on the left and a user slot on the right.
 * Dark mode toggle available in the right section.
 */
export const Header: FC<HeaderProps> = ({ userSlot }) => {
  const { isDark, toggle } = useDarkMode();
  return (
    <header
      className="app-shell__header"
      role="banner"
      style={{
        background: "var(--shell-header-bg)",
        borderBottom: "1px solid var(--shell-header-border)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 var(--space-6)",
        height: "var(--shell-header-height)",
        position: "sticky",
        top: 0,
        zIndex: "var(--z-sticky)",
      }}
    >
      <span
        style={{
          fontSize: "var(--font-size-base)",
          fontWeight: "var(--font-weight-semibold)",
          color: "var(--shell-header-fg)",
          letterSpacing: "var(--letter-spacing-tight)",
        }}
      >
        NodePress
      </span>

      <div
        aria-label="Header actions"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-3)",
        }}
      >
        <DarkModeToggle isDark={isDark} onToggle={toggle} />
        {userSlot}
      </div>
    </header>
  );
};
