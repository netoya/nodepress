import type { FC } from "react";

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
 */
export const Sidebar: FC = () => {
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
      <nav aria-label="Main navigation" style={{ flex: 1, padding: "var(--space-4) 0" }}>
        <ul
          role="list"
          style={{ listStyle: "none", margin: 0, padding: 0 }}
        >
          {NAV_ITEMS.map((item) => (
            <li key={item.href}>
              <a
                href={item.href}
                style={{
                  display: "block",
                  padding: "var(--space-3) var(--space-6)",
                  color: "var(--shell-sidebar-fg)",
                  textDecoration: "none",
                  fontSize: "var(--font-size-sm)",
                  fontWeight: "var(--font-weight-medium)",
                  borderRadius: "var(--radius-md)",
                  margin: "0 var(--space-2)",
                  transition: "background var(--transition-fast), color var(--transition-fast)",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.background =
                    "var(--shell-sidebar-item-hover-bg)";
                  (e.currentTarget as HTMLAnchorElement).style.color =
                    "var(--shell-sidebar-fg-active)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.background = "transparent";
                  (e.currentTarget as HTMLAnchorElement).style.color =
                    "var(--shell-sidebar-fg)";
                }}
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
};
