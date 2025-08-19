import type { Address, Hex } from "viem";
interface TraceCall {
    from: Address;
    to: Address;
    input: Hex;
}
export type TokenFlow = Map<Address, bigint>;
/**
 * Aggregates ERC-20 transfer/transferFrom calls and computes net token
 * flow from the executor's perspective. Positive values indicate tokens
 * received by the executor, negative values indicate tokens sent.
 */
export declare function computeNetTokenFlow(calls: TraceCall[], executor: Address): TokenFlow;
export {};
//# sourceMappingURL=computeNetTokenFlow.d.ts.map