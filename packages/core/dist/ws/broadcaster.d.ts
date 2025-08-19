import type { TokenMeta } from '../core/metaConsolidator.js';
/**
 * Starts the WebSocket server if not already started
 */
export declare function startBroadcastServer(): void;
/**
 * Broadcasts tokenMeta to all connected subscribers
 */
export declare function broadcastState(tokenMeta: Record<string, TokenMeta>): void;
//# sourceMappingURL=broadcaster.d.ts.map