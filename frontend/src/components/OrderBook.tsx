import { useEffect, useMemo, useState } from "react";
import {
  binanceWsUrl,
  parseDepthWs,
  type DepthLevel,
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

function formatQty(n: number) {
  return n >= 1 ? n.toFixed(4) : n.toFixed(6);
}

export function OrderBook({ symbol, onSelectPrice }: Props) {
  const [bids, setBids] = useState<DepthLevel[]>([]);
  const [asks, setAsks] = useState<DepthLevel[]>([]);

  useEffect(() => {
    const ws = new WebSocket(
      binanceWsUrl(`${symbol.toLowerCase()}@depth20@100ms`),
    );
    ws.onmessage = (ev) => {
      const data = JSON.parse(ev.data as string);
      const parsed = parseDepthWs(data);
      setBids(parsed.bids);
      setAsks(parsed.asks);
    };
    return () => ws.close();
  }, [symbol]);

  const maxQty = useMemo(() => {
    const all = [...bids, ...asks].map((l) => l.qty);
    return Math.max(...all, 0.0001);
  }, [bids, asks]);

  const mid =
    asks.length && bids.length
      ? (asks[asks.length - 1]!.price + bids[0]!.price) / 2
      : null;

  return (
    <div className="orderbook">
      <div className="orderbook-head">
        <span>Price (USDT)</span>
        <span>Size</span>
      </div>
      <div className="orderbook-asks">
        {asks.map((row) => (
          <div
            key={`a-${row.price}`}
            className="orderbook-row ask"
            role="button"
            tabIndex={0}
            onClick={() => onSelectPrice?.(row.price)}
            onKeyDown={(e) =>
              e.key === "Enter" && onSelectPrice?.(row.price)
            }
          >
            <div
              className="orderbook-depth"
              style={{ width: `${(row.qty / maxQty) * 100}%` }}
            />
            <span className="ob-price">{formatPrice(row.price)}</span>
            <span className="ob-qty">{formatQty(row.qty)}</span>
          </div>
        ))}
      </div>
      <div className="orderbook-mid">
        {mid != null && (
          <>
            <button
              type="button"
              className="orderbook-mid-price"
              onClick={() => onSelectPrice?.(mid)}
            >
              {formatPrice(mid)}
            </button>
            {asks[asks.length - 1] && bids[0] && (
              <span className="spread">
                Δ{" "}
                {formatPrice(
                  (asks[asks.length - 1]?.price ?? 0) - (bids[0]?.price ?? 0),
                )}
              </span>
            )}
          </>
        )}
      </div>
      <div className="orderbook-bids">
        {bids.map((row) => (
          <div
            key={`b-${row.price}`}
            className="orderbook-row bid"
            role="button"
            tabIndex={0}
            onClick={() => onSelectPrice?.(row.price)}
            onKeyDown={(e) =>
              e.key === "Enter" && onSelectPrice?.(row.price)
            }
          >
            <div
              className="orderbook-depth"
              style={{ width: `${(row.qty / maxQty) * 100}%` }}
            />
            <span className="ob-price">{formatPrice(row.price)}</span>
            <span className="ob-qty">{formatQty(row.qty)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
