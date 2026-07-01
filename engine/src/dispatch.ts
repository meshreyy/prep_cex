import { onramp, openPosition, cancelPosition, getEquity, getOpenPosition } from "./handler/perbs.handler.js";
import { getDepth } from "./handler/depth.handler.js";
import { getTrades } from "./handler/trades.handler.js";

export async function dispatchCommand(
    type: string,
    payload: Record<string, unknown>,
): Promise<unknown> {
    switch (type) {
        case "USER_BALANCE":
            return onramp(payload);
        case "CREATE_ORDER":
            return openPosition(payload);
        case "cancel_position":
            return cancelPosition(payload);
        case "get_equity":
            return getEquity(payload);
        case "get_open_positions":
            return getOpenPosition(payload);
        case "get_depth":
            return getDepth(payload);
        case "get_trades":
            return getTrades(payload);
        default:
            throw new Error(`Unknown command: ${type}`);
    }
}
