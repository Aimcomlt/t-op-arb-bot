// src/abie/broadcaster/abieBroadcaster.ts
import { attachCommandRouter } from '../commands/commandRouter.js';

import { WebSocket, WebSocketServer } from 'ws';

/**
 * Creates and manages the ABIE WebSocket server for broadcasting real-time
 * arbitrage events (e.g., syncs, profit opportunities, execution results).
 */
const PORT = 7777;
const wss = new WebSocketServer({ port: PORT });

console.log(`[ABIE] WebSocket broadcaster initialized on port ${PORT}`);

/**
 * Convert any numeric values in the payload into strings for consistent
 * downstream handling.
 */
function convertNumbersToStrings(value: any): any {
  if (Array.isArray(value)) {
    return value.map(convertNumbersToStrings);
  }
  if (value !== null && typeof value === 'object') {
    return Object.entries(value).reduce<Record<string, any>>((acc, [key, val]) => {
      acc[key] = convertNumbersToStrings(val);
      return acc;
    }, {});
  }
  if (typeof value === 'number') {
    return value.toString();
  }
  return value;
}

/**
 * Broadcast a typed message to all connected ABIE listeners (e.g. frontend UI, CLI tools).
 *
 * @param eventType - A short string representing the type of event (e.g., 'arb_opportunity')
 * @param payload - Any JSON-serializable object representing the event data. Number values
 *   are converted to strings before broadcast.
 */
export function broadcastABIEEvent(eventType: string, payload: any): void {
  const sanitizedPayload = convertNumbersToStrings(payload);
  const message = JSON.stringify({ type: eventType, data: sanitizedPayload });

  wss.clients.forEach((client: WebSocket) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

/**
 * Optionally, track connections or log activity:
 */
wss.on('connection', (ws: WebSocket) => {
  console.log(`[ABIE] Client connected (${wss.clients.size} total)`);

  // Attach command handling to each connection
  attachCommandRouter(ws);

  ws.on('close', () => {
    console.log(`[ABIE] Client disconnected (${wss.clients.size} remaining)`);
  });
});
