export interface ProfitGuardParams {
  expectedProceeds: bigint | number;
  gasCost: bigint | number;
  flashFee: bigint | number;
  /**
   * Optional buffer for MEV protection expressed in basis points.
   * For example, `50` represents a 0.5% buffer on expected proceeds.
   */
  mevBufferBps?: number;
}

/**
 * Compares the expected proceeds of a trade against the total costs
 * (gas + flash loan fee) plus a configurable MEV buffer. Returns `true`
 * only if the proceeds exceed the costs and buffer.
 */
export function profitGuard({
  expectedProceeds,
  gasCost,
  flashFee,
  mevBufferBps = 0,
}: ProfitGuardParams): boolean {
  const proceeds = BigInt(expectedProceeds);
  const costs = BigInt(gasCost) + BigInt(flashFee);
  const buffer = (proceeds * BigInt(mevBufferBps)) / 10_000n;
  return proceeds > costs + buffer;
}

