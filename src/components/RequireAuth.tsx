import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/** Gates a route behind authentication; sends visitors to Sign In and back. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return null;
  if (!user) {
    return <Navigate to="/account/sign-in" replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
}
