import { AppShell } from "./components/layout/AppShell";
import { DashboardPage } from "./features/dashboard/DashboardPage";
import { PostsListPage } from "./features/posts/PostsListPage";
import { PostEditorPage } from "./features/posts/PostEditorPage";

/**
 * App root.
 * Simple hash-based routing for Sprint 1.
 * React Router added in Sprint 2 — replace this with <RouterProvider>.
 *
 * Routes:
 *   #dashboard          → DashboardPage (default)
 *   #posts              → PostsListPage
 *   #posts/new          → PostEditorPage (create mode)
 *   #posts/:id/edit     → PostEditorPage (edit mode, :id extracted)
 */
function resolveRoute(hash: string): { page: string; postId: number | null } {
  const path = hash.replace("#", "") || "dashboard";
  const parts = path.split("/");

  // #posts/:id/edit
  if (parts[0] === "posts" && parts.length === 3 && parts[2] === "edit") {
    const id = Number(parts[1]);
    if (!isNaN(id) && id > 0) {
      return { page: "post-edit", postId: id };
    }
  }

  // #posts/new
  if (parts[0] === "posts" && parts[1] === "new") {
    return { page: "post-new", postId: null };
  }

  // #posts
  if (parts[0] === "posts") {
    return { page: "posts", postId: null };
  }

  return { page: "dashboard", postId: null };
}

export function App() {
  const { page, postId } = resolveRoute(window.location.hash);

  return (
    <AppShell>
      {page === "dashboard" && <DashboardPage />}
      {page === "posts" && <PostsListPage />}
      {page === "post-new" && <PostEditorPage postId={null} />}
      {page === "post-edit" && <PostEditorPage postId={postId} />}
    </AppShell>
  );
}
