import { FILLS, MARK_PRICE } from "./perp-store";
import type { Fill } from "./perp-store";

const MAX = 500;

export type PublicTrade = {
    fillId: string;
    market: string;
    price: number;
    qty: number;
    createdAt: number;
    takerSide: "buy" | "sell";
};

export function recordFills(fills: Fill[]): void {
    for (const fill of fills) {
        const list = FILLS.get(fill.market) ?? [];
        list.unshift(fill);
        if (list.length > MAX) list.length = MAX;
        FILLS.set(fill.market, list);
        MARK_PRICE.set(fill.market, fill.price);
    }
}

export function getRecentTrades(market: string, limit = 50): PublicTrade[] {
    return (FILLS.get(market) ?? []).slice(0, limit).map((f) => ({
        fillId: f.fillId,
        market: f.market,
        price: f.price,
        qty: f.qty,
        createdAt: f.createdAt,
        takerSide: f.side === "long" ? "buy" : "sell",
    }));
}
