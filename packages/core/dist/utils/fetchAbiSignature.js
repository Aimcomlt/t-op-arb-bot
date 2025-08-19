import { selectorAbiCache } from './abiCache.js';
/* ============================
   Type Guards (Runtime Checks)
   ============================ */
function isObject(x) {
    return typeof x === 'object' && x !== null;
}
function isOC_IO(x) {
    return isObject(x) && typeof x.type === 'string';
}
function isOC_Function(x) {
    if (!isObject(x))
        return false;
    if (typeof x.name !== 'string')
        return false;
    if (x.inputs !== undefined) {
        if (!Array.isArray(x.inputs) || !x.inputs.every((i) => isOC_IO(i)))
            return false;
    }
    if (x.outputs !== undefined) {
        if (!Array.isArray(x.outputs) || !x.outputs.every((i) => isOC_IO(i)))
            return false;
    }
    if (x.stateMutability !== undefined && typeof x.stateMutability !== 'string')
        return false;
    return true;
}
function isOpenChainLookupResponse(x) {
    if (!isObject(x))
        return false;
    const result = x.result;
    if (result === undefined)
        return true; // optional
    if (!isObject(result))
        return false;
    const fnRec = result.function;
    if (fnRec === undefined)
        return true; // optional
    if (!isObject(fnRec))
        return false;
    // Check each key maps to an array of { function?: OC_Function }
    for (const key of Object.keys(fnRec)) {
        const arr = fnRec[key];
        if (!Array.isArray(arr))
            return false;
        for (const item of arr) {
            if (!isObject(item))
                return false;
            const fn = item.function;
            if (fn !== undefined && !isOC_Function(fn))
                return false;
        }
    }
    return true;
}
function isFourByteResponse(x) {
    if (!isObject(x))
        return false;
    const results = x.results;
    if (results === undefined)
        return true; // optional
    if (!Array.isArray(results))
        return false;
    for (const r of results) {
        if (!isObject(r))
            return false;
        const ts = r.text_signature;
        if (ts !== undefined && typeof ts !== 'string')
            return false;
    }
    return true;
}
/* ============================
   Helpers
   ============================ */
function buildFunctionSignature(name, inputTypes) {
    // ethers.Interface accepts strings like "function transfer(address,uint256)"
    return `function ${name}(${inputTypes.join(',')})`;
}
/** Extract first OpenChain function entry for a selector, if any. */
function pickOpenChainFunction(data, selector) {
    const rec = data.result?.function;
    if (!rec)
        return null;
    const arr = rec[selector];
    if (!Array.isArray(arr) || arr.length === 0)
        return null;
    const fn = arr[0]?.function;
    if (!fn || typeof fn.name !== 'string')
        return null;
    const inputTypes = Array.isArray(fn.inputs)
        ? fn.inputs
            .map((i) => (typeof i?.type === 'string' ? i.type.trim() : ''))
            .filter((t) => t.length > 0)
        : [];
    return { name: fn.name, inputTypes, stateMutability: fn.stateMutability };
}
/** Extract first 4byte text_signature for a selector, if any. */
function pickFourByteSignature(data) {
    const text = data.results?.[0]?.text_signature;
    if (!text || typeof text !== 'string')
        return null;
    const trimmed = text.trim();
    return trimmed.length > 0 ? trimmed : null;
}
/* ============================
   Main
   ============================ */
export async function fetchAbiSignature(selector) {
    // Cache hit?
    const cached = selectorAbiCache.get(selector);
    if (cached)
        return cached;
    // ---- Try OpenChain first ----
    try {
        const res = await fetch(`https://api.openchain.xyz/signature-database/v1/lookup?function=${encodeURIComponent(selector)}`);
        if (res.ok) {
            const raw = await res.json();
            if (isOpenChainLookupResponse(raw)) {
                const picked = pickOpenChainFunction(raw, selector);
                if (picked && picked.name) {
                    const sig = buildFunctionSignature(picked.name, picked.inputTypes);
                    const abi = [sig];
                    selectorAbiCache.set(selector, abi);
                    return abi;
                }
            }
        }
    }
    catch {
        // ignore network/parse errors; fall through to 4byte
    }
    // ---- Fallback: 4byte.directory ----
    try {
        const res = await fetch(`https://www.4byte.directory/api/v1/signatures/?hex_signature=${encodeURIComponent(selector)}`);
        if (res.ok) {
            const raw = await res.json();
            if (isFourByteResponse(raw)) {
                const text = pickFourByteSignature(raw);
                if (text) {
                    const abi = [`function ${text}`];
                    selectorAbiCache.set(selector, abi);
                    return abi;
                }
            }
        }
    }
    catch {
        // ignore
    }
    return null;
}
