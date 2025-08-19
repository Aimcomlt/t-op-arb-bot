// backend/src/server/wsServer.ts
import WebSocket, { WebSocketServer } from 'ws';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { wsClientsActiveGauge, broadcastMsgsTotalCounter, wsMsgsDroppedTotalCounter, wsQueueDepthGauge, } from '../monitoring/metrics.js';
import { tokenMetaUpdateZ } from '@t-op-arb-bot/types';
// State
const snapshot = new Map();
const clients = new Map();
let wss = null;
let heartbeat = null;
const defaultOpts = {
    bucketCapacity: 50,
    refillPerSec: 50,
    queueCap: 100,
    pingIntervalMs: 30_000,
};
let opts = { ...defaultOpts };
/**
 * Extract a token from any of the supported auth transports:
 * - Authorization header: "Bearer <token>"
 * - Query parameter:      /stream?token=<token>
 * - Subprotocols:         new WebSocket(url, ['bearer', '<token>'])
 *
 * Returns the token (if found), how it was provided, and (optionally)
 * a response header to echo the selected subprotocol.
 */
function extractTokenFromUpgrade(info) {
    try {
        // 1) Authorization header
        const auth = info.req.headers?.['authorization'] ?? '';
        const parts = auth.split(' ');
        if (parts.length === 2 && /^bearer$/i.test(parts[0])) {
            return { token: parts[1], via: 'header' };
        }
        // 2) Query param
        const rawUrl = info.req.url || '/';
        const url = new URL(rawUrl, 'http://localhost'); // base required only for parsing
        const qpToken = url.searchParams.get('token');
        if (qpToken) {
            return { token: qpToken, via: 'query' };
        }
        // 3) Subprotocols
        const protoHeader = info.req.headers?.['sec-websocket-protocol'] ?? '';
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
    }
    catch {
        return { token: null, via: null };
    }
}
export function startWsServer(port = env.WS_PORT, o = {}) {
    if (wss)
        return controlSurface;
    opts = { ...defaultOpts, ...o };
    wss = new WebSocketServer({
        port,
        // Accept token via header, query, or subprotocol.
        verifyClient: (info, done) => {
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
            if (ok)
                return done(true);
            return done(false, 401, 'Unauthorized');
        },
        // Echo "bearer" if client advertised it; this satisfies browsers & some tools.
        handleProtocols: (protocols) => (protocols.has('bearer') ? 'bearer' : false),
    });
    // Expose for tests
    // @ts-ignore
    globalThis.wss = wss;
    logger.info({ port }, 'WS server listening');
    wss.on('connection', handleConnection);
    wss.on('error', (err) => logger.error({ err }, 'WS server error'));
    heartbeat = setInterval(() => {
        for (const [ws, state] of clients) {
            if (!state.isAlive) {
                try {
                    ws.terminate();
                }
                catch { }
                clients.delete(ws);
                wsClientsActiveGauge.dec();
                continue;
            }
            state.isAlive = false;
            try {
                ws.ping();
            }
            catch { }
            flush(ws, state);
        }
        wsQueueDepthGauge.set(totalQueueDepth());
    }, opts.pingIntervalMs);
    return controlSurface;
}
function handleConnection(ws) {
    const state = {
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
        const update = {
            type: 'tokenMeta.update',
            at: new Date().toISOString(),
            payload,
        };
        safeSend(ws, update);
    }
}
export function upsertSnapshot(payload) {
    snapshot.set(payload.pairSymbol, payload);
}
export function broadcastUpdate(payload) {
    const update = {
        type: 'tokenMeta.update',
        at: new Date().toISOString(),
        payload,
    };
    // Validate against canonical schema
    const parsed = tokenMetaUpdateZ.safeParse(update);
    if (!parsed.success) {
        logger.error({ issues: parsed.error.issues, payload }, 'Refusing to broadcast invalid TokenMetaUpdate');
        return;
    }
    const json = JSON.stringify(parsed.data);
    for (const [ws, state] of clients) {
        if (ws.readyState !== WebSocket.OPEN)
            continue;
        enqueue(ws, state, json);
    }
    wsQueueDepthGauge.set(totalQueueDepth());
}
function safeSend(ws, update) {
    const parsed = tokenMetaUpdateZ.safeParse(update);
    if (!parsed.success) {
        logger.error({ issues: parsed.error.issues, update }, 'Snapshot message failed validation');
        return;
    }
    const json = JSON.stringify(parsed.data);
    const state = clients.get(ws);
    if (!state)
        return;
    enqueue(ws, state, json);
    wsQueueDepthGauge.set(totalQueueDepth());
}
function enqueue(ws, state, msg) {
    if (state.queue.length >= opts.queueCap) {
        wsMsgsDroppedTotalCounter.inc(1);
        return;
    }
    state.queue.push(msg);
    flush(ws, state);
}
function flush(ws, state) {
    refill(state);
    while (state.tokens > 0 && state.queue.length > 0) {
        const msg = state.queue.shift();
        try {
            ws.send(msg);
            state.tokens--;
            broadcastMsgsTotalCounter.inc(1);
        }
        catch (err) {
            logger.warn({ err }, 'WS send failed');
            break;
        }
    }
}
function refill(state) {
    const now = Date.now();
    const elapsed = Math.floor((now - state.lastRefill) / 1000);
    if (elapsed > 0) {
        state.tokens = Math.min(opts.bucketCapacity, state.tokens + elapsed * opts.refillPerSec);
        state.lastRefill += elapsed * 1000;
    }
}
function totalQueueDepth() {
    let total = 0;
    for (const state of clients.values())
        total += state.queue.length;
    return total;
}
export function stopWsServer() {
    if (!wss)
        return;
    if (heartbeat) {
        clearInterval(heartbeat);
        heartbeat = null;
    }
    for (const ws of clients.keys()) {
        try {
            ws.close();
        }
        catch { }
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
