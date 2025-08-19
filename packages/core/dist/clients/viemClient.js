// packages/core/src/clients/viemClient.ts
import { createPublicClient, http } from "viem";
import { mainnet } from "viem/chains";
const RPC_URL = process.env.RPC_URL ?? "http://localhost:8545";
const CHAIN = mainnet;
export const publicClient = createPublicClient({
    chain: CHAIN,
    transport: http(RPC_URL),
});
/**
 * Calls the node's debug_traceTransaction using a laxly-typed request.
 * Return is `unknown` on purpose; always narrow at the call site.
 */
export async function debugTraceTransaction(hash, opts = {}) {
    // viem's client.request is strictly typed and excludes debug_* methods.
    // We intentionally cast to any here to bypass the type whitelist.
    return publicClient.request({
        method: "debug_traceTransaction",
        params: [hash, opts],
    });
}
/** Optional convenience wrapper mirroring your previous API. */
export const debugClient = {
    async traceTransaction(hash) {
        // Use a default tracer if you want call frames
        return debugTraceTransaction(hash, { tracer: "callTracer", timeout: "5s" });
    },
};
