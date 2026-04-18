import { AppShell } from "./components/layout/AppShell";
import { DashboardPage } from "./features/dashboard/DashboardPage";
import { PostsListPage } from "./features/posts/PostsListPage";

/**
 * App root.
 * Simple hash-based routing for Sprint 1.
 * React Router added in Sprint 2 — replace this with <RouterProvider>.
 *
 * Routes: #dashboard (default), #posts
 */
export function App() {
  const route = window.location.hash.replace("#", "") || "dashboard";

  return (
    <AppShell>
      {route === "dashboard" && <DashboardPage />}
      {route === "posts" && <PostsListPage />}
    </AppShell>
  );
}
