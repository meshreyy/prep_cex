import { ORDERBOOKS, MARK_PRICE } from "../store/perp-store";
import type { Fill, Orderbook, OrderSide, RestingOrder } from "../store/perp-store";
import { seedPriceFor } from "../market/seeds";
import type { DepthLevel, MatchParams, MatchResult } from "./types";

const managers = new Map<string, OrderbookManager>();

function createOrderbook(market: string): Orderbook {
    const seed = seedPriceFor(market) ?? 100;
    return {
        bids: new Map(),
        asks: new Map(),
        lastTradedPrice: seed,
        indexPrice: seed,
    };
}

export class OrderbookManager {
    private readonly market: string;
    private readonly orderbook: Orderbook;

    private constructor(market: string) {
        this.market = market;
        if (!ORDERBOOKS.has(market)) {
            const book = createOrderbook(market);
            ORDERBOOKS.set(market, book);
            MARK_PRICE.set(market, book.lastTradedPrice);
        }
        this.orderbook = ORDERBOOKS.get(market)!;
    }

    static forMarket(market: string): OrderbookManager {
        let mgr = managers.get(market);
        if (!mgr) {
            mgr = new OrderbookManager(market);
            managers.set(market, mgr);
        }
        return mgr;
    }

    getReferencePrice(): number | null {
        return this.getMidPrice() ?? this.getLastTradedPrice() ?? this.orderbook.indexPrice;
    }

    getMidPrice(): number | null {
        const bestBid = this.bestBid();
        const bestAsk = this.bestAsk();
        if (bestBid === null || bestAsk === null) return null;
        return (bestBid + bestAsk) / 2;
    }

    getLastTradedPrice(): number {
        return this.orderbook.lastTradedPrice;
    }

    getLevelOrderCount(side: OrderSide, price: number): number {
        const map = side === "buy" ? this.orderbook.bids : this.orderbook.asks;
        return map.get(price)?.length ?? 0;
    }

    addOrder(order: RestingOrder): void {
        const map = order.side === "buy" ? this.orderbook.bids : this.orderbook.asks;
        const level = map.get(order.price) ?? [];
        level.push(order);
        map.set(order.price, level);
    }

    removeOrder(orderId: string, side: OrderSide, price: number): boolean {
        const map = side === "buy" ? this.orderbook.bids : this.orderbook.asks;
        const level = map.get(price);
        if (!level) return false;

        const idx = level.findIndex((o) => o.orderId === orderId);
        if (idx === -1) return false;

        level.splice(idx, 1);
        if (level.length === 0) map.delete(price);
        return true;
    }

    matchIncoming(params: MatchParams): MatchResult {
        const { side, orderType, limitPrice, qty, takerUserId } = params;
        const isBuy = side === "buy";
        const opposite = isBuy ? this.orderbook.asks : this.orderbook.bids;

        let remainingQty = qty;
        let filledQty = 0;
        const fills: Fill[] = [];

        const prices = [...opposite.keys()].sort((a, b) =>
            isBuy ? a - b : b - a,
        );

        for (const price of prices) {
            if (remainingQty <= 0) break;

            if (orderType === "limit") {
                if (isBuy && limitPrice < price) break;
                if (!isBuy && limitPrice > price) break;
            }

            const level = opposite.get(price);
            if (!level?.length) continue;

            let i = 0;
            while (i < level.length && remainingQty > 0) {
                const resting = level[i]!;
                const matchQty = Math.min(remainingQty, resting.qty);
                const longUser = isBuy ? takerUserId : resting.userId;
                const shortUser = isBuy ? resting.userId : takerUserId;

                fills.push({
                    fillId: crypto.randomUUID(),
                    side: isBuy ? "long" : "short",
                    maker: resting.userId,
                    taker: takerUserId,
                    market: this.market,
                    qty: matchQty,
                    price,
                    long: longUser,
                    short: shortUser,
                    createdAt: Date.now(),
                });

                resting.qty -= matchQty;
                remainingQty -= matchQty;
                filledQty += matchQty;

                if (resting.qty <= 1e-12) {
                    level.splice(i, 1);
                } else {
                    i++;
                }
            }

            if (level.length === 0) opposite.delete(price);
        }

        if (fills.length > 0) {
            const lastPrice = fills[fills.length - 1]!.price;
            this.orderbook.lastTradedPrice = lastPrice;
            this.orderbook.indexPrice = lastPrice;
            MARK_PRICE.set(this.market, lastPrice);
        }

        return { filledQty, fills };
    }

    getDepthSnapshot(levels: number): {
        market: string;
        bids: DepthLevel[];
        asks: DepthLevel[];
        midPrice: number | null;
        spread: number | null;
        lastTradedPrice: number | null;
    } {
        const bids = [...this.orderbook.bids.entries()]
            .map(([price, orders]) => ({
                price,
                qty: orders.reduce((sum, o) => sum + o.qty, 0),
                orderCount: orders.length,
            }))
            .sort((a, b) => b.price - a.price)
            .slice(0, levels);

        const asks = [...this.orderbook.asks.entries()]
            .map(([price, orders]) => ({
                price,
                qty: orders.reduce((sum, o) => sum + o.qty, 0),
                orderCount: orders.length,
            }))
            .sort((a, b) => a.price - b.price)
            .slice(0, levels);

        const bestBid = bids[0]?.price ?? null;
        const bestAsk = asks[0]?.price ?? null;

        return {
            market: this.market,
            bids: bids.map(({ price, qty, orderCount }) => ({
                price,
                qty,
                orderCount,
            })),
            asks: asks.map(({ price, qty, orderCount }) => ({
                price,
                qty,
                orderCount,
            })),
            midPrice:
                bestBid !== null && bestAsk !== null
                    ? (bestBid + bestAsk) / 2
                    : null,
            spread:
                bestBid !== null && bestAsk !== null
                    ? bestAsk - bestBid
                    : null,
            lastTradedPrice: this.orderbook.lastTradedPrice || null,
        };
    }

    countBidLevels(): number {
        return this.orderbook.bids.size;
    }

    private bestBid(): number | null {
        const prices = [...this.orderbook.bids.keys()];
        return prices.length ? Math.max(...prices) : null;
    }

    private bestAsk(): number | null {
        const prices = [...this.orderbook.asks.keys()];
        return prices.length ? Math.min(...prices) : null;
    }
}
