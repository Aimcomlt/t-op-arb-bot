// src/core/initT_OP_Bot.ts

/**
 * Entry point for T-OP-Arb-Bot runtime.
 * Collects LP pairs → formats canonically → builds token meta
 * → emits over WebSocket for consumers (frontends or strategy loop).
 */

import { collectPairs } from '../dex/dexCollector.js';
import { normalizePairs } from './pairFormatter.js';
import { consolidateTokenMeta } from './metaConsolidator.js';
import { startBroadcastServer, broadcastState } from '../ws/broadcaster.js';

async function initT_OP_Bot() {
  console.log('[init] Booting T-OP-Arb-Bot backend...');

  try {
    startBroadcastServer();

    const rawPairs = await collectPairs();
    console.log(`[init] Loaded ${rawPairs.length} raw LP pairs`);

    const canonicalPairs = normalizePairs(rawPairs);
    console.log(`[init] Reduced to ${canonicalPairs.length} canonical pairs`);

    const tokenMeta = await consolidateTokenMeta(canonicalPairs);
    console.log(`[init] Consolidated ${Object.keys(tokenMeta).length} token meta entries`);

    broadcastState(tokenMeta);
    console.log('[init] Broadcast complete. Bot is live.');
  } catch (err) {
    console.error('[init] Failed during startup:', err);
    process.exit(1);
  }
}

// Entry trigger
initT_OP_Bot();
