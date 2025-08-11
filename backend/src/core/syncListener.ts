import { Contract, WebSocketProvider, formatUnits } from 'ethers';
import type { MatchedLP } from '../bootstrap/pairs';
import { env } from '../config/env';
import { logger } from '../utils/logger';

const PAIR_ABI = [
  'event Sync(uint112 reserve0, uint112 reserve1)',
  'function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
] as const;

export type SyncUpdate = {
  pairSymbol: string;
  dex: 'uniswap' | 'sushiswap';
  lpAddress: `0x${string}`;
  reserves: { r0: string; r1: string };
  blockNumber: number;
  price: string; // normalized decimal string
  liquidityUSD?: string; // optional
  spreadBps?: string; // optional bps string
};

export async function startSyncListener(
  matched: MatchedLP[],
  onUpdate: (u: SyncUpdate) => void
): Promise<void> {
  const provider = new WebSocketProvider(env.RPC_WSS_URL);

  for (const pair of matched) {
    const uni = new Contract(pair.uniswapLP, PAIR_ABI, provider);
    const sushi = new Contract(pair.sushiswapLP, PAIR_ABI, provider);

    const handler = async (
      _r0: bigint,
      _r1: bigint,
      event: { blockNumber: number }
    ) => {
      try {
        const [[ru0, ru1], [rs0, rs1]] = await Promise.all([
          uni.getReserves(),
          sushi.getReserves(),
        ]);

        const ru0n = formatUnits(ru0, pair.token0.decimals);
        const ru1n = formatUnits(ru1, pair.token1.decimals);
        const rs0n = formatUnits(rs0, pair.token0.decimals);
        const rs1n = formatUnits(rs1, pair.token1.decimals);

        const priceUni = Number(ru1n) / Number(ru0n);
        const priceSushi = Number(rs1n) / Number(rs0n);
        const mid = (priceUni + priceSushi) / 2;
        const spread = mid === 0 ? 0 : (Math.abs(priceUni - priceSushi) / mid) * 10_000;

        onUpdate({
          pairSymbol: pair.pairSymbol,
          dex: 'uniswap',
          lpAddress: pair.uniswapLP,
          reserves: { r0: ru0n, r1: ru1n },
          blockNumber: event.blockNumber,
          price: priceUni.toString(),
          spreadBps: spread.toString(),
        });
        onUpdate({
          pairSymbol: pair.pairSymbol,
          dex: 'sushiswap',
          lpAddress: pair.sushiswapLP,
          reserves: { r0: rs0n, r1: rs1n },
          blockNumber: event.blockNumber,
          price: priceSushi.toString(),
          spreadBps: spread.toString(),
        });
      } catch (err) {
        logger.error({ err, pair: pair.pairSymbol }, 'syncListener error');
      }
    };

    uni.on('Sync', handler);
    sushi.on('Sync', handler);
  }
}
