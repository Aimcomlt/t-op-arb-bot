// src/utils/parseTrace.ts
export function parseTrace(rawTrace, decoded) {
    const topLevelCall = rawTrace;
    const traceResult = {
        contract: topLevelCall.to,
        from: topLevelCall.from,
        method: typeof decoded === "object" && "method" in decoded ? decoded.method : "unknown",
        args: typeof decoded === "object" && "args" in decoded ? decoded.args : decoded || [],
        ethTransferred: topLevelCall.value,
        gasUsed: topLevelCall.gasUsed,
        input: topLevelCall.input,
        depth: 0,
        children: []
    };
    // Recursively capture nested calls (if any)
    if (topLevelCall.calls) {
        traceResult.children = topLevelCall.calls.map((call, i) => ({
            contract: call.to,
            from: call.from,
            method: "sub-call", // will enhance later with ABI match
            args: [],
            ethTransferred: call.value,
            gasUsed: call.gasUsed,
            input: call.input,
            depth: 1,
            children: [] // future recursive parsing
        }));
    }
    return traceResult;
}
