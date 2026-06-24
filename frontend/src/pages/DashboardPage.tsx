import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { DashboardActivity } from "../components/DashboardActivity";
import { ROUTES } from "../lib/routes";

function formatUsd(n: number) {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function DashboardPage() {
  const { user, balance, setBalance } = useAuth();
  const [amount, setAmount] = useState("1000");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const refreshBalance = useCallback(async () => {
    if (!user) return;
    try {
      const bal = await api.getBalance(user.id);
      setBalance(bal);
    } catch {
      /* ignore if engine offline */
    }
  }, [user, setBalance]);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    api
      .getBalance(user.id)
      .then((bal) => {
        if (!cancelled) setBalance(bal);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [user?.id, setBalance]);

  async function handleOnramp(e: FormEvent) {
    e.preventDefault();
    if (!user) return;

    setError(null);
    setLoading(true);
    try {
      const next = await api.onramp(user.id, Number(amount));
      setBalance(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Onramp failed");
    } finally {
      setLoading(false);
    }
  }

  const total = (balance?.available ?? 0) + (balance?.locked ?? 0);

  return (
    <section className="page dashboard-page">
      <header className="page-header">
        <div>
          <h1>Portfolio</h1>
          <p className="muted">Welcome back, {user?.username}</p>
        </div>
        <Link to={ROUTES.home} className="btn btn-primary">
          Open terminal →
        </Link>
      </header>

      <div className="stat-grid">
        <article className="stat-card stat-card--highlight">
          <span className="stat-label">Total equity</span>
          <strong className="stat-value accent">${formatUsd(total)}</strong>
        </article>
        <article className="stat-card">
          <span className="stat-label">Available</span>
          <strong className="stat-value up">
            ${formatUsd(balance?.available ?? 0)}
          </strong>
        </article>
        <article className="stat-card">
          <span className="stat-label">Locked margin</span>
          <strong className="stat-value">
            ${formatUsd(balance?.locked ?? 0)}
          </strong>
        </article>
      </div>

      <article className="panel panel-glow">
        <h2>Onramp funds</h2>
        <p className="muted">
          Add simulated USDC collateral to start trading perpetuals.
        </p>

        <form className="inline-form" onSubmit={handleOnramp}>
          <label>
            Amount (USDC)
            <input
              type="number"
              min="1"
              step="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </label>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "Depositing…" : "Deposit"}
          </button>
        </form>
        {error && <p className="form-error">{error}</p>}
      </article>

      <p className="muted panel-note">
        Balance syncs from the engine.{" "}
        <button type="button" className="link-btn" onClick={refreshBalance}>
          Refresh
        </button>
      </p>

      <DashboardActivity />
    </section>
  );
}
