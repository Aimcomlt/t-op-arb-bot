// src/core/pairFormatter.ts
/**
 * Sorts token addresses and constructs a canonical identifier
 */
function canonicalize(token0, token1) {
    return [token0.toLowerCase(), token1.toLowerCase()].sort();
}
/**
 * Formats and deduplicates raw LP data into canonical pairs
 */
export function normalizePairs(pairs) {
    const seen = new Set();
    const canonical = [];
    for (const pair of pairs) {
        const [tokenA, tokenB] = canonicalize(pair.token0, pair.token1);
        const key = `${tokenA}_${tokenB}`;
        if (seen.has(key))
            continue;
        seen.add(key);
        canonical.push({
            tokenA,
            tokenB,
            pairAddress: pair.pairAddress,
            dex: pair.dex,
            key,
        });
    }
    return canonical;
}
