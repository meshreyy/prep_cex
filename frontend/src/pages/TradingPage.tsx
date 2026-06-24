import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { api, parsePositions, type OrderType, type Position } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { ROUTES } from "../lib/routes";
import {
  getMarket,
  CHART_INTERVALS,
  type ChartInterval,
  type MarketId,
} from "../lib/markets";
import {
  appendSessionOrder,
  loadSessionOrders,
  type SessionOrder,
} from "../lib/tradingSession";
import { TradingChart } from "../components/TradingChart";
import { OrderBook } from "../components/OrderBook";
import { RecentTrades } from "../components/RecentTrades";
import { MarketTickerBar } from "../components/MarketTickerBar";
import { TradingBottomPanel } from "../components/TradingBottomPanel";
import { AccountPanel } from "../components/AccountPanel";
import { OrderFormPanel } from "../components/OrderFormPanel";
import { MarketInfoPanel } from "../components/MarketInfoPanel";

type BottomTab = "positions" | "open" | "history";

export function TradingPage() {
  const navigate = useNavigate();
  const { user, balance, setBalance, isAuthenticated } = useAuth();
  const [market, setMarket] = useState<MarketId>("BTC-PERP");
  const [chartInterval, setChartInterval] = useState<ChartInterval>("1m");
  const [orderType, setOrderType] = useState<OrderType>("limit");
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [leverage, setLeverage] = useState(10);
  const [quantity, setQuantity] = useState("0.01");
  const [price, setPrice] = useState("");
  const [livePrice, setLivePrice] = useState<number | null>(null);
  const [sessionOrders, setSessionOrders] = useState<SessionOrder[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [bottomTab, setBottomTab] = useState<BottomTab>("positions");
  const [positions, setPositions] = useState<Position[]>([]);
  const [cancelLoadingId, setCancelLoadingId] = useState<string | null>(null);

  const config = getMarket(market);

  const refreshAccount = useCallback(async () => {
    if (!user) return;
    try {
      const bal = await api.getBalance(user.id);
      setBalance(bal);
      const pos = parsePositions(await api.getPositions(user.id));
      setPositions(pos);
    } catch {
      /* engine may be offline */
    }
  }, [user, setBalance]);

  useEffect(() => {
    if (user) setSessionOrders(loadSessionOrders(user.id));
  }, [user]);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    const run = async () => {
      try {
        const bal = await api.getBalance(user.id);
        if (!cancelled) setBalance(bal);
        const pos = parsePositions(await api.getPositions(user.id));
        if (!cancelled) setPositions(pos);
      } catch {
        /* engine may be offline */
      }
    };
    run();
    const id = window.setInterval(run, 15_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [user?.id, setBalance]);

  useEffect(() => {
    setPrice("");
    setLivePrice(null);
  }, [market]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const handleLivePrice = useCallback((p: number) => {
    setLivePrice(p);
    setPrice((prev) =>
      prev === "" ? String(Math.round(p * 100) / 100) : prev,
    );
  }, []);

  function useMarketPrice() {
    if (livePrice) setPrice(String(Math.round(livePrice * 100) / 100));
  }

  function handleBookPrice(p: number) {
    setPrice(String(p));
    setOrderType("limit");
  }

  async function handleOrder(e: FormEvent) {
    e.preventDefault();
    if (!user) {
      navigate(ROUTES.auth, { state: { from: ROUTES.home } });
      return;
    }

    const orderPrice =
      orderType === "market" && livePrice ? livePrice : Number(price);

    setError(null);
    setLoading(true);
    try {
      const res = await api.placeOrder({
        userId: user.id,
        market,
        side,
        quantity: Number(quantity),
        price: orderPrice,
        orderType,
      });

      const stored = { ...res, orderType, price: res.price ?? orderPrice };
      const next = appendSessionOrder(user.id, stored);
      setSessionOrders(next);

      if (res.ok === false || res.error) {
        setError(res.error ?? "Order rejected");
        setBottomTab("history");
      } else {
        setToast(
          res.status === "filled"
            ? "Order filled"
            : res.status === "open"
              ? "Order placed — resting on book"
              : "Order submitted",
        );
        setBottomTab(
          res.status === "open" || res.status === "partially_filled"
            ? "open"
            : "positions",
        );
      }
      await refreshAccount();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Order failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleCancelOrder(orderId: string) {
    if (!user) return;
    setCancelLoadingId(orderId);
    try {
      const res = await api.cancelOrder(user.id, orderId);
      if (res.error) {
        setError(res.error);
      } else {
        setToast("Order cancelled");
        setSessionOrders((prev) =>
          prev.map((o) =>
            o.orderId === orderId ? { ...o, status: "cancelled" as const } : o,
          ),
        );
        setBottomTab("open");
        await refreshAccount();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cancel failed");
    } finally {
      setCancelLoadingId(null);
    }
  }

  const limitPriceNum = Number(price) || null;

  return (
    <section className="trade-terminal">
      {toast && <div className="trade-toast">{toast}</div>}

      <MarketTickerBar
        market={market}
        livePrice={livePrice}
        onSelect={setMarket}
      />

      <div className="terminal-grid">
        <aside className="terminal-left">
          <div className="panel panel-glow orderbook-panel">
            <h3 className="panel-title">Order book</h3>
            <OrderBook
              market={market}
              onSelectPrice={handleBookPrice}
            />
          </div>
        </aside>

        <div className="terminal-center">
          <div className="panel panel-glow chart-panel">
            <div className="chart-toolbar">
              <span className="panel-title">{config.label}/USDT</span>
              <div className="interval-tabs">
                {CHART_INTERVALS.map((i) => (
                  <button
                    key={i.value}
                    type="button"
                    className={chartInterval === i.value ? "active" : ""}
                    onClick={() => setChartInterval(i.value)}
                  >
                    {i.label}
                  </button>
                ))}
              </div>
            </div>
            <TradingChart
              symbol={config.binanceSymbol}
              interval={chartInterval}
              markPrice={livePrice}
              limitPrice={orderType === "limit" ? limitPriceNum : null}
              onPrice={handleLivePrice}
            />
          </div>

          <div className="panel panel-glow terminal-bottom">
            <TradingBottomPanel
              tab={bottomTab}
              onTabChange={setBottomTab}
              orders={sessionOrders}
              positions={positions}
              onCancelOrder={handleCancelOrder}
              cancelLoadingId={cancelLoadingId}
            />
          </div>
        </div>

        <aside className="terminal-right">
          <AccountPanel />
          <MarketInfoPanel market={market} livePrice={livePrice} />
          <OrderFormPanel
            market={market}
            marketLabel={config.label}
            orderType={orderType}
            side={side}
            quantity={quantity}
            price={price}
            livePrice={livePrice}
            leverage={leverage}
            availableBalance={balance?.available ?? 0}
            loading={loading}
            error={error}
            onOrderType={setOrderType}
            onSide={setSide}
            onQuantity={setQuantity}
            onPrice={setPrice}
            onLeverage={setLeverage}
            onUseLastPrice={useMarketPrice}
            onSubmit={handleOrder}
            requiresAuth={!isAuthenticated}
          />
          <div className="panel panel-glow sidebar-panel trades-panel">
            <h3 className="panel-title">Recent trades</h3>
            <RecentTrades
              market={market}
              onSelectPrice={handleBookPrice}
            />
          </div>
        </aside>
      </div>
    </section>
  );
}
