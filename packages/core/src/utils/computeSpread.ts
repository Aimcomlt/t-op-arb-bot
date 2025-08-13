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
export function computeSpread(a: PricePoint, b: PricePoint): SpreadComputation | null {
  if (a.price === b.price) return null;
  const [buy, sell] = a.price < b.price ? [a, b] : [b, a];
  const spreadBps = computeSpreadBps(buy.price, sell.price);
  return {
    spreadBps,
    buyDex: buy.dex,
    sellDex: sell.dex,
  };
}

/**
 * Computes the spread between two prices in basis points.
 * Prices are assumed to be positive numbers where `buy` is the
 * lower price and `sell` is the higher price. If prices are equal,
 * the function returns 0.
 */
export function computeSpreadBps(buy: number, sell: number): number {
  if (buy === sell) return 0;
  const [min, max] = buy < sell ? [buy, sell] : [sell, buy];
  return ((max - min) / min) * 10_000;
}
