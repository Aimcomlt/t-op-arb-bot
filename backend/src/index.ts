// backend/src/index.ts
import 'dotenv/config';
import { env } from './config/env';
import { logger } from './utils/logger';

import { startHttpServer, setHealthProbe } from './server/http';
import { startMetricsServer } from './monitoring/metrics';
import {
  startWsServer,
  upsertSnapshot,
  broadcastUpdate,
} from './server/wsServer';

import { bootstrapMatchedLPs } from './bootstrap/pairs';
import { startSyncListener, type SyncUpdate } from './core/syncListener';

async function main() {
  logger.info({ env: { chainId: env.CHAIN_ID } }, 'Boot start');

  // 1) Metrics + HTTP + WS
  startMetricsServer(env.METRICS_PORT);
  startHttpServer(); // exposes /healthz, /version, /pairs
  startWsServer(env.WS_PORT);

  // 2) Collect & match LPs (Uniswap/Sushi) → canonical matched list
  logger.info('Collecting & matching LPs…');
  const matchedLPs = await bootstrapMatchedLPs();
  logger.info({ count: matchedLPs.length }, 'Matched LPs ready');

  // 3) Wire health probe to latest block observed by SyncListener
  let latestBlockObserved = 0;
  setHealthProbe(() => ({ block: latestBlockObserved }));

  // 4) Start realtime Sync listener → normalize → WS snapshot + broadcast
  logger.info('Starting SyncListener…');
  await startSyncListener(matchedLPs, (update: SyncUpdate) => {
    const spread = Number(update.spreadBps ?? '0');
    const liq = Number(update.liquidityUSD ?? '0');
    const r0 = Number(update.reserves.r0);
    const r1 = Number(update.reserves.r1);

    if (spread < env.MIN_SPREAD_BPS) {
      logger.debug(
        {
          pair: update.pairSymbol,
          dex: update.dex,
          spreadBps: spread,
          threshold: env.MIN_SPREAD_BPS,
        },
        'Filtered update: spread below minimum'
      );
      return;
    }
    if (liq < env.MIN_LIQ_USD) {
      logger.debug(
        {
          pair: update.pairSymbol,
          dex: update.dex,
          liquidityUSD: liq,
          threshold: env.MIN_LIQ_USD,
        },
        'Filtered update: liquidity below minimum'
      );
      return;
    }
    if (r0 < env.MIN_RESERVE || r1 < env.MIN_RESERVE) {
      logger.debug(
        {
          pair: update.pairSymbol,
          dex: update.dex,
          reserves: { r0, r1 },
          threshold: env.MIN_RESERVE,
        },
        'Filtered update: reserve below minimum'
      );
      return;
    }

    const payload = {
      pairSymbol: update.pairSymbol,
      dex: update.dex, // 'uniswap' | 'sushiswap'
      lpAddress: update.lpAddress,
      reserves: {
        r0: update.reserves.r0,
        r1: update.reserves.r1,
        block: update.blockNumber,
      },
      price: update.price,
      liquidityUSD: update.liquidityUSD,
      spread: update.spreadBps,
    } as const;

    upsertSnapshot(payload);
    broadcastUpdate(payload);

    if (update.blockNumber > latestBlockObserved) {
      latestBlockObserved = update.blockNumber;
    }
  });

  logger.info(
    { wsPort: env.WS_PORT, metricsPort: env.METRICS_PORT },
    'Backend running'
  );
}

main().catch((err) => {
  logger.fatal({ err }, 'Fatal boot error');
  process.exit(1);
});
