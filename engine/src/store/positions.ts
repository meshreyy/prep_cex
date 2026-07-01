import { POSITIONS } from "./perp-store";
import type { Fill, Position, PositionType } from "./perp-store";
import { MARK_PRICE } from "./perp-store";
import { emitEvent } from "../utils/events";

const LEVERAGE = 10;

function upsertPosition(
    userId: string,
    market: string,
    type: PositionType,
    qty: number,
    price: number,
): { position: Position; isNew: boolean } {
    if (!POSITIONS.has(userId)) POSITIONS.set(userId, []);

    const list = POSITIONS.get(userId)!;
    const existing = list.find(
        (p) =>
            p.market === market &&
            p.type === type &&
            p.positionStatus === "open",
    );

    const margin = (qty * price) / LEVERAGE;

    if (existing) {
        const totalQty = existing.qty + qty;
        existing.averagePrice =
            (existing.averagePrice * existing.qty + price * qty) / totalQty;
        existing.qty = totalQty;
        existing.margin += margin;
        existing.liquidationPrice =
            type === "long"
                ? existing.averagePrice * 0.8
                : existing.averagePrice * 1.2;
        const mark = MARK_PRICE.get(market) ?? price;
        existing.unrealizedPnl =
            type === "long"
                ? (mark - existing.averagePrice) * existing.qty
                : (existing.averagePrice - mark) * existing.qty;
        return { position: existing, isNew: false };
    }

    const position: Position = {
        positionId: crypto.randomUUID(),
        userId,
        market,
        type,
        qty,
        margin,
        unrealizedPnl: 0,
        realizedPnl: 0,
        averagePrice: price,
        liquidationPrice: type === "long" ? price * 0.8 : price * 1.2,
        positionStatus: "open",
        createdAt: Date.now(),
    };

    list.push(position);
    return { position, isNew: true };
}

export async function applyFillToPositions(fill: Fill): Promise<void> {
    const long = upsertPosition(
        fill.long,
        fill.market,
        "long",
        fill.qty,
        fill.price,
    );
    const short = upsertPosition(
        fill.short,
        fill.market,
        "short",
        fill.qty,
        fill.price,
    );

    for (const { position, isNew } of [long, short]) {
        if (!isNew) continue;
        await emitEvent("POSITION_OPENED", {
            positionId: position.positionId,
            userId: position.userId,
            market: position.market,
            type: position.type,
            qty: position.qty,
            averagePrice: position.averagePrice,
            liquidationPrice: position.liquidationPrice,
            margin: position.margin,
        });
    }
}
