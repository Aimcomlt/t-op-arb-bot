// src/ws/broadcaster.ts

/**
 * Broadcasts token metadata and strategy updates over WebSocket.
 * Useful for live dashboards, debug viewers, or real-time routing UIs.
 */

import { WebSocket, WebSocketServer } from 'ws';
import type { TokenMeta } from '../core/metaConsolidator.js';

const PORT = process.env.WS_PORT ? parseInt(process.env.WS_PORT) : 8081;

let wss: WebSocketServer | null = null;

/**
 * Starts the WebSocket server if not already started
 */
export function startBroadcastServer() {
  if (wss) return; // Avoid duplicate server

  wss = new WebSocketServer({ port: PORT }, () => {
    console.log(`[ws] WebSocket server started on ws://localhost:${PORT}`);
  });

  wss.on('connection', (socket: WebSocket) => {
    console.log('[ws] New client connected');
  });
}

/**
 * Emits a JSON payload to all connected clients
 */
function emit(data: object) {
  if (!wss) return;

  const payload = JSON.stringify(data);

  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  }
}

/**
 * Broadcasts tokenMeta to all connected subscribers
 */
export function broadcastState(tokenMeta: Record<string, TokenMeta>) {
  emit({
    type: 'tokenMeta',
    payload: tokenMeta,
    timestamp: Date.now(),
  });
}
