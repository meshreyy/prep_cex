import type { ChartInterval } from "./markets";

const REST = "https://api.binance.com/api/v3";
const WS_BASE = "wss://stream.binance.com:9443/ws";

export type Candle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type Ticker24h = {
  lastPrice: number;
  priceChange: number;
  priceChangePercent: number;
  highPrice: number;
  lowPrice: number;
  volume: number;
};

export type DepthLevel = { price: number; qty: number };

export type AggTrade = {
  id: number;
  price: number;
  qty: number;
  time: number;
  isBuyerMaker: boolean;
};

export function binanceWsUrl(stream: string) {
  return `${WS_BASE}/${stream}`;
}

export async function fetchKlines(
  symbol: string,
  interval: ChartInterval,
  limit = 300,
): Promise<Candle[]> {
  const res = await fetch(
    `${REST}/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`,
  );
  if (!res.ok) throw new Error("Failed to load chart data");
  const raw = (await res.json()) as (string | number)[][];
  return raw.map((k) => ({
    time: Math.floor(Number(k[0]) / 1000),
    open: Number(k[1]),
    high: Number(k[2]),
    low: Number(k[3]),
    close: Number(k[4]),
    volume: Number(k[5]),
  }));
}

export async function fetchTicker24h(symbol: string): Promise<Ticker24h> {
  const res = await fetch(`${REST}/ticker/24hr?symbol=${symbol}`);
  if (!res.ok) throw new Error("Failed to load ticker");
  const t = await res.json();
  return {
    lastPrice: Number(t.lastPrice),
    priceChange: Number(t.priceChange),
    priceChangePercent: Number(t.priceChangePercent),
    highPrice: Number(t.highPrice),
    lowPrice: Number(t.lowPrice),
    volume: Number(t.volume),
  };
}

export function parseKlineWs(data: {
  k: {
    t: number;
    o: string;
    h: string;
    l: string;
    c: string;
    v: string;
    x: boolean;
  };
}): Candle {
  const k = data.k;
  return {
    time: Math.floor(k.t / 1000),
    open: Number(k.o),
    high: Number(k.h),
    low: Number(k.l),
    close: Number(k.c),
    volume: Number(k.v),
  };
}

export function parseDepthWs(data: {
  bids: [string, string][];
  asks: [string, string][];
}): { bids: DepthLevel[]; asks: DepthLevel[] } {
  return {
    bids: data.bids.slice(0, 14).map(([p, q]) => ({
      price: Number(p),
      qty: Number(q),
    })),
    asks: data.asks
      .slice(0, 14)
      .map(([p, q]) => ({ price: Number(p), qty: Number(q) }))
      .reverse(),
  };
}

export function parseAggTradeWs(data: {
  a: number;
  p: string;
  q: string;
  T: number;
  m: boolean;
}): AggTrade {
  return {
    id: data.a,
    price: Number(data.p),
    qty: Number(data.q),
    time: data.T,
    isBuyerMaker: data.m,
  };
}
