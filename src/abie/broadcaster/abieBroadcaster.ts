// src/abie/broadcaster/abieBroadcaster.ts

import WebSocket from 'ws';

/**
 * Creates and manages the ABIE WebSocket server for broadcasting real-time
 * arbitrage events (e.g., syncs, profit opportunities, execution results).
 */
const PORT = 7777;
const wss = new WebSocket.Server({ port: PORT });

console.log(`[ABIE] WebSocket broadcaster initialized on port ${PORT}`);

/**
 * Broadcast a typed message to all connected ABIE listeners (e.g. frontend UI, CLI tools).
 * 
 * @param eventType - A short string representing the type of event (e.g., 'arb_opportunity')
 * @param payload - Any JSON-serializable object representing the event data
 */
export function broadcastABIEEvent(eventType: string, payload: any): void {
  const message = JSON.stringify({ type: eventType, data: payload });

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

/**
 * Optionally, track connections or log activity:
 */
wss.on('connection', (ws) => {
  console.log(`[ABIE] Client connected (${wss.clients.size} total)`);

  ws.on('close', () => {
    console.log(`[ABIE] Client disconnected (${wss.clients.size} remaining)`);
  });
});
