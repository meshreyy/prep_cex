import { test, expect, beforeEach } from "bun:test";
import { ORDERBOOKS, MARK_PRICE } from "../store/perp-store";
import { OrderbookManager } from "./OrderbookManager";

beforeEach(() => {
    ORDERBOOKS.clear();
    MARK_PRICE.clear();
});

test("matchIncoming fills against resting asks", () => {
    const book = OrderbookManager.forMarket("BTC-PERP");

    book.addOrder({
        orderId: "ask-1",
        userId: "maker",
        side: "sell",
        market: "BTC-PERP",
        price: 90_000,
        qty: 0.01,
        margin: 90,
        createdAt: Date.now(),
    });

    const { filledQty, fills } = book.matchIncoming({
        side: "buy",
        orderType: "limit",
        limitPrice: 90_000,
        qty: 0.01,
        takerUserId: "taker",
    });

    expect(filledQty).toBe(0.01);
    expect(fills).toHaveLength(1);
    expect(fills[0]?.price).toBe(90_000);
    expect(fills[0]?.long).toBe("taker");
    expect(fills[0]?.short).toBe("maker");
});

test("getDepthSnapshot returns bid and ask levels", () => {
    const book = OrderbookManager.forMarket("ETH-PERP");

    book.addOrder({
        orderId: "bid-1",
        userId: "mm",
        side: "buy",
        market: "ETH-PERP",
        price: 3_190,
        qty: 0.5,
        margin: 0,
        createdAt: Date.now(),
    });
    book.addOrder({
        orderId: "ask-1",
        userId: "mm",
        side: "sell",
        market: "ETH-PERP",
        price: 3_210,
        qty: 0.4,
        margin: 0,
        createdAt: Date.now(),
    });

    const depth = book.getDepthSnapshot(10);
    expect(depth.bids).toHaveLength(1);
    expect(depth.asks).toHaveLength(1);
    expect(depth.bids[0]?.price).toBe(3_190);
    expect(depth.asks[0]?.price).toBe(3_210);
    expect(depth.midPrice).toBe(3_200);
});
