import { useEffect, useMemo, useState } from "react";
import { api, type DepthLevel } from "../lib/api";

type Props = {
  market: string;
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

export function OrderBook({ market, onSelectPrice }: Props) {
  const [bids, setBids] = useState<DepthLevel[]>([]);
  const [asks, setAsks] = useState<DepthLevel[]>([]);

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      try {
        const depth = await api.getDepth(market, 20);
        if (cancelled) return;
        setBids(depth.bids);
        setAsks([...depth.asks].reverse());
      } catch {
        /* keep last snapshot on transient errors */
      }
    };

    void poll();
    const id = setInterval(() => void poll(), 1000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [market]);

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
