// backend/src/bootstrap/pairs.ts
import { logger } from '../utils/logger';

export type MatchedLP = {
  pairSymbol: string; // e.g., "WETH/USDC"
  uniswapLP: `0x${string}`;
  sushiswapLP: `0x${string}`;
  token0: { address: `0x${string}`; symbol: string; decimals: number };
  token1: { address: `0x${string}`; symbol: string; decimals: number };
};

export async function bootstrapMatchedLPs(): Promise<MatchedLP[]> {
  // TODO: Replace with real collectors:
  //  - load UniswapV2 pairs (WETH/USDC, …)
  //  - load SushiSwapV2 pairs
  //  - match by canonical token ordering (address asc) or by symbol map
  //  - return only pairs present on BOTH DEXes

  // Example stub to keep the pipeline runnable:
  const stub: MatchedLP[] = [];
  if (stub.length === 0) {
    logger.warn(
      'bootstrapMatchedLPs produced 0 pairs (stub). Wire real DEX collectors here.'
    );
  }
  return stub;
}
