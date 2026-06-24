import { Link } from "react-router-dom";
import { loadSessionOrders } from "../lib/tradingSession";
import { useAuth } from "../context/AuthContext";
import { ROUTES } from "../lib/routes";

export function DashboardActivity() {
  const { user } = useAuth();
  if (!user) return null;

  const orders = loadSessionOrders(user.id).slice(0, 5);

  return (
    <article className="panel panel-glow">
      <div className="page-header" style={{ marginBottom: "0.75rem" }}>
        <h2 style={{ margin: 0, fontSize: "1.1rem" }}>Recent activity</h2>
        <Link to={ROUTES.home} className="btn btn-ghost btn-sm">
          Trade →
        </Link>
      </div>
      {orders.length === 0 ? (
        <p className="muted">No orders yet this session.</p>
      ) : (
        <ul className="activity-list">
          {orders.map((o) => (
            <li key={`${o.orderId}-${o.submittedAt}`}>
              <span className={o.side === "buy" ? "cell-buy" : "cell-sell"}>
                {o.side}
              </span>
              <span>{o.market}</span>
              <span>{o.status ?? o.error ?? "—"}</span>
              <time>
                {new Date(o.submittedAt).toLocaleTimeString(undefined, {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </time>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
