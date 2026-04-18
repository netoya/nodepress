import { createHashRouter } from "react-router-dom";
import { AdminLayout } from "./layouts/AdminLayout";
import { DashboardPage } from "./features/dashboard/DashboardPage";
import { PostsListPage } from "./features/posts/PostsListPage";
import { PostEditorRoute } from "./features/posts/PostEditorRoute";
import { PluginsPage } from "./features/plugins/PluginsPage";
import { AuthGuard } from "./features/auth/AuthGuard";
import { LoginPage } from "./features/auth/LoginPage";

/**
 * Hash-based router — works in all environments without server-side configuration.
 * Paths are visible as /#/, /#/posts, /#/posts/new, /#/posts/:id/edit.
 *
 * Switch to createBrowserRouter if the deployment environment supports HTML5 history API
 * with a catch-all fallback (e.g. Nginx try_files $uri /index.html).
 */
export const router = createHashRouter([
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/",
    element: <AuthGuard />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: "posts", element: <PostsListPage /> },
          { path: "posts/new", element: <PostEditorRoute /> },
          { path: "posts/:id/edit", element: <PostEditorRoute /> },
          { path: "plugins", element: <PluginsPage /> },
        ],
      },
    ],
  },
]);
