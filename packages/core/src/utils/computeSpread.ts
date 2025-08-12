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
  const spreadBps = ((sell.price - buy.price) / buy.price) * 10_000;
  return {
    spreadBps,
    buyDex: buy.dex,
    sellDex: sell.dex,
  };
}
