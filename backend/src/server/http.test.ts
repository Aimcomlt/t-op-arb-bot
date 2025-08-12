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
