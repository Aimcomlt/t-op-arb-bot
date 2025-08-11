import WebSocket, { WebSocketServer } from 'ws';
import { z } from 'zod';

import { env } from '../config/env';
import { wsClientsActive, broadcastMsgsTotal } from '../monitoring/metrics';
import { logger } from '../utils/logger';

// Zod schemas for token metadata updates
const tokenMetaSchema = z.object({
  address: z.string(),
  symbol: z.string(),
  decimals: z.number(),
});

const tokenMetaUpdateSchema = z.object({
  type: z.literal('tokenMeta.update'),
  payload: z.record(tokenMetaSchema),
});

export type TokenMeta = z.infer<typeof tokenMetaSchema>;
export type TokenMetaUpdate = z.infer<typeof tokenMetaUpdateSchema>;

let snapshot: Record<string, TokenMeta> = {};

const wss = new WebSocketServer({ port: env.WS_PORT });
logger.info(`WebSocket server listening on port ${env.WS_PORT}`);

wss.on('connection', (ws) => {
  wsClientsActive.inc();

  const fullUpdate: TokenMetaUpdate = { type: 'tokenMeta.update', payload: snapshot };
  const parsed = tokenMetaUpdateSchema.parse(fullUpdate);
  ws.send(JSON.stringify(parsed));

  ws.on('close', () => {
    wsClientsActive.dec();
  });
});

export function broadcast(update: TokenMetaUpdate): void {
  const parsed = tokenMetaUpdateSchema.safeParse(update);
  if (!parsed.success) {
    logger.error({ err: parsed.error }, 'invalid token meta update');
    return;
  }

  snapshot = { ...snapshot, ...parsed.data.payload };
  const payload = JSON.stringify(parsed.data);

  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
      broadcastMsgsTotal.inc();
    }
  }
}

