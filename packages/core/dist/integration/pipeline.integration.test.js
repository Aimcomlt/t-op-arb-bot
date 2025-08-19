import { describe, it, expect, vi } from 'vitest';
import { scanDiscrepancy } from '../core/scanDiscrepancy.js';
import * as hooks from '../abie/broadcaster/broadcastHooks.js';
class OpportunityHeap {
    constructor() {
        Object.defineProperty(this, "items", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
    }
    insert(item) {
        this.items.push(item);
    }
}
describe('sync pipeline integration', () => {
    it('processes quotes into heap and broadcasts', () => {
        const snapshots = [
            { pairSymbol: 'ETH/USDC', dex: 'dexA', reserves: [1, 1] },
            { pairSymbol: 'ETH/USDC', dex: 'dexB', reserves: [1, 2] },
        ];
        const heap = new OpportunityHeap();
        const broadcastSpy = vi.spyOn(hooks, 'emitArbOpportunity').mockImplementation(() => { });
        const result = scanDiscrepancy(snapshots);
        if (result) {
            heap.insert(result);
            const payload = {
                tokenIn: result.tokenIn,
                tokenOut: result.tokenOut,
                buyOn: result.buyOn,
                sellOn: result.sellOn,
                spread: result.spread.toString(),
                estimatedProfit: result.estimatedProfit.toString(),
            };
            hooks.emitArbOpportunity(payload);
        }
        expect(heap.items).toHaveLength(1);
        expect(broadcastSpy).toHaveBeenCalledWith({
            tokenIn: result.tokenIn,
            tokenOut: result.tokenOut,
            buyOn: result.buyOn,
            sellOn: result.sellOn,
            spread: result.spread.toString(),
            estimatedProfit: result.estimatedProfit.toString(),
        });
        broadcastSpy.mockRestore();
    });
});
