// src/dex/dexCollector.ts
import { fetchUniPairs } from './loaders/uniswap.js';
import { fetchSushiPairs } from './loaders/sushiswap.js';
// Add other DEX loaders here
/**
 * Collect LP pairs from all supported DEX sources.
 */
export async function collectPairs() {
    const sources = [
        fetchUniPairs(),
        fetchSushiPairs(),
        // Add additional fetchers here
    ];
    const results = await Promise.allSettled(sources);
    const allPairs = [];
    for (const result of results) {
        if (result.status === 'fulfilled') {
            allPairs.push(...result.value);
        }
        else {
            console.warn('[dexCollector] DEX fetch failed:', result.reason);
        }
    }
    return allPairs;
}
