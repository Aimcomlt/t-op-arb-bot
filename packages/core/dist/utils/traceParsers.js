import { decodeSelector } from './decodeSelector.js';
import { decodeRawArgsHex } from './decodeRawArgsHex.js';
export async function parseTrace(trace, decoded) {
    const cache = new Map();
    const rootSelector = trace.input?.slice(0, 10);
    if (decoded && rootSelector)
        cache.set(rootSelector, decoded);
    async function dfs(call, depth) {
        const selector = call.input?.slice(0, 10) || '';
        let info;
        if (cache.has(selector))
            info = cache.get(selector);
        else {
            info = decodeSelector(selector, call.input);
            if (!info)
                info = decodeRawArgsHex(call.input.slice(10));
            cache.set(selector, info);
        }
        const node = {
            contract: call.to,
            from: call.from,
            method: typeof info === 'object' && 'method' in info ? info.method : 'unknown',
            args: typeof info === 'object' && 'args' in info ? info.args : info || [],
            ethTransferred: call.value,
            gasUsed: call.gasUsed,
            input: call.input,
            depth,
            children: []
        };
        if (call.calls && call.calls.length > 0) {
            node.children = await Promise.all(call.calls.map((c) => dfs(c, depth + 1)));
        }
        return node;
    }
    return dfs(trace, 0);
}
