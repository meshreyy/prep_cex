import { useEffect, useRef, type MutableRefObject } from "react";
import {
  CandlestickSeries,
  ColorType,
  createChart,
  HistogramSeries,
  LineStyle,
  type IChartApi,
  type IPriceLine,
  type ISeriesApi,
  type UTCTimestamp,
} from "lightweight-charts";
import type { ChartInterval } from "../lib/markets";
import {
  binanceWsUrl,
  fetchKlines,
  parseKlineWs,
  type Candle,
} from "../lib/binance";

type Props = {
  symbol: string;
  interval: ChartInterval;
  markPrice?: number | null;
  limitPrice?: number | null;
  onPrice?: (price: number) => void;
};

function volumeColor(c: Candle) {
  return c.close >= c.open
    ? "rgba(14, 203, 129, 0.55)"
    : "rgba(246, 70, 93, 0.55)";
}

export function TradingChart({
  symbol,
  interval,
  markPrice,
  limitPrice,
  onPrice,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const markLineRef = useRef<IPriceLine | null>(null);
  const limitLineRef = useRef<IPriceLine | null>(null);
  const onPriceRef = useRef(onPrice);
  onPriceRef.current = onPrice;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const chart = createChart(el, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#848e9c",
        fontFamily: "'Segoe UI', system-ui, sans-serif",
      },
      grid: {
        vertLines: { color: "rgba(43, 49, 57, 0.5)" },
        horzLines: { color: "rgba(43, 49, 57, 0.5)" },
      },
      rightPriceScale: {
        borderColor: "#2b3139",
        scaleMargins: { top: 0.05, bottom: 0.28 },
      },
      timeScale: {
        borderColor: "#2b3139",
        timeVisible: true,
        secondsVisible: interval === "1m",
      },
      crosshair: {
        vertLine: { color: "rgba(240, 185, 11, 0.45)" },
        horzLine: { color: "rgba(240, 185, 11, 0.45)" },
      },
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#0ecb81",
      downColor: "#f6465d",
      borderUpColor: "#0ecb81",
      borderDownColor: "#f6465d",
      wickUpColor: "#0ecb81",
      wickDownColor: "#f6465d",
    });

    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "volume",
    });

    chart.priceScale("volume").applyOptions({
      scaleMargins: { top: 0.78, bottom: 0 },
    });

    chartRef.current = chart;
    seriesRef.current = series;
    volumeRef.current = volumeSeries;

    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0]?.contentRect ?? {
        width: 0,
        height: 0,
      };
      if (width > 0 && height > 0) {
        chart.applyOptions({ width, height });
      }
    });
    ro.observe(el);

    return () => {
      ro.disconnect();
      markLineRef.current = null;
      limitLineRef.current = null;
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      volumeRef.current = null;
    };
  }, [interval]);

  useEffect(() => {
    const series = seriesRef.current;
    if (!series) return;

    const upsertLine = (
      ref: MutableRefObject<IPriceLine | null>,
      value: number | null | undefined,
      color: string,
      title: string,
    ) => {
      if (value == null || value <= 0 || !Number.isFinite(value)) {
        if (ref.current) {
          series.removePriceLine(ref.current);
          ref.current = null;
        }
        return;
      }
      if (!ref.current) {
        ref.current = series.createPriceLine({
          price: value,
          color,
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title,
        });
      } else {
        ref.current.applyOptions({ price: value });
      }
    };

    upsertLine(markLineRef, markPrice, "#f0b90b", "Mark");
    upsertLine(limitLineRef, limitPrice, "#848e9c", "Limit");
  }, [markPrice, limitPrice]);

  useEffect(() => {
    const series = seriesRef.current;
    const volumeSeries = volumeRef.current;
    const chart = chartRef.current;
    if (!series || !volumeSeries || !chart) return;

    let cancelled = false;

    fetchKlines(symbol, interval)
      .then((candles) => {
        if (cancelled) return;
        series.setData(
          candles.map((c) => ({
            time: c.time as UTCTimestamp,
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
          })),
        );
        volumeSeries.setData(
          candles.map((c) => ({
            time: c.time as UTCTimestamp,
            value: c.volume,
            color: volumeColor(c),
          })),
        );
        const last = candles[candles.length - 1];
        if (last) onPriceRef.current?.(last.close);
        chart.timeScale().fitContent();
      })
      .catch(() => {});

    const ws = new WebSocket(
      binanceWsUrl(`${symbol.toLowerCase()}@kline_${interval}`),
    );

    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data as string) as Parameters<
        typeof parseKlineWs
      >[0];
      const candle = parseKlineWs(msg);

      series.update({
        time: candle.time as UTCTimestamp,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
      });
      volumeSeries.update({
        time: candle.time as UTCTimestamp,
        value: candle.volume,
        color: volumeColor(candle),
      });
      onPriceRef.current?.(candle.close);
    };

    return () => {
      cancelled = true;
      ws.close();
    };
  }, [symbol, interval]);

  return (
    <div className="chart-wrap">
      <div ref={containerRef} className="chart-canvas" />
      <span className="chart-volume-label">Volume</span>
    </div>
  );
}
