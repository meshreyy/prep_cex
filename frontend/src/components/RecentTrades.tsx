import { useEffect, useState } from "react";
import {
  binanceWsUrl,
  parseAggTradeWs,
  type AggTrade,
} from "../lib/binance";

type Props = {
  symbol: string;
  onSelectPrice?: (price: number) => void;
};

function formatPrice(n: number) {
  return n >= 1000
    ? n.toLocaleString(undefined, { maximumFractionDigits: 2 })
    : n.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

export function RecentTrades({ symbol, onSelectPrice }: Props) {
  const [trades, setTrades] = useState<AggTrade[]>([]);

  useEffect(() => {
    const ws = new WebSocket(
      binanceWsUrl(`${symbol.toLowerCase()}@aggTrade`),
    );
    ws.onmessage = (ev) => {
      const data = JSON.parse(ev.data as string);
      const trade = parseAggTradeWs(data);
      setTrades((prev) => [trade, ...prev].slice(0, 28));
    };
    return () => ws.close();
  }, [symbol]);

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
            key={t.id}
            className={t.isBuyerMaker ? "sell" : "buy"}
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
              {new Date(t.time).toLocaleTimeString(undefined, {
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
