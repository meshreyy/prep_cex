import { useEffect, useState } from "react";
import { fetchTicker24h, type Ticker24h } from "../lib/binance";
import { MARKETS, type MarketId } from "../lib/markets";

type Props = {
  market: MarketId;
  livePrice: number | null;
  onSelect: (id: MarketId) => void;
};

function formatUsd(n: number, digits = 2) {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function MarketTickerBar({ market, livePrice, onSelect }: Props) {
  const config = MARKETS.find((m) => m.id === market)!;
  const [stats, setStats] = useState<Ticker24h | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchTicker24h(config.binanceSymbol)
      .then((t) => {
        if (!cancelled) setStats(t);
      })
      .catch(() => {});
    const id = setInterval(() => {
      fetchTicker24h(config.binanceSymbol)
        .then((t) => {
          if (!cancelled) setStats(t);
        })
        .catch(() => {});
    }, 30_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [config.binanceSymbol]);

  const price = livePrice ?? stats?.lastPrice ?? 0;
  const changePct = stats?.priceChangePercent ?? 0;
  const up = changePct >= 0;

  return (
    <div className="market-bar">
      <div className="market-tabs">
        {MARKETS.map((m) => (
          <button
            key={m.id}
            type="button"
            className={`market-tab ${m.id === market ? "active" : ""}`}
            onClick={() => onSelect(m.id)}
          >
            {m.label}
            <span className="market-tab-sub">PERP</span>
          </button>
        ))}
      </div>

      <div className="market-stats">
        <div className="market-price-block">
          <span className={`market-price ${up ? "up" : "down"}`}>
            {formatUsd(price, price >= 100 ? 2 : 4)}
          </span>
          <span className={`market-change ${up ? "up" : "down"}`}>
            {up ? "+" : ""}
            {changePct.toFixed(2)}%
          </span>
        </div>
        <dl className="market-meta">
          <div>
            <dt>24h High</dt>
            <dd>{stats ? formatUsd(stats.highPrice) : "—"}</dd>
          </div>
          <div>
            <dt>24h Low</dt>
            <dd>{stats ? formatUsd(stats.lowPrice) : "—"}</dd>
          </div>
          <div>
            <dt>24h Vol</dt>
            <dd>
              {stats
                ? `${(stats.volume / 1000).toFixed(1)}K ${config.base}`
                : "—"}
            </dd>
          </div>
        </dl>
      </div>

      <span className="market-feed-badge">
        <span className="live-dot" />
        Binance index
      </span>
    </div>
  );
}
