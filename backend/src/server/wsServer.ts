import WebSocket, { WebSocketServer } from 'ws';

import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { wsClientsActiveGauge, broadcastMsgsTotalCounter } from '../monitoring/metrics.js';
import { TokenMetaUpdate, tokenMetaUpdateZ } from '@t-op-arb-bot/types';

// Derive types from runtime values (robust across TS/ESM configs)
type WSClient = InstanceType<typeof WebSocket>;
type WSServer = InstanceType<typeof WebSocketServer>;

// State
const snapshot = new Map<string, TokenMetaUpdate['payload']>();
const clients = new Set<WSClient>();
let wss: WSServer | null = null;

export function startWsServer(port = env.WS_PORT) {
  if (wss) return controlSurface;

  wss = new WebSocketServer({ port });
  globalThis.wss = wss;
  logger.info({ port }, 'WS server listening');

  wss.on('connection', handleConnection);
  wss.on('error', (err: unknown) => logger.error({ err }, 'WS server error'));

  return controlSurface;
}

function handleConnection(ws: WSClient) {
  clients.add(ws);
  wsClientsActiveGauge.inc();

  ws.on('close', () => {
    clients.delete(ws);
    wsClientsActiveGauge.dec();
  });

  // Replay snapshot on connect
  for (const payload of snapshot.values()) {
    const update: TokenMetaUpdate = { type: 'tokenMeta.update', at: new Date().toISOString(), payload };
    safeSend(ws, update);
  }
}

export function upsertSnapshot(payload: TokenMetaUpdate['payload']) {
  snapshot.set(payload.pairSymbol, payload);
}

export function broadcastUpdate(payload: TokenMetaUpdate['payload']) {
  const update: TokenMetaUpdate = { type: 'tokenMeta.update', at: new Date().toISOString(), payload };

  // Validate against canonical schema
  const parsed = tokenMetaUpdateZ.safeParse(update);
  if (!parsed.success) {
    logger.error({ issues: parsed.error.issues, payload }, 'Refusing to broadcast invalid TokenMetaUpdate');
    return;
  }

  const json = JSON.stringify(parsed.data);
  let sent = 0;

  for (const ws of clients) {
    if (ws.readyState !== WebSocket.OPEN) continue; // static OPEN from value import
    try {
      ws.send(json);
      sent++;
    } catch (err) {
      logger.warn({ err }, 'WS send failed');
    }
  }
  if (sent > 0) broadcastMsgsTotalCounter.inc(sent);
}

function safeSend(ws: WSClient, update: TokenMetaUpdate) {
  const parsed = tokenMetaUpdateZ.safeParse(update);
  if (!parsed.success) {
    logger.error({ issues: parsed.error.issues, update }, 'Snapshot message failed validation');
    return;
  }
  try {
    ws.send(JSON.stringify(parsed.data));
    broadcastMsgsTotalCounter.inc(1);
  } catch (err) {
    logger.warn({ err }, 'WS snapshot send failed');
  }
}

export function stopWsServer() {
  if (!wss) return;
  for (const ws of clients) {
    try { ws.close(); } catch {}
  }
  clients.clear();
  wsClientsActiveGauge.set(0);

  wss.close();
  wss = null;
  globalThis.wss = undefined;
}

export const controlSurface = {
  start: startWsServer,
  stop: stopWsServer,
  upsertSnapshot,
  broadcastUpdate,
  getClientCount: () => clients.size,
};
