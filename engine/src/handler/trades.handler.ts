import { getRecentTrades } from "../store/trade-store";

export const getTrades = async (payload: Record<string, unknown>) => {
    const market = payload.market as string;
    const limit = Number(payload.limit) || 50;
    if (!market?.trim()) return { error: "market required" };
    return { market, trades: getRecentTrades(market, limit) };
};
