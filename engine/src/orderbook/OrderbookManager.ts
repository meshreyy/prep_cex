import { ORDERBOOKS } from "../store/perp-store";
import type {
    Fill,
    Orderbook,
    OrderSide,
    RestingOrder,
} from "../store/perp-store";
import { seedPriceFor } from "../market/seeds";
import type { DepthLevel, MatchParams, MatchResult } from "./types";

function emptyBook(): Orderbook {
    return {
        asks: new Map(),
        bids: new Map(),
        lastTradedPrice: 0,
        indexPrice: 0,
    };
}

/** Sole gatekeeper for bid/ask state. */
export class OrderbookManager {
    private readonly market: string;
    private readonly book: Orderbook;

    private constructor(market: string, book: Orderbook) {
        this.market = market;
        this.book = book;
    }

    static forMarket(market: string): OrderbookManager {
        let book = ORDERBOOKS.get(market);
        if (!book) {
            book = emptyBook();
            const seed = seedPriceFor(market);
            if (seed !== null) {
                book.indexPrice = seed;
                book.lastTradedPrice = seed;
            }
            ORDERBOOKS.set(market, book);
        }
        return new OrderbookManager(market, book);
    }

    getMarket(): string {
        return this.market;
    }

    countBidLevels(): number {
        return this.book.bids.size;
    }

    countAskLevels(): number {
        return this.book.asks.size;
    }

    getBestBid(): number | null {
        if (this.book.bids.size === 0) return null;
        return Math.max(...this.book.bids.keys());
    }

    getBestAsk(): number | null {
        if (this.book.asks.size === 0) return null;
        return Math.min(...this.book.asks.keys());
    }

    getSpread(): number | null {
        const bid = this.getBestBid();
        const ask = this.getBestAsk();
        if (bid === null || ask === null) return null;
        return ask - bid;
    }

    getMidPrice(): number | null {
        const bid = this.getBestBid();
        const ask = this.getBestAsk();
        if (bid === null || ask === null) return null;
        return (bid + ask) / 2;
    }

    getReferencePrice(): number | null {
        const mid = this.getMidPrice();
        if (mid !== null) return mid;
        if (this.book.lastTradedPrice > 0) return this.book.lastTradedPrice;
        if (this.book.indexPrice > 0) return this.book.indexPrice;
        return seedPriceFor(this.market);
    }

    getLastTradedPrice(): number {
        return this.book.lastTradedPrice;
    }

    updateLastTradedPrice(price: number): void {
        this.book.lastTradedPrice = price;
        this.book.indexPrice = price;
    }

    addOrder(order: RestingOrder): void {
        const side = this.sideMap(order.side);
        let level = side.get(order.price);
        if (!level) {
            level = [];
            side.set(order.price, level);
        }
        level.push(order);
    }

    removeOrder(orderId: string, side: OrderSide, price: number): boolean {
        const level = this.sideMap(side).get(price);
        if (!level) return false;
        const idx = level.findIndex((o) => o.orderId === orderId);
        if (idx === -1) return false;
        level.splice(idx, 1);
        if (level.length === 0) this.sideMap(side).delete(price);
        return true;
    }

    getTopNLevels(n: number, side: OrderSide): DepthLevel[] {
        const map = this.sideMap(side);
        const prices = [...map.keys()].sort((a, b) =>
            side === "buy" ? b - a : a - b,
        );
        return prices.slice(0, n).map((price) => {
            const orders = map.get(price)!;
            return {
                price,
                qty: orders.reduce((s, o) => s + o.qty, 0),
                orderCount: orders.length,
            };
        });
    }

    getVolumeAtPrice(side: OrderSide, price: number): number {
        const orders = this.sideMap(side).get(price);
        if (!orders) return 0;
        return orders.reduce((s, o) => s + o.qty, 0);
    }

    getLevelOrderCount(side: OrderSide, price: number): number {
        return this.sideMap(side).get(price)?.length ?? 0;
    }

    getTotalBidVolume(): number {
        return this.sumSideVolume("buy");
    }

    getTotalAskVolume(): number {
        return this.sumSideVolume("sell");
    }

    getDepthSnapshot(levels = 20) {
        return {
            market: this.market,
            bids: this.getTopNLevels(levels, "buy"),
            asks: this.getTopNLevels(levels, "sell"),
            spread: this.getSpread(),
            midPrice: this.getMidPrice(),
            lastTradedPrice: this.getLastTradedPrice(),
            indexPrice: this.book.indexPrice,
            totalBidVolume: this.getTotalBidVolume(),
            totalAskVolume: this.getTotalAskVolume(),
        };
    }

    matchIncoming(params: MatchParams): MatchResult {
        const { side, orderType, limitPrice, qty, takerUserId } = params;
        const opposite: OrderSide = side === "buy" ? "sell" : "buy";

        let filledQty = 0;
        const fills: Fill[] = [];

        while (filledQty < qty) {
            const bestPrice =
                side === "buy" ? this.getBestAsk() : this.getBestBid();
            if (bestPrice === null) break;

            if (
                orderType === "limit" &&
                ((side === "buy" && limitPrice < bestPrice) ||
                    (side === "sell" && limitPrice > bestPrice))
            ) {
                break;
            }

            const level = [...(this.sideMap(opposite).get(bestPrice) ?? [])];

            for (const resting of level) {
                if (filledQty >= qty) break;

                const live = this.findOrder(opposite, bestPrice, resting.orderId);
                if (!live || live.qty <= 0) continue;

                const matchQty = Math.min(qty - filledQty, live.qty);
                const priorQty = live.qty;
                if (priorQty > 0 && live.margin > 0) {
                    live.margin -= (matchQty / priorQty) * live.margin;
                }
                live.qty -= matchQty;
                filledQty += matchQty;

                if (live.qty === 0) {
                    this.removeOrder(live.orderId, opposite, bestPrice);
                }

                fills.push({
                    fillId: crypto.randomUUID(),
                    side: side === "buy" ? "long" : "short",
                    maker: live.userId,
                    taker: takerUserId,
                    market: this.market,
                    price: bestPrice,
                    qty: matchQty,
                    long: side === "buy" ? takerUserId : live.userId,
                    short: side === "sell" ? takerUserId : live.userId,
                    createdAt: Date.now(),
                });

                this.updateLastTradedPrice(bestPrice);
            }
        }

        return { filledQty, fills };
    }

    private sideMap(side: OrderSide): Map<number, RestingOrder[]> {
        return side === "buy" ? this.book.bids : this.book.asks;
    }

    private findOrder(
        side: OrderSide,
        price: number,
        orderId: string,
    ): RestingOrder | undefined {
        return this.sideMap(side).get(price)?.find((o) => o.orderId === orderId);
    }

    private sumSideVolume(side: OrderSide): number {
        let total = 0;
        for (const orders of this.sideMap(side).values()) {
            for (const o of orders) total += o.qty;
        }
        return total;
    }
}
