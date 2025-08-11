import http from 'node:http';

import { env } from '../config/env';
import { logger } from '../utils/logger';

const commit = process.env.COMMIT ?? 'unknown';
const builtAt = process.env.BUILT_AT ?? new Date().toISOString();

let latestBlock = 0;
let trackedPairs: unknown[] = [];

export function setLatestBlock(block: number): void {
  latestBlock = block;
}

export function setTrackedPairs(pairs: unknown[]): void {
  trackedPairs = pairs;
}

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/healthz') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', block: latestBlock }));
    return;
  }

  if (req.method === 'GET' && req.url === '/version') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ commit, builtAt }));
    return;
  }

  if (req.method === 'GET' && req.url === '/pairs') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(trackedPairs));
    return;
  }

  res.writeHead(404);
  res.end('Not Found');
});

server.listen(env.HTTP_PORT, '0.0.0.0', () => {
  logger.info(`HTTP server listening on port ${env.HTTP_PORT}`);
});

