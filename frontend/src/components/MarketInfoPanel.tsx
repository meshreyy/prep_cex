import { useEffect, useState } from "react";
import { getMarket, type MarketId } from "../lib/markets";

type FundingInfo = {
  markPrice: number;
  indexPrice: number;
  fundingRate: number;
  nextFundingTime: number;
};

const FAPI = "https://fapi.binance.com/fapi/v1/premiumIndex";

export function MarketInfoPanel({
  market,
  livePrice,
}: {
  market: MarketId;
  livePrice: number | null;
}) {
  const { binanceSymbol, label } = getMarket(market);
  const [info, setInfo] = useState<FundingInfo | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      fetch(`${FAPI}?symbol=${binanceSymbol}`)
        .then((r) => r.json())
        .then((d) => {
          if (cancelled) return;
          setInfo({
            markPrice: Number(d.markPrice),
            indexPrice: Number(d.indexPrice),
            fundingRate: Number(d.lastFundingRate),
            nextFundingTime: Number(d.nextFundingTime),
          });
        })
        .catch(() => {});
    };
    load();
    const id = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [binanceSymbol]);

  const mark = livePrice ?? info?.markPrice;
  const fundingPct = (info?.fundingRate ?? 0) * 100;

  return (
    <div className="market-info-panel">
      <div className="market-info-row">
        <span>Mark ({label})</span>
        <strong>
          {mark != null
            ? mark.toLocaleString(undefined, { maximumFractionDigits: 2 })
            : "—"}
        </strong>
      </div>
      <div className="market-info-row">
        <span>Index</span>
        <strong>
          {info
            ? info.indexPrice.toLocaleString(undefined, {
                maximumFractionDigits: 2,
              })
            : "—"}
        </strong>
      </div>
      <div className="market-info-row">
        <span>Funding / 8h</span>
        <strong className={fundingPct >= 0 ? "up" : "down"}>
          {info ? `${fundingPct >= 0 ? "+" : ""}${fundingPct.toFixed(4)}%` : "—"}
        </strong>
      </div>
      {info && (
        <p className="market-info-foot">
          Next funding{" "}
          {new Date(info.nextFundingTime).toLocaleTimeString(undefined, {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      )}
    </div>
  );
}
