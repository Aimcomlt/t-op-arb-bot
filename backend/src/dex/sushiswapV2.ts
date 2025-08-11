import { ethers } from 'ethers';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import type { PairList, PairDescriptor, Token } from './types';

import { SUSHISWAP_FACTORY_ABI } from '../abi-cache/FACTORY/sushiswapV2Factory';
import { SUSHISWAP_PAIR_ABI } from '../abi-cache/PAIR/sushiswapV2Pair';

// Mainnet Sushiswap V2 factory address:
const SUSHI_FACTORY_ADDRESS = '0xC0AEe478e3658e2610c5F7A4A2E1777cE9e4f2Ac' as const;

type RawPair = {
  lpAddress: `0x${string}`;
  token0: Token;
  token1: Token;
};

export async function collectSushiPairs(
  provider = new ethers.JsonRpcProvider(env.RPC_HTTP_URL)
): Promise<PairList> {
  const factory = new ethers.Contract(SUSHI_FACTORY_ADDRESS, SUSHISWAP_FACTORY_ABI, provider);

  const allPairsLength: bigint = await factory.allPairsLength();
  const total = Number(allPairsLength);
  logger.info({ total }, '[SUSHI] allPairsLength');

  const batchSize = 1000;
  const pairs: PairList = [];

  const tokenCache = new Map<string, Token>();
  async function toToken(address: `0x${string}`): Promise<Token> {
    const key = address.toLowerCase();
    const cached = tokenCache.get(key);
    if (cached) return cached;
    const erc20 = new ethers.Contract(
      address,
      [
        'function symbol() view returns (string)',
        'function decimals() view returns (uint8)',
      ],
      provider
    );
    const [symbol, decimals] = await Promise.all([erc20.symbol(), erc20.decimals()]);
    const t: Token = { address, symbol, decimals };
    tokenCache.set(key, t);
    return t;
  }

  for (let offset = 0; offset < total; offset += batchSize) {
    const end = Math.min(offset + batchSize, total);
    const idxs = Array.from({ length: end - offset }, (_, i) => i + offset);

    const lpAddrs = (await Promise.all(idxs.map((i) => factory.allPairs(i)))) as string[];

    const enriched = await Promise.all(
      lpAddrs.map(async (addr) => {
        const pair = new ethers.Contract(addr, SUSHISWAP_PAIR_ABI, provider);
        const [t0Addr, t1Addr] = await Promise.all([pair.token0(), pair.token1()]);
        const [token0, token1] = await Promise.all([toToken(t0Addr), toToken(t1Addr)]);
        return { lpAddress: addr as `0x${string}`, token0, token1 } satisfies RawPair;
      })
    );

    enriched.forEach((p) => {
      const d: PairDescriptor = {
        dex: 'sushiswap',
        lpAddress: p.lpAddress,
        token0: p.token0,
        token1: p.token1,
      };
      pairs.push(d);
    });

    logger.info({ chunk: `${offset}-${end}`, count: pairs.length }, '[SUSHI] collected chunk');
  }

  return pairs;
}
