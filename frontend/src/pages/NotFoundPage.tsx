import { Link } from "react-router-dom";
import { ROUTES } from "../lib/routes";
import { useAuth } from "../context/AuthContext";

export function NotFoundPage() {
  const { isAuthenticated } = useAuth();

  return (
    <section className="not-found panel panel-glow">
      <h1>404</h1>
      <p className="muted">This page does not exist.</p>
      <div className="landing-actions">
        <Link to={ROUTES.home} className="btn btn-secondary">
          Home
        </Link>
        {isAuthenticated ? (
          <Link to={ROUTES.trade} className="btn btn-primary">
            Trading terminal
          </Link>
        ) : (
          <Link to={ROUTES.auth} className="btn btn-primary">
            Sign in
          </Link>
        )}
      </div>
    </section>
  );
}
