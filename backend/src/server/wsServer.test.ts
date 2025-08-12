import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
vi.mock('@t-op-arb-bot/types', () => ({
  tokenMetaUpdateZ: { safeParse: (d: any) => ({ success: true, data: d }) },
}));
import WebSocket from 'ws';
import type { AddressInfo } from 'node:net';
import { setEnv, type Env } from '../config/env.js';

let startWsServer: any;
let stopWsServer: any;
let broadcastUpdate: any;
let controlSurface: any;

const baseEnv: Env = {
  RPC_HTTP_URL: 'http://localhost:8545',
  RPC_WSS_URL: 'ws://localhost:8546',
  CHAIN_ID: 1,
  WS_PORT: 0,
  HTTP_PORT: 0,
  LOG_LEVEL: 'info',
  METRICS_PORT: 0,
  WS_AUTH_TOKEN: 'secret',
  WETH_ADDRESS: '0x0000000000000000000000000000000000000000',
  MIN_SPREAD_BPS: 0,
  MIN_LIQ_USD: 0,
  MIN_RESERVE: 0,
  QUOTE_ALLOWLIST: [],
  QUOTE_DENYLIST: [],
  LP_SEED_JSON: '',
  MAX_PAIRS: 50,
  COLLECT_CONCURRENCY: 2,
  CHUNK_DELAY_MS: 500,
  START_INDEX: 0,
  KILL_SWITCH: false,
  SIM_ON_SUCCESSFUL_TRADES: false,
  TRACE_BROADCAST_ENABLED: false,
};

beforeEach(async () => {
  setEnv({ ...baseEnv });
  const mod = await import('./wsServer.js');
  startWsServer = mod.startWsServer;
  stopWsServer = mod.stopWsServer;
  broadcastUpdate = mod.broadcastUpdate;
  controlSurface = mod.controlSurface;
});

afterEach(() => {
  stopWsServer();
});

function getPort(): number {
  return (globalThis.wss!.address() as AddressInfo).port;
}

describe('wsServer authentication', () => {
  it('rejects clients without bearer token', async () => {
    startWsServer(0);
    const port = getPort();

    await expect(
      new Promise((resolve, reject) => {
        const ws = new WebSocket(`ws://127.0.0.1:${port}`);
        ws.on('open', resolve);
        ws.on('error', reject);
      })
    ).rejects.toThrow(/401/);

    expect(controlSurface.getClientCount()).toBe(0);
  });
});

describe('wsServer heartbeat', () => {
  it('disconnects clients that miss heartbeats', async () => {
    startWsServer(0, { pingIntervalMs: 50 });
    const port = getPort();
    const ws = new WebSocket(`ws://127.0.0.1:${port}`, {
      headers: { Authorization: 'Bearer secret' },
    });
    await new Promise((r) => ws.on('open', r));
    await new Promise((r) => setTimeout(r, 10));
    // disable automatic pong replies
    (ws as any).pong = () => {};
    await new Promise((r) => ws.on('close', r));

    expect(controlSurface.getClientCount()).toBe(0);
  });
});

describe('wsServer backpressure', () => {
  it('drops messages when queues are full', async () => {
    startWsServer(0, { bucketCapacity: 1, refillPerSec: 0, queueCap: 2, pingIntervalMs: 10_000 });
    const port = getPort();
    const ws = new WebSocket(`ws://127.0.0.1:${port}`, {
      headers: { Authorization: 'Bearer secret' },
    });
    await new Promise((r) => ws.on('open', r));

    const payload = {
      pairSymbol: 'A/B',
      dex: 'uniswap' as const,
      lpAddress: '0x0000000000000000000000000000000000000001',
      reserves: { r0: '0', r1: '0', block: 0 },
      price: '0',
      liquidityUSD: '0',
      spread: '0',
    };

    const received: any[] = [];
    ws.on('message', () => received.push(1));
    for (let i = 0; i < 10; i++) {
      broadcastUpdate(payload);
    }
    await new Promise((r) => setTimeout(r, 20));

    expect(received.length).toBe(1);
    ws.close();
  });
});

