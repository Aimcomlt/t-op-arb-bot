import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { AddressInfo } from 'node:net';
import { setEnv, type Env } from '../config/env.js';

let startHttpServer: any;
let opportunityStore: any;
let server: any;

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
  const mod = await import('./http.js');
  startHttpServer = mod.startHttpServer;
  opportunityStore = (await import('../core/opportunityStore.js')).opportunityStore;
  opportunityStore.clear();
});

afterEach(() => {
  server?.close();
});

function getPort(): number {
  return (server.address() as AddressInfo).port;
}

describe('GET /opportunities', () => {
  it('returns heap snapshot', async () => {
    opportunityStore.upsert('A/B', 10, 100);
    opportunityStore.upsert('C/D', 5, 50);
    server = startHttpServer(0);
    await new Promise((r) => server.on('listening', r));
    const port = getPort();
    const res = await fetch(`http://127.0.0.1:${port}/opportunities`);
    const data = await res.json();
    expect(data.size).toBe(2);
    expect(data.entries[0]).toHaveProperty('pairSymbol');
  });
});

describe('GET /ws-auth-check', () => {
  it('returns 200 for valid token', async () => {
    server = startHttpServer(0);
    await new Promise((r) => server.on('listening', r));
    const port = getPort();
    const res = await fetch(`http://127.0.0.1:${port}/ws-auth-check?token=secret`);
    expect(res.status).toBe(200);
  });

  it('rejects invalid token', async () => {
    server = startHttpServer(0);
    await new Promise((r) => server.on('listening', r));
    const port = getPort();
    const res = await fetch(`http://127.0.0.1:${port}/ws-auth-check?token=bad`);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toMatch(/invalid/);
  });

  it('enforces FRONTEND_ORIGINS allow-list', async () => {
    setEnv({ ...baseEnv, FRONTEND_ORIGINS: 'https://allowed.io' as any });
    server = startHttpServer(0);
    await new Promise((r) => server.on('listening', r));
    const port = getPort();
    const res = await fetch(`http://127.0.0.1:${port}/ws-auth-check?token=secret`, {
      headers: { Origin: 'https://not.io' },
    });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toMatch(/origin/);
  });
});
