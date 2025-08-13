export interface ConstantProductPool {
  reserveIn: bigint;
  reserveOut: bigint;
}

interface FlashLoanSizingParams {
  buyPool: ConstantProductPool;
  sellPool: ConstantProductPool;
  maxSlippageBps: number;
}

/**
 * Computes the maximum flash loan size (in terms of the input token) that
 * can be traded across two constant-product pools while keeping the price
 * impact on each pool within `maxSlippageBps` basis points.
 *
 * This uses a binary search on the input amount to avoid floating point
 * precision issues when operating on large integer reserves.
 */
export function computeSafeFlashLoanSize({
  buyPool,
  sellPool,
  maxSlippageBps,
}: FlashLoanSizingParams): bigint {
  const TEN_THOUSAND = 10_000n;
  const maxSlippage = BigInt(maxSlippageBps);

  const buyIn = buyPool.reserveIn;
  const buyOut = buyPool.reserveOut;
  const sellIn = sellPool.reserveIn;
  // const sellOut = sellPool.reserveOut; // not required directly

  let low = 0n;
  let high = buyIn; // can't trade more than pool reserves
  let ans = 0n;

  const withinSlippage = (dx: bigint): boolean => {
    if (dx <= 0n) return true;
    const buyTerm = buyIn + dx;
    const lhsBuy = (buyTerm * buyTerm - buyIn * buyIn) * TEN_THOUSAND;
    const rhsBuy = maxSlippage * buyTerm * buyTerm;
    if (lhsBuy > rhsBuy) return false; // buy pool slippage too high

    const dy = (dx * buyOut) / (buyIn + dx);
    const sellTerm = sellIn + dy;
    const lhsSell = (sellTerm * sellTerm - sellIn * sellIn) * TEN_THOUSAND;
    const rhsSell = maxSlippage * sellTerm * sellTerm;
    if (lhsSell > rhsSell) return false; // sell pool slippage too high
    return true;
  };

  while (low <= high) {
    const mid = (low + high) / 2n;
    if (withinSlippage(mid)) {
      ans = mid;
      low = mid + 1n;
    } else {
      high = mid - 1n;
    }
  }

  return ans;
}

