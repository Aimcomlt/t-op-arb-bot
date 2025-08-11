import { Contract, formatUnits, WebSocketProvider } from 'ethers';
import { logDexEvent, logError } from '../utils/logger';

/**
 * Minimal ABI required for listening to Sync events and fetching reserves.
 */
const PAIR_ABI = [
  'event Sync(uint112 reserve0, uint112 reserve1)',
  'function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
  'function token0() view returns (address)',
  'function token1() view returns (address)'
] as const;

const ERC20_ABI = [
  'function decimals() view returns (uint8)'
] as const;

export interface MatchedLP {
  /** Symbol of the trading pair e.g. WETH/USDC */
  pairSymbol: string;
  /** UniswapV2 pair address */
  uniPair: string;
  /** SushiSwap pair address */
  sushiPair: string;
}

export interface SpreadBroadcast {
  type: 'spread.update';
  payload: {
    pairSymbol: string;
    midPrice: number;
    spreadBps: number;
    reserves: {
      uni: { reserve0: string; reserve1: string };
      sushi: { reserve0: string; reserve1: string };
    };
    liquidityBps: number;
    timestamp: number;
  };
}

export type BroadcastFn = (msg: SpreadBroadcast) => void;

interface PairContracts {
  uni: Contract;
  sushi: Contract;
  decimals0: number;
  decimals1: number;
}

/**
 * Starts listeners for Sync events on matched LP pairs and broadcasts
 * mid-price spreads when thresholds are crossed or liquidity changes.
 */
export function startSyncListener(
  pairs: MatchedLP[],
  provider: WebSocketProvider,
  broadcast: BroadcastFn,
  opts: { spreadThresholdBps?: number; liquidityThresholdBps?: number } = {}
): void {
  const spreadThreshold = opts.spreadThresholdBps ?? 1; // default 1 bps
  const liquidityThreshold = opts.liquidityThresholdBps ?? 100; // default 100 bps = 1%

  const contracts = new Map<string, PairContracts>();
  const pending = new Map<string, true>();
  const lastLiquidity = new Map<string, number>();
  let processing = false;

  async function loadDecimals(pair: Contract): Promise<[number, number]> {
    const [t0, t1] = await Promise.all([pair.token0(), pair.token1()]);
    const token0 = new Contract(t0, ERC20_ABI, provider);
    const token1 = new Contract(t1, ERC20_ABI, provider);
    const [d0, d1] = await Promise.all([token0.decimals(), token1.decimals()]);
    return [Number(d0), Number(d1)];
  }

  function queue(symbol: string): void {
    pending.set(symbol, true);
    if (!processing) void process();
  }

  async function process(): Promise<void> {
    processing = true;
    while (pending.size > 0) {
      const symbol = pending.keys().next().value as string;
      pending.delete(symbol);
      const c = contracts.get(symbol);
      if (!c) continue;
      try {
        const [[ru0, ru1], [rs0, rs1]] = await Promise.all([
          c.uni.getReserves(),
          c.sushi.getReserves(),
        ]);

        const ru0n = Number(formatUnits(ru0, c.decimals0));
        const ru1n = Number(formatUnits(ru1, c.decimals1));
        const rs0n = Number(formatUnits(rs0, c.decimals0));
        const rs1n = Number(formatUnits(rs1, c.decimals1));

        const priceUni = ru1n / ru0n;
        const priceSushi = rs1n / rs0n;
        const mid = (priceUni + priceSushi) / 2;
        const spread = Math.abs(priceUni - priceSushi) / mid * 10_000;

        const liqUni = ru0n * ru1n;
        const liqSushi = rs0n * rs1n;
        const totalLiquidity = liqUni + liqSushi;
        const prevLiq = lastLiquidity.get(symbol) ?? totalLiquidity;
        const liquidityBps = Math.abs((totalLiquidity - prevLiq) / prevLiq) * 10_000;
        lastLiquidity.set(symbol, totalLiquidity);

        if (spread >= spreadThreshold || liquidityBps >= liquidityThreshold) {
          broadcast({
            type: 'spread.update',
            payload: {
              pairSymbol: symbol,
              midPrice: mid,
              spreadBps: spread,
              reserves: {
                uni: { reserve0: ru0.toString(), reserve1: ru1.toString() },
                sushi: { reserve0: rs0.toString(), reserve1: rs1.toString() },
              },
              liquidityBps,
              timestamp: Date.now(),
            },
          });
        }
      } catch (err) {
        logError('processSync', err);
      }
    }
    processing = false;
  }

  for (const p of pairs) {
    const uni = new Contract(p.uniPair, PAIR_ABI, provider);
    const sushi = new Contract(p.sushiPair, PAIR_ABI, provider);
    let decimals0 = 18;
    let decimals1 = 18;
    loadDecimals(uni)
      .then(([d0, d1]) => {
        decimals0 = d0;
        decimals1 = d1;
      })
      .catch((err) => logError('loadDecimals', err));

    contracts.set(p.pairSymbol, { uni, sushi, decimals0, decimals1 });

    const handler = (dex: string) => (
      _r0: bigint,
      _r1: bigint,
      event: { blockNumber: number },
    ) => {
      logDexEvent(dex, p.pairSymbol, event.blockNumber);
      queue(p.pairSymbol);
    };

    uni.on('Sync', handler('Uniswap'));
    sushi.on('Sync', handler('SushiSwap'));
  }
}

export default startSyncListener;
