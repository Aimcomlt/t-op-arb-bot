import { Counter, Gauge, Histogram } from 'prom-client';

// Histogram tracking latency of quote retrieval in seconds
export const quoteLatencySeconds = new Histogram({
  name: 'quote_latency_seconds',
  help: 'Latency of fetching quotes in seconds',
  buckets: [0.1, 0.5, 1, 2, 5, 10],
});

// Counter for total RPC retries
export const rpcRetriesTotal = new Counter({
  name: 'rpc_retries_total',
  help: 'Total number of RPC retries',
});

// Counter for dropped websocket messages
export const wsDroppedMsgsTotal = new Counter({
  name: 'ws_dropped_msgs_total',
  help: 'Total websocket messages dropped',
});

// Histogram for time between block observed and broadcast to clients
export const blockToBroadcastLagSeconds = new Histogram({
  name: 'block_to_broadcast_lag_seconds',
  help: 'Seconds between new block observation and broadcast',
  buckets: [0.1, 0.5, 1, 2, 5, 10],
});

// Counter for strategy guard failures labeled by reason
export const strategyGuardFailTotal = new Counter({
  name: 'strategy_guard_fail_total',
  help: 'Total number of strategy guard failures',
  labelNames: ['reason'],
});

// Gauge for number of opportunities currently in the heap
export const opportunitiesInHeap = new Gauge({
  name: 'opportunities_in_heap',
  help: 'Current number of opportunities tracked in heap',
});

