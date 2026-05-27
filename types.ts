export interface Position  {
        market : string,
        type :  "LONG" | "SHORT",
        qty : number,
        margin : number,
        liquidationPrice : number,
        averagePrice : number,
        pnL: number;

    }

export  interface Order {
    orderId : number,
        market : string,
        type : "LONG" | "SHORT",
        qty : number,
        margin : number,
        orderType : "limit" | "market",
        price : number,
        status : "open" | "partially_filled" |  "filled" | "cancelled"
    }

// putting them in their own interfaces blocks, and then referencing them in User


export interface User {
    userId : number,
    username : string,
    password : string,
    collateral : {available : number ; locked : number};
    positions: Position[];
    orders : Order[];
    //[] -> a user can have multiple positions and orders
    //positions -> SOL -> (long), ETH -> (short)

}

export interface Bid {
    availableQty : number, 
    openOrder : {
        userId : number,
        qty : number,
        filledQty : number,
        orderId : number,
        createdAt : Date
    }[];
    //multiple openOrders
}

export interface Orderbook {
    bids : Record<string, Bid>,
    asks : Record<string, Bid>,
    lastTradedPrice : number,
    indexPrice : number
}

export type Orderbooks = Record<string, Orderbook>

export interface Fill {
    maker : number,
    taker: number,
    market : string,
    qty : number,
    price : number,
    long : number,
    short : number
}



