import { OrderbookManager } from "../orderbook";
import { recordFills } from "../store/trade-store";
import { MARK_PRICE } from "../store/perp-store";
import type { OrderSide, RestingOrder } from "../store/perp-store";
import type { SimulationConfig } from "../utils/config";

const MM_USER = "sim-mm";
const FLOW_USER = "sim-flow";

function rand(min: number, max: number): number {
    return min + Math.random() * (max - min);
}

function roundQty(q: number): number {
    return Math.round(q * 10_000) / 10_000;
}

function pickSide(): OrderSide {
    return Math.random() < 0.5 ? "buy" : "sell";
}

function makeResting(
    market: string,
    userId: string,
    side: OrderSide,
    price: number,
    qty: number,
    slot: number,
): RestingOrder {
    return {
        orderId: `${userId}-${market}-${side}-${price}-${slot}-${Date.now()}`,
        userId,
        side,
        market,
        price,
        qty: roundQty(qty),
        margin: 0,
        createdAt: Date.now(),
    };
}

/**
 * Keeps the book alive like a real exchange:
 * 1. Market maker — resting liquidity on both sides
 * 2. Flow bot — random market buys/sells that cross the spread and print trades
 * 3. Noise — occasional random limit orders near mid
 */
export class SimulationWorker {
    private tickCount = 0;

    constructor(private readonly config: SimulationConfig) {}

    start(): () => void {
        void this.runTick();
        const id = setInterval(() => void this.runTick(), this.config.intervalMs);
        console.log(
            `[simulation] Running on ${this.config.markets.join(", ")} every ${this.config.intervalMs}ms`,
        );
        return () => clearInterval(id);
    }

    private async runTick(): Promise<void> {
        this.tickCount++;
        for (const market of this.config.markets) {
            try {
                const book = OrderbookManager.forMarket(market);
                const ref = book.getReferencePrice();
                if (ref === null || ref <= 0) continue;

                this.replenishLiquidity(book, market, ref);
                await this.randomFlow(book, market, ref);
                this.randomLimitNoise(book, market, ref);
                syncMarkFromBook(book, market);
            } catch (err) {
                console.error(`[simulation] ${market} tick error:`, err);
            }
        }
    }

    /** Layer 1: keep ~N price levels with 2 orders each side. */
    private replenishLiquidity(
        book: OrderbookManager,
        market: string,
        mid: number,
    ): void {
        const { tickSize, levels, qtyMin, qtyMax, ordersPerLevel } = this.config;

        for (let i = 1; i <= levels; i++) {
            const jitter = rand(-tickSize * 0.25, tickSize * 0.25);
            const bidPrice = Math.round((mid - i * tickSize + jitter) / tickSize) * tickSize;
            const askPrice = Math.round((mid + i * tickSize + jitter) / tickSize) * tickSize;

            this.ensureLevel(book, market, "buy", bidPrice, qtyMin, qtyMax, ordersPerLevel);
            this.ensureLevel(book, market, "sell", askPrice, qtyMin, qtyMax, ordersPerLevel);
        }
    }

    private ensureLevel(
        book: OrderbookManager,
        market: string,
        side: OrderSide,
        price: number,
        qtyMin: number,
        qtyMax: number,
        target: number,
    ): void {
        if (price <= 0) return;
        const existing = book.getLevelOrderCount(side, price);
        for (let slot = existing; slot < target; slot++) {
            book.addOrder(
                makeResting(
                    market,
                    MM_USER,
                    side,
                    price,
                    rand(qtyMin, qtyMax),
                    slot,
                ),
            );
        }
    }

    /** Layer 2: random taker flow — crosses spread, generates fills & tape activity. */
    private async randomFlow(
        book: OrderbookManager,
        market: string,
        mid: number,
    ): Promise<void> {
        if (Math.random() > this.config.takerProbability) return;

        const side = pickSide();
        const qty = roundQty(rand(this.config.qtyMin, this.config.qtyMax * 0.6));
        const takerId = `${FLOW_USER}-${crypto.randomUUID().slice(0, 8)}`;

        const { filledQty, fills } = book.matchIncoming({
            side,
            orderType: "market",
            limitPrice: side === "buy" ? mid * 1.05 : mid * 0.95,
            qty,
            takerUserId: takerId,
        });

        if (filledQty > 0) {
            recordFills(fills);
            console.log(
                `[simulation] ${market} ${side} ${filledQty}@${fills[0]?.price ?? mid} (${fills.length} fill(s))`,
            );
        }
    }

    /** Layer 3: random passive limits — adds organic depth near touch. */
    private randomLimitNoise(
        book: OrderbookManager,
        market: string,
        mid: number,
    ): void {
        if (Math.random() > this.config.noiseProbability) return;

        const side = pickSide();
        const offset = rand(1, 5) * this.config.tickSize;
        const price =
            side === "buy"
                ? Math.round((mid - offset) / this.config.tickSize) * this.config.tickSize
                : Math.round((mid + offset) / this.config.tickSize) * this.config.tickSize;

        if (book.getLevelOrderCount(side, price) >= this.config.ordersPerLevel) return;

        book.addOrder(
            makeResting(
                market,
                `${FLOW_USER}-limit`,
                side,
                price,
                rand(this.config.qtyMin * 0.5, this.config.qtyMax * 0.5),
                0,
            ),
        );
    }
}

function syncMarkFromBook(book: OrderbookManager, market: string): void {
    const price = book.getMidPrice() ?? book.getLastTradedPrice();
    if (price > 0) MARK_PRICE.set(market, price);
}

export function startSimulation(config: SimulationConfig): () => void {
    if (!config.enabled) {
        console.log("[simulation] Disabled");
        return () => {};
    }
    return new SimulationWorker(config).start();
}
