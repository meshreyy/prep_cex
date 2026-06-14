import { useEffect, useState } from "react";
import { api, type PublicTrade } from "../lib/api";

type Props = {
  market: string;
  onSelectPrice?: (price: number) => void;
};

function formatPrice(n: number) {
  return n >= 1000
    ? n.toLocaleString(undefined, { maximumFractionDigits: 2 })
    : n.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

export function RecentTrades({ market, onSelectPrice }: Props) {
  const [trades, setTrades] = useState<PublicTrade[]>([]);

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      try {
        const { trades: next } = await api.getTrades(market, 28);
        if (!cancelled) setTrades(next);
      } catch {
        /* keep last tape on transient errors */
      }
    };

    void poll();
    const id = setInterval(() => void poll(), 1500);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [market]);

  return (
    <div className="recent-trades">
      <div className="recent-trades-head">
        <span>Price</span>
        <span>Qty</span>
        <span>Time</span>
      </div>
      <ul className="recent-trades-list">
        {trades.map((t) => (
          <li
            key={t.fillId}
            className={t.takerSide === "buy" ? "buy" : "sell"}
            role="button"
            tabIndex={0}
            onClick={() => onSelectPrice?.(t.price)}
            onKeyDown={(e) =>
              e.key === "Enter" && onSelectPrice?.(t.price)
            }
          >
            <span>{formatPrice(t.price)}</span>
            <span>{t.qty.toFixed(4)}</span>
            <span>
              {new Date(t.createdAt).toLocaleTimeString(undefined, {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </span>
          </li>
        ))}
        {trades.length === 0 && (
          <li className="trades-empty">Waiting for trades…</li>
        )}
      </ul>
    </div>
  );
}
