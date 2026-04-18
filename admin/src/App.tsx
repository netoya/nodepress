import { AppShell } from "./components/layout/AppShell";
import { DashboardPage } from "./features/dashboard/DashboardPage";

/**
 * App root.
 * Route: hardcoded to "dashboard" for Sprint 1.
 * React Router added in Sprint 2 — replace this with <RouterProvider>.
 */
export function App() {
  const route = "dashboard";

  return <AppShell>{route === "dashboard" && <DashboardPage />}</AppShell>;
}
