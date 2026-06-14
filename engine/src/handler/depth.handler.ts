import { OrderbookManager } from "../orderbook";

export const getDepth = async (payload: Record<string, unknown>) => {
    const market = payload.market as string;
    const levels = Number(payload.levels) || 20;
    if (!market?.trim()) return { error: "market required" };
    return OrderbookManager.forMarket(market).getDepthSnapshot(levels);
};
