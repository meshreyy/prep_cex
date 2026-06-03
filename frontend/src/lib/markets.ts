export type MarketId = "BTC-PERP" | "ETH-PERP";

export type ChartInterval = "1m" | "5m" | "15m" | "1h" | "4h";

export type MarketConfig = {
  id: MarketId;
  label: string;
  base: string;
  binanceSymbol: string;
};

export const MARKETS: MarketConfig[] = [
  { id: "BTC-PERP", label: "BTC", base: "BTC", binanceSymbol: "BTCUSDT" },
  { id: "ETH-PERP", label: "ETH", base: "ETH", binanceSymbol: "ETHUSDT" },
];

export function getMarket(id: MarketId): MarketConfig {
  return MARKETS.find((m) => m.id === id) ?? MARKETS[0];
}

export const CHART_INTERVALS: { value: ChartInterval; label: string }[] = [
  { value: "1m", label: "1m" },
  { value: "5m", label: "5m" },
  { value: "15m", label: "15m" },
  { value: "1h", label: "1H" },
  { value: "4h", label: "4H" },
];
