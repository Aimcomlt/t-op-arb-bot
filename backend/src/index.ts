// backend/src/index.ts
import 'dotenv/config';
import { safeParse } from 'valibot';
import type { SyncUpdate } from './core/syncListener.js';
import { EnvSchema, setEnv, env } from './config/env.js';

const parsed = safeParse(EnvSchema, process.env);
if (!parsed.success) {
  console.error('Invalid environment variables', parsed.issues);
  process.exit(1);
}
setEnv(parsed.output);

const { logger } = await import('./utils/logger.js');
const {
  startHttpServer,
  setHealthProbe,
  setProvidersReady,
  setWsReady,
  setOpportunityHeapReady,
} = await import('./server/http.js');
const { startMetricsServer } = await import('./monitoring/metrics.js');
const {
  startWsServer,
  upsertSnapshot,
  broadcastUpdate,
} = await import('./server/wsServer.js');
const { opportunityStore } = await import('./core/opportunityStore.js');
const { bootstrapMatchedLPs } = await import('./bootstrap/pairs.js');
const { startSyncListener } = await import('./core/syncListener.js');

async function main() {
  logger.info({ env: { chainId: env.CHAIN_ID } }, 'Boot start');

  // 1) Metrics + HTTP + WS
  startMetricsServer(env.METRICS_PORT);
  startHttpServer(); // exposes /healthz, /version, /pairs
  startWsServer(env.WS_PORT);
  setWsReady(true);

  // 2) Collect & match LPs (Uniswap/Sushi) → canonical matched list
  logger.info('Collecting & matching LPs…');
  const matchedLPs = await bootstrapMatchedLPs();
  setProvidersReady(true);
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

    opportunityStore.upsert(
      update.pairSymbol,
      Number(update.spreadBps ?? '0'),
      Number(update.liquidityUSD ?? '0'),
    );

    if (update.blockNumber > latestBlockObserved) {
      latestBlockObserved = update.blockNumber;
    }
  });
  setOpportunityHeapReady(true);

  logger.info(
    { wsPort: env.WS_PORT, metricsPort: env.METRICS_PORT },
    'Backend running'
  );
}

main().catch((err) => {
  logger.fatal({ err }, 'Fatal boot error');
  process.exit(1);
});
