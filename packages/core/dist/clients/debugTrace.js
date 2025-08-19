// packages/core/src/clients/debugTrace.ts
// Lightweight wrapper for debug_traceTransaction to avoid viem's strict typing on client.request
// Use only in dev/simulation paths.
export async function debugTraceTransaction(client, // viem PublicClient-like
txHash, options = {}) {
    const res = await client.request({
        method: 'debug_traceTransaction',
        params: [txHash, options]
    });
    return res;
}
export function isTraceCall(x) {
    return !!x && typeof x === 'object' && ('type' in x ||
        'input' in x ||
        'calls' in x);
}
