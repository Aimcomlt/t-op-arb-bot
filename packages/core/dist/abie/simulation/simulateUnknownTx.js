// packages/core/src/abie/simulation/simulateUnknownTx.ts
// Value vs type imports (verbatimModuleSyntax safe)
import { debugTraceTransaction, isTraceCall } from '@/clients/debugTrace.js';
import { debugClient } from '../../clients/viemClient.js';
import { decodeSelector } from '../../utils/decodeSelector.js';
import { decodeRawArgsHex } from '../../utils/decodeRawArgsHex.js';
import { fetchAbiSignature } from '../../utils/fetchAbiSignature.js';
import { parseTrace } from '../../utils/traceParsers.js';
import { traceCache } from '../../utils/traceCache.js';
import { computeNetTokenFlow } from '../../utils/computeNetTokenFlow.js';
import { fetchTokenPrice } from '../../utils/fetchTokenPrice.js';
import { computeSafeFlashLoanSize } from '../../utils/flashLoanSizing.js';
import { fetchReserves } from '../../utils/fetchReserves.js';
/** DFS flatten of nested calls */
function flattenCalls(calls = []) {
    const out = [];
    const dfs = (c) => {
        out.push(c);
        if (Array.isArray(c?.calls))
            c.calls.forEach(dfs);
    };
    calls.forEach(dfs);
    return out;
}
export async function simulateUnknownTx({ txHash }) {
    try {
        // Guard: ensure we have a definite hash (fixes string|undefined issues upstream)
        if (!txHash)
            return null;
        // Cache hit — return immediately
        const cached = traceCache.get(txHash);
        if (cached)
            return cached;
        // Raw node debug trace (untyped at viem level)
        const traceUnknown = await debugTraceTransaction(debugClient, txHash, { timeout: '5s' });
        // Narrow to the shape we expect
        if (!isTraceCall(traceUnknown)) {
            throw new Error('Unexpected trace shape from debug_traceTransaction');
        }
        const trace = traceUnknown;
        // Access guarded fields
        const rootInput = (trace.input ?? '0x');
        const nested = Array.isArray(trace.calls) ? trace.calls : [];
        const fromCandidates = [trace.from, ...nested.map((c) => c.from)].filter(Boolean);
        const txOrigin = (fromCandidates[0] ?? '0x0000000000000000000000000000000000000000');
        // Calldata decoding
        // Calldata decoding
        const selector = rootInput.slice(0, 10); // 0x + 8 hex
        const rawArgs = rootInput.slice(10);
        let decoded = decodeSelector(selector, rootInput);
        if (!decoded) {
            const abiFromAPI = await fetchAbiSignature(selector);
            if (abiFromAPI) {
                decoded = decodeSelector(selector, rootInput, abiFromAPI);
            }
        }
        if (!decoded) {
            // decodeRawArgsHex likely returns any[] (or unknown[]).
            // Normalize it to your canonical shape so the type matches.
            const fallback = decodeRawArgsHex(rawArgs);
            const args = Array.isArray(fallback) ? fallback : (fallback == null ? [] : [fallback]);
            decoded = { method: selector, args };
        }
        // Flatten nested calls and compute flows
        const flat = flattenCalls(nested);
        const flows = computeNetTokenFlow(flat, txOrigin);
        // Unique pool addresses (best-effort via `to`)
        const poolAddresses = Array.from(new Set(flat
            .map((c) => (isObject(c) ? c.to : undefined))
            .filter((a) => typeof a === 'string')));
        // If node provided a block number, use it for deterministic reads
        const blockNumber = trace?.blockNumber !== undefined
            ? BigInt(trace.blockNumber)
            : undefined;
        const reservesEntries = await Promise.all(poolAddresses.map(async (addr) => {
            const map = await fetchReserves([addr], { blockNumber });
            const r = (map[addr] ?? [0n, 0n]);
            return [addr, r];
        }));
        const reserves = Object.fromEntries(reservesEntries);
        // Quick profit proxy: largest positive flow by base-value
        let profit = null;
        let maxBase = 0;
        for (const [token, amount] of flows.entries()) {
            if (amount <= 0n)
                continue;
            const price = await fetchTokenPrice(token); // number
            // NOTE: Number(bigint) can overflow for very large amounts; acceptable if your tokens are typical ERC-20 sizes.
            const baseValue = Number(amount) * price;
            if (baseValue > maxBase) {
                maxBase = baseValue;
                profit = { token, amount };
            }
        }
        // Estimate a safe flash loan size with constant-product approximation
        const [buyAddr, sellAddr] = poolAddresses;
        const zeroTuple = [0n, 0n];
        const buyRes = buyAddr ? (reserves[buyAddr] ?? zeroTuple) : zeroTuple;
        const sellRes = sellAddr ? (reserves[sellAddr] ?? zeroTuple) : zeroTuple;
        const safeLoanSize = computeSafeFlashLoanSize({
            buyPool: { reserveIn: buyRes[0], reserveOut: buyRes[1] },
            sellPool: { reserveIn: sellRes[0], reserveOut: sellRes[1] },
            maxSlippageBps: 100,
        });
        // Wrap for downstream consumers
        const parsedTrace = await parseTrace(trace, decoded);
        // Fully-typed result object (no `{}` initializer)
        const result = {
            trace: parsedTrace,
            profit,
            safeLoanSize,
        };
        // Cache and return
        traceCache.set(txHash, result);
        return result;
    }
    catch (error) {
        console.error(`simulateUnknownTx failed for ${txHash}:`, error);
        return null;
    }
}
/** Narrow 'object' */
function isObject(x) {
    return typeof x === 'object' && x !== null;
}
