import { WebSocketServer, WebSocket } from 'ws';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import {
  wsClientsActiveGauge,
  broadcastMsgsTotalCounter,
} from '../monitoring/metrics';
import {
  TokenMetaUpdate,
  tokenMetaUpdateZ,
} from '@t-op-arb-bot/types';

/**
 * An in-memory snapshot keyed by pairSymbol.
 * On each update we upsert into this map. On client connect,
 * we replay the snapshot (one `tokenMeta.update` per pair).
 */
const snapshot = new Map<string, TokenMetaUpdate['payload']>();

/** Connected clients */
const clients = new Set<WebSocket>();

let wss: WebSocketServer | null = null;

/**
 * Start the WebSocket server (idempotent).
 * Returns a small control surface used by the engine.
 */
export function startWsServer(port = env.WS_PORT) {
  if (wss) return controlSurface; // already started

  wss = new WebSocketServer({ port });
  logger.info({ port }, 'WS server listening');
  wss.on('connection', handleConnection);

  return controlSurface;
}

function handleConnection(ws: WebSocket) {
  clients.add(ws);
  wsClientsActiveGauge.inc();

  ws.on('close', () => {
    clients.delete(ws);
    wsClientsActiveGauge.dec();
  });

  // Send full snapshot to the new client (one validated message per pair)
  for (const payload of snapshot.values()) {
    const update: TokenMetaUpdate = {
      type: 'tokenMeta.update',
      at: new Date().toISOString(),
      payload,
    };
    safeSend(ws, update);
  }
}

/**
 * Upsert a single pair payload into the snapshot by pairSymbol.
 * This does not broadcast by itself—call `broadcastUpdate` to fan out.
 */
export function upsertSnapshot(payload: TokenMetaUpdate['payload']) {
  snapshot.set(payload.pairSymbol, payload);
}

/**
 * Broadcast a single validated TokenMetaUpdate to all clients.
 */
export function broadcastUpdate(payload: TokenMetaUpdate['payload']) {
  const update: TokenMetaUpdate = {
    type: 'tokenMeta.update',
    at: new Date().toISOString(),
    payload,
  };

  // Validate against canonical Zod schema before sending
  const parsed = tokenMetaUpdateZ.safeParse(update);
  if (!parsed.success) {
    logger.error(
      {
        issues: parsed.error.issues,
        payload,
      },
      'Refusing to broadcast invalid TokenMetaUpdate'
    );
    return;
  }

  const json = JSON.stringify(parsed.data);
  let sent = 0;

  for (const ws of clients) {
    // Skip if socket not open
    if (ws.readyState !== ws.OPEN) continue;
    try {
      ws.send(json);
      sent++;
    } catch (err) {
      logger.warn({ err }, 'WS send failed');
    }
  }

  if (sent > 0) {
    broadcastMsgsTotalCounter.inc(sent);
  }
}

/**
 * Helper to validate + send to a single socket (used for snapshot replay).
 */
function safeSend(ws: WebSocket, update: TokenMetaUpdate) {
  const parsed = tokenMetaUpdateZ.safeParse(update);
  if (!parsed.success) {
    logger.error(
      { issues: parsed.error.issues, update },
      'Snapshot message failed validation'
    );
    return;
  }
  try {
    ws.send(JSON.stringify(parsed.data));
    broadcastMsgsTotalCounter.inc(1);
  } catch (err) {
    logger.warn({ err }, 'WS snapshot send failed');
  }
}

/**
 * Optional lifecycle helpers
 */
export function stopWsServer() {
  if (!wss) return;
  for (const ws of clients) {
    try {
      ws.close();
    } catch {}
  }
  clients.clear();
  wsClientsActiveGauge.set(0);

  wss.close();
  wss = null;
}

/**
 * A tiny control surface used by the engine/bootstrap code.
 */
export const controlSurface = {
  start: startWsServer,
  stop: stopWsServer,
  upsertSnapshot,
  broadcastUpdate,
  getClientCount: () => clients.size,
};
