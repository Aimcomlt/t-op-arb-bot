export function withFlashloan(strategy, amount) {
    if (typeof amount === 'bigint') {
        strategy.safeLoanSize = amount;
    }
    return strategy;
}
