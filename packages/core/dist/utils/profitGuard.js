/**
 * Compares the expected proceeds of a trade against the total costs
 * (gas + flash loan fee) plus a configurable MEV buffer. Returns `true`
 * only if the proceeds exceed the costs and buffer.
 */
export function profitGuard({ expectedProceeds, gasCost, flashFee, mevBufferBps = 0, }) {
    const proceeds = BigInt(expectedProceeds);
    const costs = BigInt(gasCost) + BigInt(flashFee);
    const buffer = (proceeds * BigInt(mevBufferBps)) / 10000n;
    return proceeds > costs + buffer;
}
