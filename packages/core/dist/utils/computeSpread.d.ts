export interface PricePoint {
    dex: string;
    price: number;
}
export interface SpreadComputation {
    spreadBps: number;
    buyDex: string;
    sellDex: string;
}
/**
 * Computes the spread in basis points between two normalized prices.
 * Returns the direction to buy and sell based on which price is lower.
 */
export declare function computeSpread(a: PricePoint, b: PricePoint): SpreadComputation | null;
/**
 * Computes the spread between two prices in basis points.
 * Prices are assumed to be positive numbers where `buy` is the
 * lower price and `sell` is the higher price. If prices are equal,
 * the function returns 0.
 */
export declare function computeSpreadBps(buy: number, sell: number): number;
//# sourceMappingURL=computeSpread.d.ts.map