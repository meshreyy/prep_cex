import { BALANCES, ORDERS, POSITIONS } from "../store/perp-store";
import { OrderbookManager } from "../orderbook";
import { recordFills } from "../store/trade-store";
import { emitEvent } from "../utils/events";
import type { Order, OrderSide, OrderType } from "../store/perp-store";

export const onramp = async (payload: Record<string, unknown>) => {
    const userId = payload.userId as string;
    const amount = payload.amount as number;

    if (!BALANCES.has(userId)) {
        BALANCES.set(userId, { available: 0, locked: 0 });
    }

    BALANCES.get(userId)!.available += amount;

    await emitEvent("BALANCE_UPDATED", {
        userId,
        balance: BALANCES.get(userId),
    });

    return BALANCES.get(userId);
};

export const openPosition = async (payload: Record<string, unknown>) => {
    const userId = payload.userId as string;
    const market = payload.market as string;
    const side = payload.side as OrderSide;
    const qty = payload.qty as number;
    const price = payload.price as number;
    const orderType = payload.orderType as OrderType;

    const margin = (qty * price) / 10;
    const userBalance = BALANCES.get(userId);
    if (!userBalance || userBalance.available < margin) {
        return { ok: false, error: "Insufficient Balance" };
    }

    userBalance.available -= margin;
    userBalance.locked += margin;

    const order: Order = {
        orderId: crypto.randomUUID(),
        userId,
        market,
        side,
        qty,
        price,
        margin,
        orderType,
        status: "open",
        createdAt: Date.now(),
    };

    if (!ORDERS.has(userId)) ORDERS.set(userId, []);
    ORDERS.get(userId)!.push(order);

    await emitEvent("ORDER_CREATED", {
        orderId: order.orderId,
        qty,
        margin,
        price,
        market,
        side,
        orderType,
        userId,
        status: order.status,
        createdAt: order.createdAt,
    });

    const book = OrderbookManager.forMarket(market);
    const { filledQty, fills } = book.matchIncoming({
        side,
        orderType,
        limitPrice: price,
        qty,
        takerUserId: userId,
    });

    order.status =
        filledQty === qty
            ? "filled"
            : filledQty === 0
              ? "open"
              : "partially_filled";

    await emitEvent("ORDER_UPDATED", {
        orderId: order.orderId,
        status: order.status,
        filledQty,
        qty,
        price,
        margin,
    });

    if (fills.length > 0) recordFills(fills);

    for (const fill of fills) {
        await emitEvent("FILL_CREATED", {
            fillId: fill.fillId,
            orderId: order.orderId,
            maker: fill.maker,
            taker: fill.taker,
            market: fill.market,
            qty: fill.qty,
            price: fill.price,
            side: fill.side,
            long: fill.long,
            short: fill.short,
            createdAt: fill.createdAt,
        });
    }

    if (filledQty < qty && orderType === "limit") {
        book.addOrder({
            orderId: order.orderId,
            userId,
            side,
            market,
            price,
            qty: qty - filledQty,
            margin: (margin * (qty - filledQty)) / qty,
            createdAt: Date.now(),
        });
    }

    return order;
};

export const getEquity = async (payload: Record<string, unknown>) => {
    const userId = payload.userId as string;
    const userBalance = BALANCES.get(userId);
    if (!userBalance) return { available: 0, locked: 0 };
    return { available: userBalance.available, locked: userBalance.locked };
};

export const getOpenPosition = async (payload: Record<string, unknown>) => {
    const userId = payload.userId as string;
    const userPos = POSITIONS.get(userId);
    if (!userPos) return { existingPos: "No open positions" };
    return userPos.filter((p) => p.positionStatus === "open");
};

export const cancelPosition = async (payload: Record<string, unknown>) => {
    const orderId = payload.orderId as string;
    const userId = payload.userId as string;

    const userOrders = ORDERS.get(userId);
    if (!userOrders) return { error: "No orders" };

    const order = userOrders.find((o) => o.orderId === orderId);
    if (!order) return { error: "Order not found" };

    if (order.status === "filled" || order.status === "partially_filled") {
        return { error: "Orders cannot be cancelled" };
    }

    const book = OrderbookManager.forMarket(order.market);
    const removed = book.removeOrder(orderId, order.side, order.price);
    if (!removed) return { error: "Order not found on book" };

    const userBalance = BALANCES.get(userId);
    if (userBalance) {
        userBalance.available += order.margin;
        userBalance.locked -= order.margin;
    }

    order.status = "cancelled";

    await emitEvent("ORDER_CANCELLED", {
        orderId: order.orderId,
        side: order.side,
        qty: order.qty,
        margin: order.margin,
        orderType: order.orderType,
        price: order.price,
        status: order.status,
        market: order.market,
        userId,
    });

    return { orderId, status: "cancelled" };
};
