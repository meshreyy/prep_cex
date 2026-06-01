import { date } from "zod";
import { BALANCES, ORDERBOOKS, ORDERS, FILLS, POSITIONS } from "../store/perp-store";
import { emitEvent } from "../utils/events";
import type { Fill, Order, Orderbook, OrderSide, OrderType, Position } from "../store/perp-store";

//user deposits money
//inc available bal in BALANCES map
//emit BALANCE_UPDATED event for DB poller


//userId and amount from payload
export const onramp = async (payload: Record<string, unknown>) => {
    const userId = payload.userId as string;
    const amount = payload.amount as number;

    if (!BALANCES.has(userId)) {
        BALANCES.set(userId, { available: 0, locked: 0 });
    }

    const updatedBal = BALANCES.get(userId)!.available += amount;
    //emitEvent should emit user's balance, not all balances
    //db poller needs both (available, locked) fields to update Postgres 
    await emitEvent("BALANCE_UPDATED", {
        userId,
        balance: BALANCES.get(userId)
    })

    return BALANCES.get(userId);
}


//validates user has enough balance
//locks req.margin
//creates an order
//matches against orderbook
export const openPosition = async (payload: Record<string, unknown>) => {
    //creates the trade
    const userId = payload.userId as string;
    const market = payload.market as string;
    const side = payload.side as OrderSide; //(not string bcz it has to be between these and can't be any string)
    const qty = payload.qty as number;
    const price = payload.price as number;
    const orderType = payload.orderType as OrderType;


    const margin = qty * price / 10;
    //check if user has enough balance
    const userBalance = BALANCES.get(userId);
    if (!userBalance || userBalance.available < margin) {
        return { ok: false, error: "Insufficient Balance" };
    }
    //lock margin
    userBalance.available -= margin;
    userBalance.locked += margin;

    //create order
    const order: Order = {
        orderId: crypto.randomUUID(),
        userId, market, side, qty, price, margin, orderType,
        status: "open",
        createdAt: Date.now()

    }
    //check for orders array, if not then create an empty array
    if (!ORDERS.has(userId)) ORDERS.set(userId, []);
    ORDERS.get(userId)!.push(order);


    //emit the events
    //what fields DB poller need to save an order to postgres

    await emitEvent("ORDER_CREATED", {
        orderId: order.orderId,
        qty, margin, price, market, side, orderType, userId,
        status: order.status,
        createdAt: Date.now()
    })


    //matching of the order -> matching against existing orders
    
    if (!ORDERBOOKS.has(market)) {
        ORDERBOOKS.set(market, {
            asks: new Map(),
            bids: new Map(),
            lastTradedPrice: 0,
            indexPrice: 0
        });

    }

    const book = ORDERBOOKS.get(market)!;
    const { filledQty, fills, takerPositions, makerPositions } = matchOrder(book, side, orderType, price, qty, margin, market, userId);

    //Set status here - AFTER matchOrder returns
    order.status = filledQty === qty ? "filled" : filledQty === 0 ? "open" : "partially_filled";

    //fills
    await emitEvent("ORDER_UPDATED", {
        orderId : order.orderId,
        status : order.status,
        filledQty,
        qty,
        price,
        margin
    });

    //emit FILL_CREATED for each fill
    for(const fill of fills) {
        await emitEvent("FILL_CREATED", {
            fillId : fill.fillId,
            maker : fill.maker,
            taker : fill.taker,
            market : fill.market,
            qty : fill.qty,
            price : fill.price,
            long : fill.long,
            short : fill.short,
            createdAt : fill.createdAt
        });
    }

    //add remianing qty to orderbook if not fully filled
    if(filledQty < qty && orderType === "limit") {
        const ownSide = side === "buy" ? book.bids : book.asks;
        const remainingQty = qty - filledQty;
        if(!ownSide.has(price)) ownSide.set(price, []);
        ownSide.get(price)!.push({
            orderId : order.orderId,
            userId,
            side,
            market,
            price,
            qty : remainingQty,
            margin : (remainingQty / qty)*margin,
            createdAt : Date.now()
        })
    }
    return  order;


}

export const matchOrder = (
    book: Orderbook,
    side: OrderSide,
    orderType: OrderType,
    price: number,
    qty: number,
    margin: number,
    userId: string,
    market: string
) => {


    //matching logic
    const orderSide = side === "buy" ? book.asks : book.bids;

    let filledQty = 0;
    const fills: Fill[] = [];
    const takerPositions: Array<{
        userId: string;
        market: string;
        side: OrderSide;
        qty: number;
        price: number;
    }> = [];
    const makerPositions: Array<{
        userId: string;
        market: string;
        side: OrderSide;
        qty: number;
        price: number;
    }> = [];

    //while there's still qty left to fill
    while (filledQty < qty) {

        //get the best price from opp. side
        const prices = [...orderSide.keys()];
        if (prices.length === 0) break;

        const bestPrice = side === "buy" ? Math.min(...prices) : Math.max(...prices);
        if (orderType === "limit" && ((side === "buy" && price < bestPrice))) {
            break;
            //stops if limit price doesn't cross
        }
        const restingOrders = orderSide.get(bestPrice) || [];


        //loop through these resting orders and match against them
        //1. how much can we fill from the resting order
        //2. update the filledQty

        for (const restingOrder of restingOrders) {
            const matchQty = Math.min(qty - filledQty, restingOrder.qty);

            restingOrder.qty -= matchQty;
            filledQty += matchQty;

            //if resting order fully filled, remove it
            if (restingOrder.qty === 0) {
                const idx = restingOrders.indexOf(restingOrder);
                //gets the index of the order
                restingOrders.splice(idx, 1);

            }


            //create the fill record

            fills.push({
                fillId: crypto.randomUUID(),
                side: side === "buy" ? "long" : "short",
                maker: restingOrder.userId,
                taker: userId,
                market,
                price: bestPrice,
                qty: matchQty,
                long: side === "buy" ? userId : restingOrder.userId,
                short: side === "sell" ? userId : restingOrder.userId,
                createdAt: Date.now()

            })

            //simple position records for the return
            takerPositions.push({
                userId,
                market,
                side,
                qty: matchQty,
                price: bestPrice
            });

            makerPositions.push({
                userId: restingOrder.userId,
                market,
                side: side === "buy" ? "sell" : "buy", //opposite side
                qty: matchQty,
                price: bestPrice
            })

            //if no more orders at this price level, remove it
            if (restingOrders.length === 0) {
                orderSide.delete(bestPrice);
            }

            //update last traded price
            book.lastTradedPrice = bestPrice;

            //check if fully filled
            if (filledQty >= qty) break;

        }

    }


    return { filledQty, fills, takerPositions, makerPositions };

    
}


export const getEquity = async(payload : Record<string,unknown>) => {
    
    //return user's available and locked balance from BALANCES

    //get the userId from the payload 
    //find their balance in BALANCES
    //return available and locked

   

    const userId  = payload.userId as string;
    const userBalance = BALANCES.get(userId);
    if(!userBalance) return {available : 0, locked : 0};
    const userAvl = userBalance.available;
    const userLoc = userBalance.locked;

    return {available : userAvl, locked : userLoc};

}

export const getOpenPosition = async(payload : Record<string, unknown>) => {

    //reads existing pos.

    //return all positions for a user where :
    //positionStatus === "open"

    const userId = payload.userId as string;
    const userPos = POSITIONS.get(userId);

    if(!userPos) return {existingPos : "No open positions"};
    const existingPos = userPos.filter(p => p.positionStatus === "open");

    return existingPos;
}

export const cancelPosition = async(payload : Record<string,unknown>) => {

    //find order by orderId
    //check if it can be cancelled
    //remove it from the orderbook
    //unlock margin (locked --> available)
    //update order status : cancelled

    const orderId = payload.orderId as string;
    const userId = payload.userId as string;

    const userOrders = ORDERS.get(userId);
    if(!userOrders) return {error : "No orders"};
    const order = userOrders.find(o => o.orderId === orderId);
    if(!order) return {error : "Order not found"};

    if(order.status === "filled" || order.status === "partially_filled") {
        return {error : "Orders cannot be cancelled"};
    }

    //remove it from the orderbook
    
    const book = ORDERBOOKS.get(order.market);
    if(!book) return {error : "Market not found"};
    const side = order.side === "buy" ? book.bids : book.asks;

    //unlock margin (locked --> available)
    const userBalance = BALANCES.get(userId);
    if(userBalance) {
        userBalance.available += order.margin;
        userBalance.locked -= order.margin;
    }
    //set the status to cancelled
    order.status = "cancelled";

    //emit ORDER_CANCELLED event
    await emitEvent("ORDER_CANCELLED" , {
        orderId : order.orderId,
        side, 
        qty: order.qty, 
        margin: order.margin, 
        orderType: order.orderType, 
        price: order.price, 
        status: order.status, 
        market: order.market, userId
    })

    return {orderId, status : "cancelled"}

}