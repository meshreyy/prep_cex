import type { FormEvent } from "react";
import type { OrderType } from "../lib/api";
import type { MarketId } from "../lib/markets";

const LEVERAGE_OPTIONS = [1, 2, 5, 10, 20];

type Props = {
  market: MarketId;
  marketLabel: string;
  orderType: OrderType;
  side: "buy" | "sell";
  quantity: string;
  price: string;
  livePrice: number | null;
  leverage: number;
  availableBalance: number;
  loading: boolean;
  error: string | null;
  onOrderType: (t: OrderType) => void;
  onSide: (s: "buy" | "sell") => void;
  onQuantity: (q: string) => void;
  onPrice: (p: string) => void;
  onLeverage: (l: number) => void;
  onUseLastPrice: () => void;
  onSubmit: (e: FormEvent) => void;
  requiresAuth?: boolean;
};

export function OrderFormPanel({
  market,
  marketLabel,
  orderType,
  side,
  quantity,
  price,
  livePrice,
  leverage,
  availableBalance,
  loading,
  error,
  onOrderType,
  onSide,
  onQuantity,
  onPrice,
  onLeverage,
  onUseLastPrice,
  onSubmit,
  requiresAuth = false,
}: Props) {
  const priceNum =
    orderType === "market" && livePrice
      ? livePrice
      : Number(price) || 0;
  const qtyNum = Number(quantity) || 0;
  const estMargin =
    priceNum > 0 && qtyNum > 0 ? (qtyNum * priceNum) / 10 / leverage : 0;

  const maxQty =
    priceNum > 0 && availableBalance > 0
      ? (availableBalance * leverage) / (priceNum / 10)
      : 0;

  function setSizePercent(pct: number) {
    if (maxQty <= 0) return;
    const q = (maxQty * pct) / 100;
    onQuantity(String(Math.round(q * 10000) / 10000));
  }

  return (
    <div className="order-form-panel">
      <h3 className="panel-title">Place order</h3>
      <p className="order-market-tag">{market}</p>

      <div className="order-type-tabs">
        <button
          type="button"
          className={orderType === "limit" ? "active" : ""}
          onClick={() => onOrderType("limit")}
        >
          Limit
        </button>
        <button
          type="button"
          className={orderType === "market" ? "active" : ""}
          onClick={() => onOrderType("market")}
        >
          Market
        </button>
      </div>

      <label className="leverage-label">
        Leverage
        <div className="leverage-tabs">
          {LEVERAGE_OPTIONS.map((l) => (
            <button
              key={l}
              type="button"
              className={leverage === l ? "active" : ""}
              onClick={() => onLeverage(l)}
            >
              {l}x
            </button>
          ))}
        </div>
      </label>

      <form className="stack-form" onSubmit={onSubmit}>
        <div className="side-toggle">
          <button
            type="button"
            className={side === "buy" ? "active buy" : ""}
            onClick={() => onSide("buy")}
          >
            Buy / Long
          </button>
          <button
            type="button"
            className={side === "sell" ? "active sell" : ""}
            onClick={() => onSide("sell")}
          >
            Sell / Short
          </button>
        </div>

        <label>
          Size ({marketLabel})
          <input
            type="number"
            min="0"
            step="any"
            value={quantity}
            onChange={(e) => onQuantity(e.target.value)}
            required
          />
        </label>

        <div className="size-slider-block">
          <span className="size-slider-label">% of available</span>
          <div className="size-pct-btns">
            {[25, 50, 75, 100].map((p) => (
              <button
                key={p}
                type="button"
                className="size-pct-btn"
                onClick={() => setSizePercent(p)}
                disabled={maxQty <= 0}
              >
                {p}%
              </button>
            ))}
          </div>
        </div>

        {orderType === "limit" ? (
          <label>
            Price
            <div className="price-input-row">
              <input
                type="number"
                min="0"
                step="any"
                value={price}
                onChange={(e) => onPrice(e.target.value)}
                required
              />
              <button
                type="button"
                className="btn btn-ghost btn-xs"
                onClick={onUseLastPrice}
                title="Use last price"
              >
                Last
              </button>
            </div>
          </label>
        ) : (
          <p className="market-price-hint">
            Market ≈{" "}
            <strong>
              {livePrice
                ? livePrice.toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })
                : "—"}
            </strong>
          </p>
        )}

        <div className="order-estimate">
          <span>Est. margin</span>
          <strong>${estMargin.toFixed(2)}</strong>
        </div>

        <button
          type="submit"
          className={`btn btn-block ${side === "buy" ? "btn-buy" : "btn-sell"}`}
          disabled={loading}
        >
          {loading
            ? "Submitting…"
            : requiresAuth
              ? "Login to trade"
              : `${side === "buy" ? "Buy" : "Sell"} ${marketLabel}`}
        </button>
      </form>

      {error && <p className="form-error">{error}</p>}
    </div>
  );
}
