import type { FC, ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import "../../styles/layout.css";

interface AppShellProps {
  /** Main content rendered inside the <main> region */
  children: ReactNode;
  /** Optional slot forwarded to Header's right side (user avatar, etc.) */
  userSlot?: ReactNode;
}

/**
 * AppShell — root layout.
 * Grid: fixed sidebar left + sticky header top + scrollable main content.
 * Collapses sidebar below 768px (see layout.css).
 */
export const AppShell: FC<AppShellProps> = ({ children, userSlot }) => {
  return (
    <div className="app-shell">
      <Sidebar />
      <Header userSlot={userSlot} />
      <main
        className="app-shell__main"
        role="main"
        style={{
          background: "var(--shell-main-bg)",
          color: "var(--shell-main-fg)",
          padding: "var(--space-8)",
          fontFamily: "var(--font-family-ui)",
        }}
      >
        {children}
      </main>
    </div>
  );
};
