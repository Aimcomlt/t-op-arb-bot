import { logger } from '../utils/logger.js';
import { collectUniswapPairs } from '../dex/uniswapV2.js';
import { collectSushiPairs } from '../dex/sushiswapV2.js';
import { matchUniswapSushi } from '../dex/matcher.js';

export type MatchedLP = {
  pairSymbol: string;
  uniswapLP: `0x${string}`;
  sushiswapLP: `0x${string}`;
  token0: { address: `0x${string}`; symbol: string; decimals: number };
  token1: { address: `0x${string}`; symbol: string; decimals: number };
};

export async function bootstrapMatchedLPs(): Promise<MatchedLP[]> {
  logger.info('Bootstrapping DEX pairs…');
  const [uniPairs, sushiPairs] = await Promise.all([
    collectUniswapPairs(),
    collectSushiPairs(),
  ]);

  logger.info({ uni: uniPairs.length, sushi: sushiPairs.length }, 'DEX pairs collected');

  const matched = matchUniswapSushi(uniPairs, sushiPairs);
  logger.info({ matched: matched.length }, 'Cross-DEX pairs matched');

  return matched;
}
