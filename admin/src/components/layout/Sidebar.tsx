import type { FC } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { clearToken } from "../../lib/api";

interface NavItem {
  label: string;
  href: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/" },
  { label: "Posts", href: "/posts" },
  { label: "Pages", href: "/pages" },
  { label: "Plugins", href: "/plugins" },
  { label: "Settings", href: "/settings" },
];

/**
 * Sidebar — static navigation shell.
 * Dynamic plugin-injected items are Sprint 3 scope (Román's protocol).
 * Uses NavLink from react-router-dom for active-state highlighting.
 */
export const Sidebar: FC = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    clearToken();
    void navigate("/login");
  };

  return (
    <aside
      className="app-shell__sidebar"
      style={{
        background: "var(--shell-sidebar-bg)",
        borderRight: "1px solid var(--shell-sidebar-border)",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflowY: "auto",
      }}
    >
      {/* Brand mark */}
      <div
        style={{
          padding: "var(--space-4) var(--space-6)",
          height: "var(--shell-header-height)",
          display: "flex",
          alignItems: "center",
          borderBottom: "1px solid var(--shell-sidebar-border)",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            color: "var(--color-primary-400)",
            fontWeight: "var(--font-weight-bold)",
            fontSize: "var(--font-size-base)",
            letterSpacing: "var(--letter-spacing-tight)",
          }}
        >
          NodePress
        </span>
      </div>

      {/* Navigation */}
      <nav
        aria-label="Main navigation"
        style={{ flex: 1, padding: "var(--space-4) 0" }}
      >
        <ul role="list" style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {NAV_ITEMS.map((item) => (
            <li key={item.href}>
              <NavLink
                to={item.href}
                end={item.href === "/"}
                style={({ isActive }) => ({
                  display: "block",
                  padding: "var(--space-3) var(--space-6)",
                  color: isActive
                    ? "var(--shell-sidebar-fg-active)"
                    : "var(--shell-sidebar-fg)",
                  background: isActive
                    ? "var(--shell-sidebar-item-hover-bg)"
                    : "transparent",
                  textDecoration: "none",
                  fontSize: "var(--font-size-sm)",
                  fontWeight: "var(--font-weight-medium)",
                  borderRadius: "var(--radius-md)",
                  margin: "0 var(--space-2)",
                  transition:
                    "background var(--transition-fast), color var(--transition-fast)",
                })}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.background =
                    "var(--shell-sidebar-item-hover-bg)";
                  (e.currentTarget as HTMLAnchorElement).style.color =
                    "var(--shell-sidebar-fg-active)";
                }}
                onMouseLeave={(e) => {
                  const isCurrent =
                    e.currentTarget.getAttribute("aria-current") === "page";
                  (e.currentTarget as HTMLAnchorElement).style.background =
                    isCurrent
                      ? "var(--shell-sidebar-item-hover-bg)"
                      : "transparent";
                  (e.currentTarget as HTMLAnchorElement).style.color = isCurrent
                    ? "var(--shell-sidebar-fg-active)"
                    : "var(--shell-sidebar-fg)";
                }}
              >
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Logout footer */}
      <div
        style={{
          padding: "var(--space-4) var(--space-6)",
          borderTop: "1px solid var(--shell-sidebar-border)",
          flexShrink: 0,
        }}
      >
        <button
          type="button"
          onClick={handleLogout}
          style={{
            display: "block",
            width: "100%",
            padding: "var(--space-3) var(--space-2)",
            background: "transparent",
            border: "none",
            borderRadius: "var(--radius-md)",
            color: "var(--shell-sidebar-fg)",
            fontSize: "var(--font-size-sm)",
            fontWeight: "var(--font-weight-medium)",
            cursor: "pointer",
            textAlign: "left",
            transition:
              "background var(--transition-fast), color var(--transition-fast)",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background =
              "var(--color-danger-50, #fef2f2)";
            (e.currentTarget as HTMLButtonElement).style.color =
              "var(--color-danger-600, #dc2626)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background =
              "transparent";
            (e.currentTarget as HTMLButtonElement).style.color =
              "var(--shell-sidebar-fg)";
          }}
        >
          Logout
        </button>
      </div>
    </aside>
  );
};
