import { OrderbookManager } from "../orderbook";

export function initMarkets(markets: string[]): void {
    for (const market of markets) {
        OrderbookManager.forMarket(market);
    }
    console.log(`Initialized order books for: ${markets.join(", ")}`);
}
