export function applySlippage(quote: bigint, slippageBps: number): bigint {
  if (slippageBps < 0) throw new Error('slippageBps must be >= 0');
  const bps = BigInt(slippageBps);
  return (quote * (10_000n - bps)) / 10_000n;
}

export function compoundedMinOut(quotes: bigint[], slippageBps: number): bigint {
  if (quotes.length === 0) return 0n;
  let amount = quotes[quotes.length - 1];
  for (let i = 0; i < quotes.length; i++) {
    amount = applySlippage(amount, slippageBps);
  }
  return amount;
}

/**
 * Calculates the slippage in basis points between an expected quote and the
 * actual amount received. Positive values indicate the actual amount was less
 * than expected (worse execution), while negative values indicate a better
 * than expected fill.
 */
export function analyzeSlippage(
  expected: bigint | number,
  actual: bigint | number,
): number {
  const exp = Number(expected);
  const act = Number(actual);
  if (exp === 0) return 0;
  return ((exp - act) / exp) * 10_000;
}
