import { Interface } from 'ethers';
import { selectorAbiCache, clearAbiCache } from './abiCache.js';
export function registerSelector(selector, abi) {
    selectorAbiCache.set(selector, abi);
}
export { clearAbiCache };
/* ---------------------------
   Type Guards / Normalizers
   --------------------------- */
function isObject(x) {
    return typeof x === 'object' && x !== null;
}
/**
 * Minimal check for a JsonFragment-like object.
 * We only need to ensure it's an object and *looks* like a fragment.
 */
function isJsonFragmentLike(x) {
    return isObject(x) && ('type' in x || 'name' in x);
}
/**
 * Accepts the common shapes ethers supports:
 * - string (single function signature)
 * - array of strings
 * - array of JsonFragment-like objects
 */
function isInterfaceAbi(x) {
    if (typeof x === 'string')
        return true;
    if (Array.isArray(x)) {
        return x.every((el) => typeof el === 'string' || isJsonFragmentLike(el));
    }
    return false;
}
/** Normalize unknown → InterfaceAbi or null */
function toInterfaceAbi(x) {
    if (typeof x === 'string')
        return [x];
    if (Array.isArray(x)) {
        // strings or fragment-like are okay
        if (x.every((el) => typeof el === 'string' || isJsonFragmentLike(el))) {
            return x;
        }
    }
    return null;
}
/* ---------------------------
   Main
   --------------------------- */
export function decodeSelector(selector, callData, abi) {
    // Prefer passed-in ABI, else look up from cache
    const cached = selectorAbiCache.get(selector);
    const candidate = (abi ?? cached);
    // Fast-narrowing/normalization
    const normalized = abi
        ? (isInterfaceAbi(abi) ? abi : null)
        : toInterfaceAbi(candidate);
    if (!normalized || (Array.isArray(normalized) && normalized.length === 0)) {
        return null;
    }
    try {
        const iface = new Interface(normalized);
        // ethers v6 supports looking up by sighash/selector
        const fragment = iface.getFunction(selector);
        if (!fragment)
            return null;
        const decoded = iface.decodeFunctionData(fragment, callData);
        return { method: fragment.name, args: Array.from(decoded) };
    }
    catch {
        return null;
    }
}
