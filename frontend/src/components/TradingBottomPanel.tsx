import type { Position } from "../lib/api";
import {
  deriveSessionPositions,
  type SessionOrder,
} from "../lib/tradingSession";

type Tab = "positions" | "open" | "history";

type Props = {
  tab: Tab;
  onTabChange: (tab: Tab) => void;
  orders: SessionOrder[];
  positions: Position[];
  onCancelOrder?: (orderId: string) => void;
  cancelLoadingId?: string | null;
};

function formatNum(n: number, d = 4) {
  return n.toLocaleString(undefined, { maximumFractionDigits: d });
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatusBadge({ status }: { status?: string }) {
  const s = status ?? "unknown";
  return (
    <span className={`status-badge status-${s}`}>{s.replace("_", " ")}</span>
  );
}

export function TradingBottomPanel({
  tab,
  onTabChange,
  orders,
  positions,
  onCancelOrder,
  cancelLoadingId,
}: Props) {
  const openOrders = orders.filter(
    (o) =>
      o.orderId &&
      (o.status === "open" || o.status === "partially_filled"),
  );
  const sessionPositions = deriveSessionPositions(orders);

  return (
    <div className="terminal-bottom-inner">
      <div className="bottom-tabs">
        <button
          type="button"
          className={tab === "positions" ? "active" : ""}
          onClick={() => onTabChange("positions")}
        >
          Positions
          {(positions.length > 0 || sessionPositions.length > 0) && (
            <span className="tab-count">
              {positions.length || sessionPositions.length}
            </span>
          )}
        </button>
        <button
          type="button"
          className={tab === "open" ? "active" : ""}
          onClick={() => onTabChange("open")}
        >
          Open orders
          {openOrders.length > 0 && (
            <span className="tab-count">{openOrders.length}</span>
          )}
        </button>
        <button
          type="button"
          className={tab === "history" ? "active" : ""}
          onClick={() => onTabChange("history")}
        >
          Order history
        </button>
      </div>

      <div className="bottom-table-wrap">
        {tab === "positions" && (
          <table className="data-table">
            <thead>
              <tr>
                <th>Market</th>
                <th>Side</th>
                <th>Size</th>
                <th>Entry</th>
                <th>uPnL</th>
              </tr>
            </thead>
            <tbody>
              {positions.length === 0 && sessionPositions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="table-empty">
                    No open positions. Place and fill an order to open a
                    position.
                  </td>
                </tr>
              ) : positions.length > 0 ? (
                positions.map((p) => (
                  <tr key={p.positionId}>
                    <td>{p.market}</td>
                    <td
                      className={
                        p.type === "long" ? "cell-buy" : "cell-sell"
                      }
                    >
                      {p.type}
                    </td>
                    <td>{formatNum(p.qty)}</td>
                    <td>{formatNum(p.averagePrice, 2)}</td>
                    <td
                      className={
                        p.unrealizedPnl >= 0 ? "cell-buy" : "cell-sell"
                      }
                    >
                      {formatNum(p.unrealizedPnl, 2)}
                    </td>
                  </tr>
                ))
              ) : (
                sessionPositions.map((p) => (
                  <tr key={p.key}>
                    <td>{p.market}</td>
                    <td
                      className={
                        p.side === "long" ? "cell-buy" : "cell-sell"
                      }
                    >
                      {p.side}
                    </td>
                    <td>{formatNum(p.qty)}</td>
                    <td>{formatNum(p.avgPrice, 2)}</td>
                    <td>—</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}

        {tab === "open" && (
          <table className="data-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Market</th>
                <th>Side</th>
                <th>Price</th>
                <th>Qty</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {openOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="table-empty">
                    No open orders.
                  </td>
                </tr>
              ) : (
                openOrders.map((o) => (
                  <tr key={o.orderId ?? o.submittedAt}>
                    <td>{formatTime(o.submittedAt)}</td>
                    <td>{o.market}</td>
                    <td
                      className={o.side === "buy" ? "cell-buy" : "cell-sell"}
                    >
                      {o.side}
                    </td>
                    <td>
                      {o.price != null ? formatNum(o.price, 2) : "—"}
                    </td>
                    <td>{o.qty != null ? formatNum(o.qty) : "—"}</td>
                    <td>
                      <StatusBadge status={o.status} />
                    </td>
                    <td>
                      {o.orderId && onCancelOrder && (
                        <button
                          type="button"
                          className="btn-cancel-order"
                          disabled={cancelLoadingId === o.orderId}
                          onClick={() => onCancelOrder(o.orderId!)}
                        >
                          {cancelLoadingId === o.orderId
                            ? "…"
                            : "Cancel"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}

        {tab === "history" && (
          <table className="data-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Market</th>
                <th>Side</th>
                <th>Price</th>
                <th>Qty</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="table-empty">
                    No orders yet.
                  </td>
                </tr>
              ) : (
                orders.map((o) => (
                  <tr key={`${o.orderId}-${o.submittedAt}`}>
                    <td>{formatTime(o.submittedAt)}</td>
                    <td>{o.market ?? "—"}</td>
                    <td
                      className={o.side === "buy" ? "cell-buy" : "cell-sell"}
                    >
                      {o.side ?? "—"}
                    </td>
                    <td>
                      {o.price != null ? formatNum(o.price, 2) : "—"}
                    </td>
                    <td>{o.qty != null ? formatNum(o.qty) : "—"}</td>
                    <td>
                      {o.error ? (
                        <span className="status-badge status-error">
                          {o.error}
                        </span>
                      ) : (
                        <StatusBadge status={o.status} />
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
