import type { Fill, OrderSide, OrderType } from "../store/perp-store";

export type DepthLevel = {
    price: number;
    qty: number;
    orderCount: number;
};

export type MatchParams = {
    side: OrderSide;
    orderType: OrderType;
    limitPrice: number;
    qty: number;
    takerUserId: string;
};

export type MatchResult = {
    filledQty: number;
    fills: Fill[];
};
