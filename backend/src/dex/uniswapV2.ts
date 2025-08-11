import { ethers } from 'ethers';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import type { PairList, PairDescriptor, Token } from './types';

// If you already have constants, import them; otherwise add here:
const UNI_FACTORY_ADDRESS = '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f' as const;

// Point to existing ABI cache
import { UNISWAP_FACTORY_ABI } from '../abi-cache/FACTORY/uniswapV2Factory';
import { UNISWAP_PAIR_ABI } from '../abi-cache/PAIR/uniswapV2Pair';

type RawPair = {
  lpAddress: `0x${string}`;
  token0: Token;
  token1: Token;
};

export async function collectUniswapPairs(
  provider = new ethers.JsonRpcProvider(env.RPC_HTTP_URL)
): Promise<PairList> {
  const factory = new ethers.Contract(UNI_FACTORY_ADDRESS, UNISWAP_FACTORY_ABI, provider);

  const allPairsLength: bigint = await factory.allPairsLength();
  const total = Number(allPairsLength);
  logger.info({ total }, '[UNI] allPairsLength');

  const batchSize = 1000; // keep memory sane
  const pairs: PairList = [];

  for (let offset = 0; offset < total; offset += batchSize) {
    const end = Math.min(offset + batchSize, total);
    const idxs = Array.from({ length: end - offset }, (_, i) => i + offset);

    // Fetch LP addresses in batch
    const lpPromises = idxs.map((i) => factory.allPairs(i));
    const lpAddrs = (await Promise.all(lpPromises)) as string[];

    // Fetch token0/token1 in batch
    const rawPairs = await Promise.all(
      lpAddrs.map(async (addr) => {
        const pair = new ethers.Contract(addr, UNISWAP_PAIR_ABI, provider);
        const [t0, t1] = await Promise.all([pair.token0(), pair.token1()]);
        return { lpAddress: addr as `0x${string}`, token0: t0 as `0x${string}`, token1: t1 as `0x${string}` };
      })
    );

    // Resolve token metadata (symbol/decimals) — cache results to avoid repeats
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

    const enriched: RawPair[] = await Promise.all(
      rawPairs.map(async (p) => ({
        lpAddress: p.lpAddress,
        token0: await toToken(p.token0),
        token1: await toToken(p.token1),
      }))
    );

    enriched.forEach((p) => {
      const d: PairDescriptor = {
        dex: 'uniswap',
        lpAddress: p.lpAddress,
        token0: p.token0,
        token1: p.token1,
      };
      pairs.push(d);
    });

    logger.info({ chunk: `${offset}-${end}`, count: pairs.length }, '[UNI] collected chunk');
  }

  return pairs;
}
