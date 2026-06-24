import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ROUTES } from "../lib/routes";

function formatUsd(n: number) {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function AccountPanel() {
  const { user, balance, isAuthenticated } = useAuth();
  const available = balance?.available ?? 0;
  const locked = balance?.locked ?? 0;
  const total = available + locked;

  if (!isAuthenticated) {
    return (
      <div className="account-panel account-panel--guest">
        <span className="panel-title">Account</span>
        <p className="account-guest-copy">
          Browse markets live. Sign in to place orders and manage your portfolio.
        </p>
        <div className="account-guest-actions">
          <Link to={ROUTES.auth} className="btn btn-secondary btn-sm btn-block">
            Login
          </Link>
          <Link
            to={`${ROUTES.auth}?mode=signup`}
            className="btn btn-primary btn-sm btn-block"
          >
            Register
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="account-panel">
      <div className="account-panel-head">
        <span className="panel-title">Account</span>
        <Link to={ROUTES.dashboard} className="account-link">
          Deposit
        </Link>
      </div>
      <dl className="account-stats">
        <div>
          <dt>Equity</dt>
          <dd className="accent">${formatUsd(total)}</dd>
        </div>
        <div>
          <dt>Available</dt>
          <dd className="up">${formatUsd(available)}</dd>
        </div>
        <div>
          <dt>Margin used</dt>
          <dd>${formatUsd(locked)}</dd>
        </div>
      </dl>
      {user && (
        <p className="account-user">
          <span className="account-avatar">{user.username[0]?.toUpperCase()}</span>
          {user.username}
        </p>
      )}
      {!balance && (
        <p className="account-hint">Deposit on portfolio to trade with margin.</p>
      )}
    </div>
  );
}
