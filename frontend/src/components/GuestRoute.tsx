import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ROUTES } from "../lib/routes";

type LocationState = { from?: string };

export function GuestRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const state = location.state as LocationState | null;

  if (isAuthenticated) {
    const dest =
      state?.from && state.from !== ROUTES.auth ? state.from : ROUTES.home;
    return <Navigate to={dest} replace />;
  }

  return children;
}
