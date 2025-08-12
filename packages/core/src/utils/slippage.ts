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
