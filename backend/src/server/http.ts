import http from 'node:http';
import { env } from '../config/env';
import { logger } from '../utils/logger';

const commit = process.env.COMMIT ?? 'unknown';
const builtAt = process.env.BUILT_AT ?? new Date().toISOString();

let healthProbe: () => { block: number } = () => ({ block: 0 });
let trackedPairs: unknown[] = [];

export function setHealthProbe(fn: () => { block: number }): void {
  healthProbe = fn;
}

export function setTrackedPairs(pairs: unknown[]): void {
  trackedPairs = pairs;
}

export function startHttpServer(port = env.HTTP_PORT) {
  const server = http.createServer((req, res) => {
    if (req.method === 'GET' && req.url === '/healthz') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', ...healthProbe() }));
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

  server.listen(port, '0.0.0.0', () => {
    logger.info(`HTTP server listening on port ${port}`);
  });

  return server;
}
