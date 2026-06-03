import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ROUTES } from "../lib/routes";

export function LandingPage() {
  const { isAuthenticated } = useAuth();

  return (
    <section className="landing">
      <div className="landing-hero">
        <p className="eyebrow">Perpetual futures exchange</p>
        <h1>
          Trade with <span className="text-gradient">pro-grade</span> tools
        </h1>
        <p className="lead">
          Live charts, order book, and instant execution — powered by your
          matching engine. Dark theme, gold accents, built for serious flow.
        </p>

        <div className="landing-actions">
          {isAuthenticated ? (
            <>
            <Link to={ROUTES.trade} className="btn btn-primary btn-lg">
              Launch terminal
            </Link>
            <Link to={ROUTES.dashboard} className="btn btn-secondary btn-lg">
              Dashboard
            </Link>
          </>
        ) : (
          <>
            <Link
              to={`${ROUTES.auth}?mode=signup`}
              className="btn btn-primary btn-lg"
            >
              Get started
            </Link>
            <Link to={ROUTES.auth} className="btn btn-secondary btn-lg">
              Sign in
            </Link>
            </>
          )}
        </div>
      </div>

      <ul className="feature-grid">
        <li className="feature-card">
          <span className="feature-icon">📈</span>
          <strong>Live charts</strong>
          <span>Candlesticks + volume from Binance index</span>
        </li>
        <li className="feature-card">
          <span className="feature-icon">📊</span>
          <strong>Order book</strong>
          <span>Real-time depth and trade tape</span>
        </li>
        <li className="feature-card">
          <span className="feature-icon">⚡</span>
          <strong>Perp trading</strong>
          <span>Limit/market orders, positions & history</span>
        </li>
      </ul>
    </section>
  );
}
