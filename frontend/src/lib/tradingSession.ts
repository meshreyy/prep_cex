import type { EngineOrder } from "./api";

export type SessionOrder = EngineOrder & {
  submittedAt: number;
};

const KEY = "perp_session_orders";

function storageKey(userId: string) {
  return `${KEY}:${userId}`;
}

export function loadSessionOrders(userId: string): SessionOrder[] {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return [];
    return JSON.parse(raw) as SessionOrder[];
  } catch {
    return [];
  }
}

export function saveSessionOrders(userId: string, orders: SessionOrder[]) {
  localStorage.setItem(storageKey(userId), JSON.stringify(orders.slice(0, 50)));
}

export function appendSessionOrder(
  userId: string,
  order: EngineOrder,
): SessionOrder[] {
  const entry: SessionOrder = { ...order, submittedAt: Date.now() };
  const next = [entry, ...loadSessionOrders(userId)].slice(0, 50);
  saveSessionOrders(userId, next);
  return next;
}

export type SessionPosition = {
  key: string;
  market: string;
  side: "long" | "short";
  qty: number;
  avgPrice: number;
  orders: number;
};

export function deriveSessionPositions(orders: SessionOrder[]): SessionPosition[] {
  const map = new Map<string, SessionPosition>();

  for (const o of orders) {
    if (!o.market || !o.side || !o.qty) continue;
    if (o.status !== "filled" && o.status !== "partially_filled") continue;

    const side = o.side === "buy" ? "long" : "short";
    const key = `${o.market}:${side}`;
    const existing = map.get(key);
    const price = o.price ?? 0;

    if (!existing) {
      map.set(key, {
        key,
        market: o.market,
        side,
        qty: o.qty,
        avgPrice: price,
        orders: 1,
      });
    } else {
      const totalQty = existing.qty + o.qty;
      existing.avgPrice =
        (existing.avgPrice * existing.qty + price * o.qty) / totalQty;
      existing.qty = totalQty;
      existing.orders += 1;
    }
  }

  return [...map.values()];
}
