const API_BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

export type AuthUser = {
  id: string;
  username: string;
};

export type Balance = {
  available: number;
  locked: number;
};

export type OrderType = "limit" | "market";

export type EngineOrder = {
  ok?: boolean;
  error?: string;
  orderId?: string;
  userId?: string;
  market?: string;
  side?: "buy" | "sell";
  qty?: number;
  price?: number;
  margin?: number;
  orderType?: OrderType;
  status?: "open" | "filled" | "cancelled" | "partially_filled";
  createdAt?: number;
};

export type Position = {
  positionId: string;
  userId: string;
  market: string;
  type: "long" | "short";
  qty: number;
  margin: number;
  unrealizedPnl: number;
  realizedPnl: number;
  averagePrice: number;
  liquidationPrice: number;
  positionStatus: "open" | "closed";
  createdAt: number;
};

export function getApiBaseUrl() {
  return API_BASE;
}

export function isApiConfigured() {
  if (import.meta.env.DEV && !API_BASE) return true;
  return Boolean(API_BASE);
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${API_BASE}${path}`;

  let res: Response;
  try {
    res = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    });
  } catch {
    throw new Error(
      import.meta.env.PROD && !API_BASE
        ? "API URL not configured. Set VITE_API_URL when deploying the frontend."
        : "Cannot reach the API. Is the backend running?",
    );
  }

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const message =
      typeof data === "string"
        ? data
        : ((data as { error?: string } | null)?.error ?? res.statusText);
    throw new Error(message || "Request failed");
  }

  return data as T;
}

export function normalizeBalance(data: unknown): Balance {
  if (!data || typeof data !== "object") {
    return { available: 0, locked: 0 };
  }
  const d = data as Record<string, unknown>;
  const nested =
    d.balance && typeof d.balance === "object"
      ? (d.balance as Record<string, unknown>)
      : d;
  return {
    available: Number(nested.available) || 0,
    locked: Number(nested.locked) || 0,
  };
}

export function parsePositions(
  data: Position[] | { existingPos?: string },
): Position[] {
  if (Array.isArray(data)) return data;
  return [];
}

export const api = {
  signup(username: string, password: string) {
    return request<string>("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
  },

  signin(username: string, password: string) {
    return request<{ token: string; user: AuthUser }>("/api/auth/signin", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
  },

  async getBalance(userId: string) {
    const data = await request<unknown>(
      `/api/perps/balance?userId=${encodeURIComponent(userId)}`,
    );
    return normalizeBalance(data);
  },

  getPositions(userId: string) {
    return request<Position[] | { existingPos?: string }>(
      `/api/perps/positions?userId=${encodeURIComponent(userId)}`,
    );
  },

  async onramp(userId: string, amount: number) {
    const data = await request<unknown>("/api/perps/onramp", {
      method: "POST",
      body: JSON.stringify({ userId, amount }),
    });
    return normalizeBalance(data);
  },

  placeOrder(body: {
    userId: string;
    market: string;
    side: "buy" | "sell";
    quantity: number;
    price: number;
    orderType?: OrderType;
  }) {
    return request<EngineOrder>("/api/perps/order", {
      method: "POST",
      body: JSON.stringify({
        userId: body.userId,
        market: body.market,
        side: body.side,
        qty: body.quantity,
        price: body.price,
        orderType: body.orderType ?? "limit",
      }),
    });
  },

  cancelOrder(userId: string, orderId: string) {
    return request<{ orderId?: string; status?: string; error?: string }>(
      "/api/perps/cancel",
      {
        method: "POST",
        body: JSON.stringify({ userId, orderId }),
      },
    );
  },
};
