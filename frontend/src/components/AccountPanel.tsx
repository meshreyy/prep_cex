import { Link } from "react-router-dom";
import { useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { ROUTES } from "../lib/routes";

function formatUsd(n: number) {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function AccountPanel() {
  const { user, balance, isAuthenticated, isGuest, loginGuest } = useAuth();
  const [guestLoading, setGuestLoading] = useState(false);
  const available = balance?.available ?? 0;
  const locked = balance?.locked ?? 0;
  const total = available + locked;

  async function handleGuest() {
    setGuestLoading(true);
    try {
      const { user, balance: guestBalance } = await api.guest();
      loginGuest(user, guestBalance);
    } catch {
      /* user can retry from auth page */
    } finally {
      setGuestLoading(false);
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="account-panel account-panel--guest">
        <span className="panel-title">Account</span>
        <p className="account-guest-copy">
          Browse markets live. Sign in or try the demo with $1,000 paper balance.
        </p>
        <div className="account-guest-actions">
          <button
            type="button"
            className="btn btn-primary btn-sm btn-block"
            disabled={guestLoading}
            onClick={() => void handleGuest()}
          >
            {guestLoading ? "Starting…" : "Continue as guest"}
          </button>
          <Link to={ROUTES.auth} className="btn btn-secondary btn-sm btn-block">
            Login
          </Link>
          <Link
            to={`${ROUTES.auth}?mode=signup`}
            className="btn btn-secondary btn-sm btn-block"
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
        {!isGuest && (
          <Link to={ROUTES.dashboard} className="account-link">
            Deposit
          </Link>
        )}
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
          {isGuest && <span className="account-guest-badge">Demo</span>}
        </p>
      )}
      {!balance && (
        <p className="account-hint">Deposit on portfolio to trade with margin.</p>
      )}
    </div>
  );
}
