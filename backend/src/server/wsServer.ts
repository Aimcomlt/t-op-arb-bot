// backend/src/server/wsServer.ts
import WebSocket, { WebSocketServer } from 'ws';
import { createServer, type IncomingMessage } from 'http';
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
let server: ReturnType<typeof createServer> | null = null;
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

function maskToken(token: string | null): string {
  if (!token) return '';
  if (token.length <= 8) return '*'.repeat(token.length);
  return `${token.slice(0, 4)}***${token.slice(-4)}`;
}

function extractToken(req: IncomingMessage): {
  token: string | null;
  via: 'protocol' | 'header' | 'query' | null;
} {
  const proto = String(req.headers['sec-websocket-protocol'] ?? '');
  const protocols = proto.split(',').map((s) => s.trim()).filter(Boolean);
  for (const p of protocols) {
    if (/^token:/i.test(p)) return { token: p.slice(6), via: 'protocol' };
    if (/^bearer\s+/i.test(p)) return { token: p.slice(7), via: 'protocol' };
  }

  const auth = String(req.headers['authorization'] ?? '');
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (m) return { token: m[1], via: 'header' };

  try {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const qp = url.searchParams.get('token');
    if (qp) return { token: qp, via: 'query' };
  } catch {}

  return { token: null, via: null };
}

export function startWsServer(port = env.WS_PORT, o: WsServerOptions = {}) {
  if (wss) return controlSurface;

  opts = { ...defaultOpts, ...o } as Required<WsServerOptions>;

  wss = new WebSocketServer({ noServer: true });
  server = createServer();

  server.on('upgrade', (req, socket, head) => {
    const origin = String(req.headers.origin ?? '');
    const { token, via } = extractToken(req);
    const masked = maskToken(token);

    if (env.FRONTEND_ORIGINS.length > 0 && !env.FRONTEND_ORIGINS.includes(origin)) {
      logger.warn({ origin, token: masked, reason: 'origin not allowed' }, 'WS upgrade rejected');
      socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
      socket.destroy();
      return;
    }

    if (via === 'query' && env.NODE_ENV !== 'development') {
      logger.warn({ origin, token: masked, reason: 'query param not allowed' }, 'WS upgrade rejected');
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    if (!token) {
      logger.warn({ origin, reason: 'missing token' }, 'WS upgrade rejected');
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    if (token !== env.WS_AUTH_TOKEN) {
      logger.warn({ origin, token: masked, reason: 'invalid token' }, 'WS upgrade rejected');
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    delete req.headers['sec-websocket-protocol'];
    wss!.handleUpgrade(req, socket, head, (ws) => {
      wss!.emit('connection', ws, req);
    });
  });

  server.listen(port);
  // Expose for tests
  // @ts-ignore
  globalThis.wss = server;
  const addr = server.address();
  logger.info({ port: typeof addr === 'object' && addr ? addr.port : port }, 'WS server listening');

  wss.on('connection', handleConnection);
  wss.on('error', (err: unknown) => logger.error({ err }, 'WS server error'));

  heartbeat = setInterval(() => {
    for (const [ws, state] of clients) {
      if (!state.isAlive) {
        try { ws.terminate(); } catch {}
        if (clients.delete(ws)) {
          wsClientsActiveGauge.dec();
        }
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
    if (clients.delete(ws)) {
      wsClientsActiveGauge.dec();
    }
    wsQueueDepthGauge.set(totalQueueDepth());
  });

  // Replay snapshot on connect
  for (const payload of snapshot.values()) {
    const update: TokenMetaUpdate = {
      type: 'tokenMeta.update',
      at: new Date().toISOString(),
      payload,
    };
    safeSend(ws, update);
  }
}

export function upsertSnapshot(payload: TokenMetaUpdate['payload']) {
  snapshot.set(payload.pairSymbol, payload);
}

export function broadcastUpdate(payload: TokenMetaUpdate['payload']) {
  const update: TokenMetaUpdate = {
    type: 'tokenMeta.update',
    at: new Date().toISOString(),
    payload,
  };

  // Validate against canonical schema
  const parsed = tokenMetaUpdateZ.safeParse(update);
  if (!parsed.success) {
    logger.error(
      { issues: parsed.error.issues, payload },
      'Refusing to broadcast invalid TokenMetaUpdate',
    );
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
    state.tokens = Math.min(
      opts.bucketCapacity,
      state.tokens + elapsed * opts.refillPerSec,
    );
    state.lastRefill += elapsed * 1000;
  }
}

function totalQueueDepth(): number {
  let total = 0;
  for (const state of clients.values()) total += state.queue.length;
  return total;
}

export function stopWsServer() {
  if (!wss && !server) return;
  if (heartbeat) {
    clearInterval(heartbeat);
    heartbeat = null;
  }
  for (const ws of clients.keys()) {
    try {
      ws.close();
    } catch {}
  }
  clients.clear();
  wsClientsActiveGauge.set(0);
  wsQueueDepthGauge.set(0);

  if (wss) {
    wss.close();
    wss = null;
  }
  if (server) {
    server.close();
    server = null;
  }
  // @ts-ignore
  globalThis.wss = undefined;
}

export const controlSurface = {
  start: startWsServer,
  stop: stopWsServer,
  upsertSnapshot,
  broadcastUpdate,
  getClientCount: () => clients.size,
  getWsClientsActiveGaugeValue: async () => {
    const metric = await wsClientsActiveGauge.get();
    return metric.values[0]?.value ?? 0;
  },
};
