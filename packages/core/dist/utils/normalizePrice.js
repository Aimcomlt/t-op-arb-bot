export function normalizePrice(amount, decimals) {
    if (decimals < 0)
        throw new Error('decimals must be >= 0');
    const base = 10 ** decimals;
    return Number(amount) / base;
}
