import type { FC } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { isAuthenticated } from "../../lib/api";

/**
 * AuthGuard — Protects routes that require authentication.
 * Redirects unauthenticated visitors to /login.
 */
export const AuthGuard: FC = () => {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
};

AuthGuard.displayName = "AuthGuard";
