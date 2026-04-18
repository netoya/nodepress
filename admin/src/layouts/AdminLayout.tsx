import type { FC } from "react";
import { Outlet } from "react-router-dom";
import { AppShell } from "../components/layout/AppShell";

/**
 * AdminLayout — root layout for the admin router.
 * Wraps AppShell around nested route pages via <Outlet />.
 */
export const AdminLayout: FC = () => {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
};
