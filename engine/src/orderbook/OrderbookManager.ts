import { ORDERBOOKS } from "../store/perp-store";
import type { Orderbook } from "../store/perp-store";


export class OrderbookManager {
    private market  :string;
    private orderbook : Orderbook;

    constructor(market : string) {
        this.market = market;
        this.orderbook = ORDERBOOKS.get(market)!;
    }

    countBidLevels() : number {
        return this.orderbook.bids.size;
    }
}

