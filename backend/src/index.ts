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
    // Map SyncUpdate → TokenMetaUpdate['payload']
    // NOTE: `syncListener` should already return normalized price/spread as strings.
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

    // keep snapshot current for new WS clients
    upsertSnapshot(payload);
    // broadcast to all connected clients
    broadcastUpdate(payload);

    // update health
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
