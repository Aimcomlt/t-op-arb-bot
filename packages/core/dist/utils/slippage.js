export function applySlippage(quote, slippageBps) {
    if (slippageBps < 0)
        throw new Error('slippageBps must be >= 0');
    const bps = BigInt(slippageBps);
    return (quote * (10000n - bps)) / 10000n;
}
export function compoundedMinOut(quotes, slippageBps) {
    if (quotes.length === 0)
        return 0n;
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
export function analyzeSlippage(expected, actual) {
    const exp = Number(expected);
    const act = Number(actual);
    if (exp === 0)
        return 0;
    return ((exp - act) / exp) * 10000;
}
