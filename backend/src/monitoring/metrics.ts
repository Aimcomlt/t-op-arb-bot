import http from 'node:http';
import {
  Counter,
  Gauge,
  Histogram,
  collectDefaultMetrics,
  register,
} from 'prom-client';
import { logger } from '../utils/logger.js';

// Collect default metrics provided by prom-client
collectDefaultMetrics({ register });

// Gauge for active websocket clients
export const wsClientsActiveGauge = new Gauge({
  name: 'ws_clients_active',
  help: 'Number of active WebSocket clients',
});

// Gauge for total pairs tracked
export const pairsTrackedTotal = new Gauge({
  name: 'pairs_tracked_total',
  help: 'Total number of trading pairs being tracked',
});

// Histogram for DEX fetch durations in milliseconds
export const dexFetchMs = new Histogram({
  name: 'dex_fetch_ms',
  help: 'Time spent fetching data from DEX in milliseconds',
  buckets: [50, 100, 200, 400, 800, 1600, 3200],
});

// Counter for broadcast messages total
export const broadcastMsgsTotalCounter = new Counter({
  name: 'broadcast_msgs_total',
  help: 'Total number of messages broadcast to clients',
});

// Counter for errors, labeled by stage
export const errorsTotal = new Counter({
  name: 'errors_total',
  help: 'Total number of errors encountered',
  labelNames: ['stage'],
});

export function startMetricsServer(port: number) {
  const server = http.createServer(async (req, res) => {
    if (req.url === '/metrics') {
      try {
        const metrics = await register.metrics();
        res.writeHead(200, { 'Content-Type': register.contentType });
        res.end(metrics);
      } catch (err) {
        res.writeHead(500);
        res.end('Error collecting metrics');
      }
    } else {
      res.writeHead(404);
      res.end('Not Found');
    }
  });

  server.listen(port, () => {
    logger.info(`Metrics server listening on port ${port}`);
  });

  return server;
}
