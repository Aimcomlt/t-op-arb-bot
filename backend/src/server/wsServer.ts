import WebSocket, { WebSocketServer } from 'ws';

import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import {
  wsClientsActiveGauge,
  broadcastMsgsTotalCounter,
  wsMsgsDroppedTotalCounter,
  wsQueueDepthGauge,
} from '../monitoring/metrics.js';
import { TokenMetaUpdate, tokenMetaUpdateZ } from '@t-op-arb-bot/types';

// Derive types from runtime values (robust across TS/ESM configs)
type WSClient = InstanceType<typeof WebSocket>;
type WSServer = InstanceType<typeof WebSocketServer>;

// State
const snapshot = new Map<string, TokenMetaUpdate['payload']>();
const clients = new Map<WSClient, ClientState>();
let wss: WSServer | null = null;
let heartbeat: NodeJS.Timeout | null = null;

interface ClientState {
  queue: string[];
  tokens: number;
  lastRefill: number;
  isAlive: boolean;
}

type WsServerOptions = {
  bucketCapacity?: number;
  refillPerSec?: number;
  queueCap?: number;
  pingIntervalMs?: number;
};

const defaultOpts = {
  bucketCapacity: 50,
  refillPerSec: 50,
  queueCap: 100,
  pingIntervalMs: 30_000,
};

let opts: Required<WsServerOptions> = { ...defaultOpts };

export function startWsServer(port = env.WS_PORT, o: WsServerOptions = {}) {
  if (wss) return controlSurface;

  opts = { ...defaultOpts, ...o } as Required<WsServerOptions>;

  wss = new WebSocketServer({
    port,
    verifyClient: (info, done) => {
      const auth = info.req.headers['authorization'];
      if (auth === `Bearer ${env.WS_AUTH_TOKEN}`) done(true);
      else done(false, 401, 'Unauthorized');
    },
  });
  globalThis.wss = wss;
  logger.info({ port }, 'WS server listening');

  wss.on('connection', handleConnection);
  wss.on('error', (err: unknown) => logger.error({ err }, 'WS server error'));

  heartbeat = setInterval(() => {
    for (const [ws, state] of clients) {
      if (!state.isAlive) {
        try {
          ws.terminate();
        } catch {}
        clients.delete(ws);
        wsClientsActiveGauge.dec();
        continue;
      }
      state.isAlive = false;
      try { ws.ping(); } catch {}
      flush(ws, state);
    }
    wsQueueDepthGauge.set(totalQueueDepth());
  }, opts.pingIntervalMs);

  return controlSurface;
}

function handleConnection(ws: WSClient) {
  const state: ClientState = {
    queue: [],
    tokens: opts.bucketCapacity,
    lastRefill: Date.now(),
    isAlive: true,
  };
  clients.set(ws, state);
  wsClientsActiveGauge.inc();

  ws.on('pong', () => {
    state.isAlive = true;
  });

  ws.on('close', () => {
    clients.delete(ws);
    wsClientsActiveGauge.dec();
    wsQueueDepthGauge.set(totalQueueDepth());
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

  for (const [ws, state] of clients) {
    if (ws.readyState !== WebSocket.OPEN) continue;
    enqueue(ws, state, json);
  }
  wsQueueDepthGauge.set(totalQueueDepth());
}

function safeSend(ws: WSClient, update: TokenMetaUpdate) {
  const parsed = tokenMetaUpdateZ.safeParse(update);
  if (!parsed.success) {
    logger.error({ issues: parsed.error.issues, update }, 'Snapshot message failed validation');
    return;
  }
  const json = JSON.stringify(parsed.data);
  const state = clients.get(ws);
  if (!state) return;
  enqueue(ws, state, json);
  wsQueueDepthGauge.set(totalQueueDepth());
}

function enqueue(ws: WSClient, state: ClientState, msg: string) {
  if (state.queue.length >= opts.queueCap) {
    wsMsgsDroppedTotalCounter.inc(1);
    return;
  }
  state.queue.push(msg);
  flush(ws, state);
}

function flush(ws: WSClient, state: ClientState) {
  refill(state);
  while (state.tokens > 0 && state.queue.length > 0) {
    const msg = state.queue.shift()!;
    try {
      ws.send(msg);
      state.tokens--;
      broadcastMsgsTotalCounter.inc(1);
    } catch (err) {
      logger.warn({ err }, 'WS send failed');
      break;
    }
  }
}

function refill(state: ClientState) {
  const now = Date.now();
  const elapsed = Math.floor((now - state.lastRefill) / 1000);
  if (elapsed > 0) {
    state.tokens = Math.min(opts.bucketCapacity, state.tokens + elapsed * opts.refillPerSec);
    state.lastRefill += elapsed * 1000;
  }
}

function totalQueueDepth(): number {
  let total = 0;
  for (const state of clients.values()) total += state.queue.length;
  return total;
}

export function stopWsServer() {
  if (!wss) return;
  if (heartbeat) {
    clearInterval(heartbeat);
    heartbeat = null;
  }
  for (const ws of clients.keys()) {
    try { ws.close(); } catch {}
  }
  clients.clear();
  wsClientsActiveGauge.set(0);
  wsQueueDepthGauge.set(0);

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
