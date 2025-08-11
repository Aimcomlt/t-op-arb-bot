import { Contract, WebSocketProvider, formatUnits, type EventLog } from 'ethers';
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
  price: string;          // normalized decimal string
  liquidityUSD?: string;  // optional
  spreadBps?: string;     // optional bps string
};

export async function startSyncListener(
  matched: MatchedLP[],
  onUpdate: (u: SyncUpdate) => void
): Promise<void> {
  const provider = new WebSocketProvider(env.RPC_WSS_URL);

  for (const pair of matched) {
    const uni = new Contract(pair.uniswapLP, PAIR_ABI, provider);
    const sushi = new Contract(pair.sushiswapLP, PAIR_ABI, provider);

    const handler = async (_r0: bigint, _r1: bigint, event: EventLog) => {
      try {
        // Read latest reserves from BOTH sides at time of event
        const [[ru0, ru1, /*tsU*/], [rs0, rs1, /*tsS*/]] = await Promise.all([
          uni.getReserves(),
          sushi.getReserves(),
        ]);

        // Normalize to decimals
        const ru0n = formatUnits(ru0, pair.token0.decimals);
        const ru1n = formatUnits(ru1, pair.token1.decimals);
        const rs0n = formatUnits(rs0, pair.token0.decimals);
        const rs1n = formatUnits(rs1, pair.token1.decimals);

        // Avoid division by zero
        const dUni = Number(ru0n);
        const nUni = Number(ru1n);
        const dSushi = Number(rs0n);
        const nSushi = Number(rs1n);

        if (dUni === 0 || dSushi === 0) {
          logger.debug({ pair: pair.pairSymbol }, 'Skip price calc: zero reserves');
          return;
        }

        const priceUni = nUni / dUni;
        const priceSushi = nSushi / dSushi;

        // Spread in bps vs mid
        const mid = (priceUni + priceSushi) / 2;
        const spreadBps =
          mid === 0 ? 0 : (Math.abs(priceUni - priceSushi) / mid) * 10_000;

        const blockNumber = Number(event.blockNumber ?? 0);

        // Emit one update per side
        onUpdate({
          pairSymbol: pair.pairSymbol,
          dex: 'uniswap',
          lpAddress: pair.uniswapLP,
          reserves: { r0: ru0n, r1: ru1n },
          blockNumber,
          price: priceUni.toString(),
          spreadBps: spreadBps.toString(),
        });

        onUpdate({
          pairSymbol: pair.pairSymbol,
          dex: 'sushiswap',
          lpAddress: pair.sushiswapLP,
          reserves: { r0: rs0n, r1: rs1n },
          blockNumber,
          price: priceSushi.toString(),
          spreadBps: spreadBps.toString(),
        });
      } catch (err) {
        logger.error({ err, pair: pair.pairSymbol }, 'syncListener error');
      }
    };

    // Subscribe
    uni.on('Sync', handler);
    sushi.on('Sync', handler);
  }
}
