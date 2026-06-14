export const MARKET_SEED_PRICES: Record<string, number> = {
    "BTC-PERP": 90_000,
    "ETH-PERP": 3_200,
};

export function seedPriceFor(market: string): number | null {
    return MARKET_SEED_PRICES[market] ?? null;
}
