// backend/src/server/wsServer.ts
import WebSocket, { WebSocketServer } from 'ws';
import type { IncomingMessage, OutgoingHttpHeaders } from 'http';
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

/**
 * Extract a token from any of the supported auth transports:
 * - Authorization header: "Bearer <token>"
 * - Query parameter:      /stream?token=<token>
 * - Subprotocols:         new WebSocket(url, ['bearer', '<token>'])
 *
 * Returns the token (if found), how it was provided, and (optionally)
 * a response header to echo the selected subprotocol.
 */
function extractTokenFromUpgrade(info: any): {
  token: string | null;
  via: 'header' | 'query' | 'subprotocol' | null;
  responseHeaders?: Record<string, string>;
} {
  try {
    // 1) Authorization header
    const auth = (info.req.headers?.['authorization'] as string | undefined) ?? '';
    const parts = auth.split(' ');
    if (parts.length === 2 && /^bearer$/i.test(parts[0])) {
      return { token: parts[1], via: 'header' };
    }

    // 2) Query param
    const rawUrl = (info.req.url as string) || '/';
    const url = new URL(rawUrl, 'http://localhost'); // base required only for parsing
    const qpToken = url.searchParams.get('token');
    if (qpToken) {
      return { token: qpToken, via: 'query' };
    }

    // 3) Subprotocols
    const protoHeader = (info.req.headers?.['sec-websocket-protocol'] as string | undefined) ?? '';
    const requested = protoHeader
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    if (requested.length > 0) {
      // Accept if either:
      //   - token is directly one of the protocols, OR
      //   - 'bearer' is present AND token is also present as a separate protocol.
      const hasBearer = requested.includes('bearer');
      const tokenProto = requested.find((p) => p === env.WS_AUTH_TOKEN) || null;

      if (tokenProto) {
        // Choose a protocol to echo back. If the client offered 'bearer', echo that;
        // otherwise echo the token itself (must echo one of the offered values).
        const selected = hasBearer ? 'bearer' : tokenProto;
        return {
          token: tokenProto,
          via: 'subprotocol',
          responseHeaders: { 'Sec-WebSocket-Protocol': selected },
        };
      }
    }

    return { token: null, via: null };
  } catch {
    return { token: null, via: null };
  }
}

export function startWsServer(port = env.WS_PORT, o: WsServerOptions = {}) {
  if (wss) return controlSurface;

  opts = { ...defaultOpts, ...o } as Required<WsServerOptions>;

  wss = new WebSocketServer({
    port,

    // Accept token via header, query, or subprotocol.
    verifyClient: (
      info: { origin: string; secure: boolean; req: IncomingMessage },
      done: (result: boolean, code?: number, message?: string, headers?: OutgoingHttpHeaders) => void
    ) => {
      // Parse inputs
      const url = new URL(info.req.url ?? '/', 'ws://localhost'); // base to parse relative path
      const qsToken = url.searchParams.get('token')?.trim() ?? null;

      const headerAuth = String(info.req.headers['authorization'] ?? '').trim();
      const fromHeader = headerAuth.startsWith('Bearer ')
        ? headerAuth.slice(7)
        : null;

      // For clients that send subprotocols like ['bearer', <token>]
      const subprotoRaw = String(info.req.headers['sec-websocket-protocol'] ?? '').trim();
      const subprotocols = subprotoRaw
        ? subprotoRaw.split(',').map((s) => s.trim()).filter(Boolean)
        : [];

      // Token presented by any channel
      const presented = qsToken ?? fromHeader ?? (subprotocols.length >= 2 && subprotocols[0].toLowerCase() === 'bearer'
        ? subprotocols[1]
        : null);

      const expected = String(env.WS_AUTH_TOKEN ?? '').trim();
      const ok = Boolean(presented && expected && presented === expected);

      // Optional debug (leave during dev):
      // console.info('[WS verify]', { qsToken, headerAuth, subprotocols, ok });

      // IMPORTANT: always call done(...)
      if (ok) return done(true);
      return done(false, 401, 'Unauthorized');
    },

    // Echo "bearer" if client advertised it; this satisfies browsers & some tools.
    handleProtocols: (protocols: Set<string>) => (protocols.has('bearer') ? 'bearer' : false),
  });

  // Expose for tests
  // @ts-ignore
  globalThis.wss = wss;
  logger.info({ port }, 'WS server listening');

  wss.on('connection', handleConnection);
  wss.on('error', (err: unknown) => logger.error({ err }, 'WS server error'));

  heartbeat = setInterval(() => {
    for (const [ws, state] of clients) {
      if (!state.isAlive) {
        try { ws.terminate(); } catch {}
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
  if (!wss) return;
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

  wss.close();
  wss = null;
  // @ts-ignore
  globalThis.wss = undefined;
}

export const controlSurface = {
  start: startWsServer,
  stop: stopWsServer,
  upsertSnapshot,
  broadcastUpdate,
  getClientCount: () => clients.size,
};
