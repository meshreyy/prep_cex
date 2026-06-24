import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ROUTES } from "../lib/routes";
import { DeployBanner } from "./DeployBanner";

export function Layout() {
  const { isAuthenticated, user, logout, balance } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isTrade =
    location.pathname === ROUTES.home ||
    location.pathname === ROUTES.trade;

  return (
    <div className="app-shell">
      <div className="app-bg-glow" aria-hidden />
      <DeployBanner />
      <header className="app-header">
        <Link to={ROUTES.home} className="brand">
          <span className="brand-icon">◆</span>
          Perp<span>CEX</span>
        </Link>

        <nav className="app-nav">
          <NavLink to={ROUTES.home} end>
            Markets
          </NavLink>
          {isAuthenticated && (
            <NavLink to={ROUTES.dashboard}>Portfolio</NavLink>
          )}

          {isAuthenticated ? (
            <>
              {balance && (
                <span className="nav-balance" title="Total equity">
                  $
                  {(balance.available + balance.locked).toLocaleString(
                    undefined,
                    { maximumFractionDigits: 0 },
                  )}
                </span>
              )}
              <span className="nav-user">{user?.username}</span>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  logout();
                  navigate(ROUTES.home);
                }}
              >
                Log out
              </button>
            </>
          ) : (
            <div className="nav-auth-actions">
              <Link to={ROUTES.auth} className="nav-auth-login">
                Login
              </Link>
              <Link
                to={`${ROUTES.auth}?mode=signup`}
                className="btn btn-primary btn-sm"
              >
                Register
              </Link>
            </div>
          )}
        </nav>
      </header>

      <main className={`app-main ${isTrade ? "app-main--trade" : ""}`}>
        <Outlet />
      </main>
    </div>
  );
}
