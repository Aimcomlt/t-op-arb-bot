import { type InterfaceAbi } from 'ethers';
import { clearAbiCache } from './abiCache.js';
export declare function registerSelector(selector: string, abi: InterfaceAbi): void;
export { clearAbiCache };
export declare function decodeSelector(selector: string, callData: string, abi?: InterfaceAbi): {
    method: string;
    args: unknown[];
} | null;
//# sourceMappingURL=decodeSelector.d.ts.map